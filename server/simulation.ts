import * as path from 'path';
import { statSync, readFile } from 'fs';
import { duplicateFloors, duplicateBuildings } from './duplicates';
import { importFromGeo } from './import';

interface Settings {
  recalcInterval: number;
  initTemp: number;
  initTempSpread: number;
  precision: number;
  buildings: number;
  floors: number;
}

const defaultSettings: Settings = {
  recalcInterval: 2000,
  initTemp: 70.0,
  initTempSpread: 4.0,
  precision: 2,
  buildings: 2,
  floors: 2
};

const collections = [
  {
    name: 'users',
    config: {
      validator: {
        '$and': [
          { username: { '$type': 'string' }},
          { password: { '$type': 'string' }} ]
      }
    },
    indicies: [
      { name: 'username', config: { name: 'username', unique: true }}
    ]
  },
  {
    name: 'groups',
    config: null,
    indicies: [
      { name: 'name', config: { name: 'name', unique: true }}
    ]
  },
  {
    name: 'applications',
    config: null,
    indicies: []
  },
  {
    name: 'values',
    config: null,
    indicies: []
  }
];

// values
// {
//   point: <id>,
//   room: <id>,
//   building: <id>,
//   measurement: <string>,
//   time: <number>, // milliseconds since 1 jan 1970
//   value: <number>
// }


module.exports = async function({ mongo }, dataDir, settings: Partial<Settings>={}) {
  if (typeof dataDir !== 'string' || !fs.statSync(dataDir).isDirectory()) {
    throw new Error('invalid data dir');
  }
  settings = {...defaultSettings, ...settings };
  await mongo.dropDatabase();
  // create collections
  for (let { name, config, indicies } of collections) {
    await mongo.createCollection(name, config);

    for (let index of indicies) {
      await mongo.collection(name).createIndex(index.name, index.config);
    }
  }

  for (let name of ['users', 'groups', 'applications']) {
    let data = await readDataFile(dataDir, `${ name }.json`);
    await mongo.collection(name).insertMany(data[name]);
  }

  // import points, features (areas)
  await importFromGeo(mongo, path.join(dataDir, 'geo'));
  await duplicateFloors(mongo, settings.floors);
  await duplicateBuildings(mongo, settings.buildings);

  let points = await mongo.collection('points')
    .find({}, { room: 1, building: 1, value: 1, type: 1 })
    .toArray();

  // initial point values
  let values = points.map(({ _id: point, building, room, value: measurement, type }) => ({
    point,
    building,
    room,
    time: Date.now(),
    measurement,
    value: measurement == 'temperature' ? generateInitTemp(settings) : settings.initTemp,
  })); 

  await mongo.collection('values').insertMany(values);

  // import points, features (areas)
  // thermostat loop
  let timeout, done;
  (async function loop(sleepTime) {
    let successful = true;

    while (successful && !done) {
      try {
        // get last point values for each room;
        let roomPoints = await mongo.collection('values').aggregate([
          { $sort: { time: 1 }},
          { $group: { _id: { m: '$measurement', r: '$room', p: '$point' }, vals: { $last: '$$ROOT' }}},
          { $unwind: '$vals' },
          { $replaceRoot: { newRoot: '$vals' }},
          { $group: { _id: '$room', points: { $push: '$$ROOT' }}}
        ], { allowDiskUse: true }).toArray();

        let updates = [];
        for (let { _id, points } of roomPoints) {
          let sp = points.find(p => p.measurement == 'set_point');
          for (let temp of points.filter(p => p.measurement == 'temperature')) {
            delete temp._id;
            let value = calcNewTemp(temp.value, sp.value, settings.precision);
            if (Math.abs(value-temp.value) > 0) {
              updates.push(Object.assign(temp, { time: Date.now(), value }));
            }
          }
        }

        //console.log(updates.length);
        if (updates.length > 0) {
          await mongo.collection('values').insertMany(updates);
        }

        //console.log((await mongo.collection('values').aggregate([
        //  { $match: { measurement: 'temperature' }},
        //  { $sort: { time: 1 }},
        //  { $group: { _id: '$point', time: { $last: '$time' }, value: { $last: '$value' } } },
        //  //{ $group: { _id: null, value: { $avg: '$value' } } }
        //]).toArray()).map(d => d.value.toFixed(4)).slice(0, 10).join(', '));

        await new Promise((r) => timeout = setTimeout(r, sleepTime));

      } catch (e) {
        successful = false;
        console.log('thermostat loop failed');
        console.error(e)
      }
    }
  })(settings.recalcInterval);

  return function() {
    done = true;
    clearTimeout(timeout);
    console.log(`canceling simulation...`);
  }
}

function readDataFile(dataDir, name) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(dataDir, name), (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
}

function generateInitTemp(settings) {
  let { initTemp, initTempSpread, precision } = settings;
  let t = initTemp + (Math.random() - 0.5)*initTempSpread;
  return Math.floor(t*precision)/precision;
}

function calcNewTemp(t, sp, p) {
  let v = sp - t;
  return Math.floor((t + v/10)*p)/p;
}
