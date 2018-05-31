# another-di

This is another dependency injector, because there aren't enough.

## Usage

```js
// lib/hello-message.js

module.exports = function () {
  return 'hello world!';
}

// lib/boomer.js

module.exports = function ({helloMessage}) {
  return {
    boom: function () {
      console.log(helloMessage);
    }
  }
}

// lib/index.js

var di = require('another-di');

module.exports = di.create()
.singleton('helloMessage', require('./hello-message')) // dashes converted to camelcase
.singleton('boomer', require('./boomer'))

// main.js

var lib = require('./lib');

lib.run(function ({boomer}) {
  boomer.boom(); // logs out 'hello world'
});


// test.js

var lib = require('./lib');
var boomer;

beforeEach(function () {
  testContainer = lib.clone();
  testContainer.singleton('helloMessage', function () {
    return 'hello from test land';
  });

  testContainer.run(function ({_boomer}) { // underscore is striped before dependency lookup
    boomer = _boomer;
  })
})

it('should boom!', () => {
  boomer.boom(); // logs 'hello from test land'
});

```
