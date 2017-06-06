var express = require('express'),
    session = require('express-session'),
    bodyParser = require('body-parser'),
    multer = require('multer'),
    cookie = require('cookie'),
    cookieParser = require('cookie-parser'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    Influx = require('influx'),
    mongodb = require('mongodb'),
    MongoClient = mongodb.MongoClient,
    ObjectID = mongodb.ObjectID,
    RedisStore = require('connect-redis')(session),
    sessionStore = new RedisStore({ host: 'localhost', port: 6379 }),
    app = express(),
    upload = multer(),
    ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
    InfluxDB = Influx.InfluxDB

// database configuration
const host = 'localhost';
const database = 'topview';
const { FLOAT, STRING, INTEGER } = Influx.FieldType;
const schema = [
  {
    measurement: 'temperatures',
    fields: {
      value: FLOAT,
      setpoint: FLOAT
    },
    tags: ['device']
  },
  {
    measurement: 'setpoints',
    fields: {
      value: FLOAT,
      session: STRING
    },
    tags: ['device']
  }
];

function dt(v) {
  return Math.sign(v)*(Math.random()-0.5)*Math.pow(Math.E, -Math.pow(v, 2)) + v/2;
}

var mongo, influx;
(async function init() {
  // mongo setup
  mongo = await MongoClient.connect(`mongodb://${ host }:27017/${ database }`);
  // create collections
  await mongo.dropDatabase();
  let usersCollection = await mongo.createCollection('users', {
    validator: {
      '$and': [
        { username: { '$type': 'string' }},
        { password: { '$type': 'string' }}
      ]
    }
  });
  await usersCollection.ensureIndex('username', { name: 'username', unique: true });

  let groupsCollection = await mongo.createCollection('groups');
  await groupsCollection.ensureIndex('name', { name: 'name', unique: true });

  let applicationsCollection = await mongo.createCollection('applications');
  let componentsCollection = await mongo.createCollection('components');
  let pointsCollection = await mongo.createCollection('points');

  // influx setup, init
  influx = new InfluxDB({ host, database, schema });
  let names = await influx.getDatabaseNames();
  if (names.includes(database)) {
    await influx.dropDatabase(database);
  }
  await influx.createDatabase(database);

  let init = { temperature: 0.0, setpoint: 10.0 };
  await influx.writePoints([
    {
      measurement: 'setpoints',
      tags: { device: '001' },
      fields: { value: init.setpoint, session: '123' }
    }
  ]);

  // thermostat loop
  (async function(sleepTime) {
    let successful = true;
    while (successful) {
      let [temps, setpoints] = await Promise.all([
        influx.query(`SELECT last(value) FROM temperatures GROUP BY device`),
        influx.query(`SELECT last(value) FROM setpoints GROUP BY device`)
      ]);
      let arr = setpoints
        .map(sp => [sp, temps.find(t => t.device != null && t.device == sp.device)])
        .filter(([a, b]) => a != null)
        .map(([a, b]) => [a.device, a.last, b ? b.last : 0])
      let values = arr.map(([device, sp, t]) => ({
        measurement: 'temperatures',
        tags: { device },
        fields: { value: t + dt(sp-t), setpoint: sp }
      }));

      try {
        await influx.writePoints(values);
        await new Promise((r) => setTimeout(r, sleepTime));
      } catch (e) {
        successful = false;
      }
    }
    console.log('thermostat loop failed');
  })(2000);
})();

const secret = 'toastToastTOAST';
app.set('trust proxy', true);
app.use(session({
  secret,
  resave: false,
  saveUninitialized: true,
  proxy: true,
  store: sessionStore,
  cookie: { secure: false },
}));

// parse request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

// passport setup
passport.use(new LocalStrategy(async function(username, password, done) {
  let users = mongo.collection('users');
  let user;
  try {
    user = await users.findOne({ username });
  } catch (err) {
    return done(err);
  }
  if (!user) {
    done(null, false, { message: 'no user with that username' });

  } else if (user.password != password) {
    done(null, false, { message: 'incorrect password' });

  } else {
    done(null, user);

  }
}));

passport.serializeUser(function(user, done) {
  done(null, user.username);
});
 
passport.deserializeUser(function(username, done) {
  let users = mongo.collection('users');
  users.findOne({ username }, { password: false, _id: false }, done);
});

// routes
app.get('/', function(req, res, next) {
  res.json({ user: req.user, session: req.session, loggedIn: !!req.user });
});

app.route('/login')
.post(passport.authenticate('local'), function(req, res, next) {
  res.send();
})

app.route('/register')
.get(function(req, res, next) {
  if (req.user) {
    res.send();
  } else {
    res.send('registration page');
  }
})
.post(upload.array(), async function(req, res, next) {
  let body = req.body;
  let users = mongo.collection('users');
  let user;
  users.insertOne(body, function(err, result) {
    if (err) {
      err.status = 400;
      return next(err);
    }
    passport.authenticate('local')(req, res, function() {
      res.send();
    });
  });
});
app.delete('/unregister', async function(req, res, next) {
  if (req.user) {
    let users = mongo.collection('users');
    let result;
    try {
      result = await users.findOneAndDelete({ username: req.user.username })
    } catch (err) {
      return next(err);
    }
    if (result.ok) {
      req.logout();
      req.session.destroy((err) => {
        if (err) return next(err);
        res.send();
      });
    } else {
      next(new Error('failed to unregister'));
    }
  } else {
    next(new Error('must be logged in'));
  }
});

app.all('/logout', function(req, res, next) {
  req.logout();
  res.send();
});

// user template, points management
var userRoute = express.Router();

userRoute.use(ensureLoggedIn('/login'))
userRoute.get('/', function(req, res, next) {
  res.json({ user: req.user });
});
userRoute.route('/template')
.get(function(req, res, next) {
  res.json(req.session.template || {});
})
.post(upload.array(), async function(req, res, next) {
  console.log('body', req.body)
  req.session.template = req.body;
  await req.session.save()
  res.send();
});
userRoute.route('/defaultTemplate')
.get(async function(req, res, next) {
  // get applications based on user attributes (groups, role)
  // application defines component structure
  // groups, user define applications
  let users = mongo.collection('users');
  let user = await users.findOne({ username: req.user.username });

  if (user.groups && user.groups.length) {
  }
  // user
  //   groups
  //   applications (in addition to those defined by groups)
  //   name
  //   username
  //   password
  // application
  //   id
  //   name
  // component
  //   type
  //   application
  //   attributes
  res.json(user);
})
.post(function(req, res, next) {})

app.use('/user', userRoute);

app.route('/:name/:id?')
.all(async function(req, res, next) {
  let collections = (await mongo.collections()).map(c => c.collectionName);
  let { name } = req.params;
  next(!collections.includes(name) ? 'route' : undefined);
})
.get(async function(req, res, next) {
  let collection = mongo.collection(req.params.name);
  let { id } = req.params;
  try {
    if (id != null) {
      let doc = await collection.findOne({ _id: ObjectID.createFromHexString(id) });
      res.json(doc);

    } else {
      let docs = await collection.find({}).toArray();
      res.json(docs);
    }
  } catch (err) {
    next(err);
  }
})
.post(upload.array(), async function(req, res, next) {
  let collection = mongo.collection(req.params.name);
  let body = req.body;
  let result = await mongo.collection(req.params.name).insert(body)
  res.json(result.insertedIds);
})
.put(upload.array(), async function(req, res, next) {
  let collection = mongo.collection(req.params.name);
  let { id } = req.params;
  if (id == null) {
    return next(new Error('must specify id'));
  }
  let body = req.body;
  let result = await collection.findOneAndUpdate({ _id: ObjectID.createFromHexString(id) }, { '$set' : body }, { upsert: false });
  res.json(result);
})
.delete(async function(req, res, next) {
  let collection = mongo.collection(req.params.name);
  let { id } = req.params;
  if (id != null) {
    let result = await collection.findOneAndDelete({ _id: id });
    res.json(result);
  } else {
    let result = await collection.remove();
    res.json(result);
  }
});

app.route('/users/:userId/applications/:appId')
.get(function(req, res, next) {
  // here
  next()
})
.post(function(req, res, next) {
  next()
});

// points management

// catch-all error handler
app.use(function(err, req, res, next) {
  //res.status(400)
  res.status(err.status || 500).json({ message: err.message, stack: err.stack });
});

var server = app.listen(3000);
