import {Component, primaryIdentifier, attribute, method, expose} from '@layr/component';
import {ComponentServer} from '@layr/component-server';

class Counter extends Component {
  // We need a primary identifier so a Counter instance
  // can be transported between the frontend and the backend
  // while keeping it's identity
  @expose({get: true, set: true}) @primaryIdentifier() id;

  // The counter's value is exposed to the frontend
  @expose({get: true, set: true}) @attribute('number') value = 0;

  // And the "business logic" is exposed as well
  @expose({call: true}) @method() increment() {
    this.value++;
  }
}

// We serve the Counter through a ComponentServer
export const server = new ComponentServer(Counter);
