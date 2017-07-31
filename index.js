var path = require('path');

function dashToCamel(str) {
  return str.replace(/\-([a-z])/g, function(m,a) {
    return a.toUpperCase();
  });
}

var TYPE_SINGLETON = 'singleton';
var TYPE_TRANSIENT = 'transient';
// var TYPE_INTERFACE = 'interface';


function ServiceMeta(type, ctor) {
  if (typeof ctor !== 'function') throw new Error('ctor must be a function');

  this.type = type;
  this.ctor = ctor;
  this.instance = null;
  this.building = false;
}

function Container(_require) {
  this._require = _require;
  this._services = {};
}

Container.prototype._createInstance = function (service, proxy) {
  if (service.building) throw new Error('circular dep!');
  service.building = true;

  var instance = service.ctor(proxy);

  service.building = false;

  return instance;
};

Container.prototype._getService = function (name, proxy) {
  if (name === 'ioc') return this;
  if (!this._services[name]) throw new Error('service ' + name +' not defined');

  var service = this._services[name];

  if (service.type === TYPE_SINGLETON && service.instance) {
    return service.instance;
  }

  var instance = this._createInstance(service, proxy);

  if (service.type === TYPE_SINGLETON) {
    service.instance = instance;
  }

  return instance;
};

Container.prototype.register = function (name, type, ctor) {
  if (this._hasRun)  throw new Error('Can\'t register ' + name + 'container has already run');

  if (!ctor) {
    ctor = this._require(name);
    name = dashToCamel(path.basename(name));
  }

  this._services[name] = new ServiceMeta(type, ctor);
  return this;
};

Container.prototype.singleton = function (name, ctor) {
  return this.register(name, TYPE_SINGLETON, ctor);
};

Container.prototype.transient = function (name, ctor) {
  return this.register(name, TYPE_TRANSIENT, ctor);
};

Container.prototype.interface = function (name, ctor) {
  // doesn't do anything yet;
  return this;
};

Container.prototype.use = function (container) {
  var self = this;

  if (typeof container === 'string') {
    return this.use(this._require(container));
  }

  if (container instanceof Container) {
    Object.keys(container._services).forEach(function (key) {
      var service = container._services[key];
      self.register(key, service.type, service.ctor);
    });
  } else {
    if (!name) throw new Error('must use container');
  }

  return this;
};

Container.prototype.run = function (func, locals) {
  if (typeof func !== 'function') throw new Error('first arg must be a function');

  this._hasRun = true;

  var proxy = new Proxy(locals || {}, {
      get: (target, name) =>
        name in target ?
            target[name] :
            this._getService(name.replace(/^_/, ''), proxy)
  });

  return func(proxy);
};

Container.prototype.clone = function () {
  var newContainer = new Container();

  newContainer.use(this);

  return newContainer;
};

exports.create = function (_require) {
  return new Container(_require);
};
