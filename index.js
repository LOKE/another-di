const path = require('path');
const { Counter } = require('prom-client');

const TYPE_SINGLETON = 'singleton';
const TYPE_TRANSIENT = 'transient';
// const TYPE_INTERFACE = 'interface';


function ServiceMeta(type, ctor) {
  if (typeof ctor !== 'function') throw new Error('ctor must be a function');

  this.type = type;
  this.ctor = ctor;
  this.instance = null;
  this.building = false;
}

const serviceCount = new Counter({
  name: 'another_di_services_total',
  help: 'Total number of services constructed',
  labelNames: ['service'],
  registers: []
});

class Container {
  constructor() {
    this._services = {};
  }

  register(name, type, ctor) {
    if (this._hasRun)  throw new Error('Can\'t register ' + name + 'container has already run');

    if (!ctor) {
      throw new Error('require wrapping is no longer supported, must include constructor');
    }

    this._services[name] = new ServiceMeta(type, ctor);
    serviceCount.inc({ service: name }, 0);

    return this;
  }

  singleton(name, ctor) {
    return this.register(name, TYPE_SINGLETON, ctor);
  }

  transient(name, ctor) {
    return this.register(name, TYPE_TRANSIENT, ctor);
  }

  interface(name, ctor) {
    // doesn't do anything yet;
    return this;
  }

  use(container) {
    if (typeof container === 'string') {
      throw new Error('require wrapping is no longer supported');
    }
    if (!container instanceof Container) {
      throw new Error('must use container');
    }

    Object.keys(container._services).forEach(key => {
      const service = container._services[key];
      this.register(key, service.type, service.ctor);
    });


    return this;
  }

  run(func, locals = {}) {
    if (typeof func !== 'function') throw new Error('first arg must be a function');

    this._hasRun = true;

    const proxy = new Proxy(locals, {
        get: (target, name) =>
          name in target ?
              target[name] :
              this._getService(name.replace(/^_/, ''), proxy)
    });

    return func(proxy);
  }

  clone() {
    const newContainer = new Container();

    newContainer.use(this);

    return newContainer;
  }

  _createInstance(service, proxy) {
    if (service.building) throw new Error('circular dep!');
    service.building = true;

    const instance = service.ctor(proxy);

    service.building = false;

    return instance;
  }

  _getService(name, proxy) {
    if (name === 'ioc') return this;
    if (!this._services[name]) throw new Error('service ' + name +' not defined');

    const service = this._services[name];

    if (service.type === TYPE_SINGLETON && service.instance) {
      return service.instance;
    }

    const instance = this._createInstance(service, proxy);
    serviceCount.inc({ service: name });

    if (service.type === TYPE_SINGLETON) {
      service.instance = instance;
    }

    return instance;
  }
}

exports.create = function () {
  return new Container();
};

exports.registerMetrics = registry => {
  registry.registerMetric(serviceCount);
};
