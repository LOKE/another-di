var di = require('..');
var assert = require('assert');

var ioc = di.create();

ioc.singleton('a', function (b, c) {
  return 'A';
});

ioc.singleton('b', function (d, c) {
  return 'B';
});

ioc.singleton('c', function (d) {
  return 'C';
});

ioc.transient('d', function () {
  return 'D';
});

var copy = ioc.clone();

copy.run(function (a, b, c, d) {
  assert.equal(a, 'A');
  assert.equal(b, 'B');
  assert.equal(c, 'C');
  assert.equal(d, 'D');
});

// circular should throw

var circular = di.create();

circular.singleton('a', function (b) {});
circular.singleton('b', function (a) {});

assert.throws(function () {
  circular.run(function (a) {});
});

// should fail to register dep after run

var doublerun = di.create();

doublerun.singleton('a', function () {});
doublerun.run(function (a) {})

assert.throws(function () {
  doublerun.singleton('b', function () {});
});
