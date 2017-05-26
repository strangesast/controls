import { ViewChild, Component } from '@angular/core';
import { JsonInputComponent } from './json-input/json-input.component';

const INIT = {
  components: {
    root: {
      type: 'tabGroup',
      attributes: [
        {
          name: 'backgroundColor',
          type: 'string',
          value: '#eee'
        },
        { name: 'children', type: 'array', value: [ 'group0', 'group1' ]}
      ]
    },
    group0: {
      type: 'group',
      attributes: [
        { name: 'name', type: 'string', value: 'Group 1' },
        { name: 'children', type: 'array', value: [ 'numericInput0' ]}
      ]
    },
    group1: {
      type: 'group',
      attributes: [
        { name: 'name', type: 'string', value: 'Group 2' }
      ]
    },
    numericInput0: {
      type: 'numericInput',
      attributes: [
        { name: 'label', type: 'string', value: 'Temperature in Room B' },
        { name: 'value', type: 'number', value: 0, id: 'temperature' },
        { name: 'color', type: 'string', value: 'purple' },
        { name: 'backgroundColor', type: 'string', value: 'white', write: true }
      ]
    }
  },
  values: {
    temperature: {
      type: 'number',
      name: 'Temperature Monitor 1'
    }
  }
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public json = INIT;
}
