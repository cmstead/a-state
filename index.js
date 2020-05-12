(function (moduleFactory) {
    if (typeof module !== 'undefined' &&
        typeof module.exports !== 'undefined') {
        module.exports = moduleFactory();
    } else {
        window.aState = moduleFactory();
    }
})(function () {

    function DataInterface(baseSchema) {
        this.baseSchema = baseSchema;
    }

    DataInterface.prototype = {
        throwOnBadKey: function (key) {
            if (typeof this.baseSchema[key] === 'undefined') {
                throw new Error(`Unable to resolve key '${key}' in data store.`);
            }
        },

        throwOnBadType: function (key, value) {
            if (!this.baseSchema[key](value)) {
                throw new Error(`Expected ${key} to receive a value of type '${this.baseSchema[key].type}', but got '${typeof value}'`)
            }
        },

        getKeys: function () {
            return Object.keys(this.baseSchema);
        }
    };

    function Store(dataInterface) {
        const store = {};

        this.read = this.read.bind(this, { store, dataInterface });
        this.write = this.write.bind(this, { store, dataInterface });
        this.getKeys = this.getKeys.bind(this, dataInterface);
    }

    Store.prototype = {
        getKeys: function (dataInterface) {
            return dataInterface.getKeys();
        },

        read: function ({ store, dataInterface }, key) {
            dataInterface.throwOnBadKey(key);

            return typeof store[key] !== 'undefined'
                ? store[key]
                : null;
        },

        write: function ({ store, dataInterface }, key, value) {
            dataInterface.throwOnBadKey(key);
            dataInterface.throwOnBadType(key, value);

            store[key] = value;
        }
    };

    function AState(store) {
        this.keys = store.getKeys().reduce((result, key) => ({
            ...result,
            [key]: key
        }), {});

        this.decorate = this.decorate.bind(this, store);
        this.read = this.read.bind(this, store);
        this.writeSync = this.writeSync.bind(this, store);
    }

    AState.prototype = {
        decorate: function (store, functionToDecorate, { key, argumentIndex = 0 }) {
            return (...args) => {
                store.write(key, args[argumentIndex]);

                return functionToDecorate.call(null, ...args);
            };
        },
        read: function (store, key) {
            return store.read(key);
        },
        write: function (key, value, callback) {
            const resolver = typeof callback === 'function'
                ? callback
                : () => Promise.resolve();

            this.writeSync(key, value);

            return resolver();
        },
        writeSync: function (store, key, value) {
            store.write(key, value);
        }
    };

    function buildTypeDefinitionSet() {
        const typeNames = ['array', 'bigint', 'boolean', 'number', 'object', 'string', 'symbol'];
        const initialTypeSet = {
            any: () => true,
            array: (value) => Array.isArray(value)
        };

        initialTypeSet.array.type = 'array';

        typeNames.forEach((typeName) => {
            initialTypeSet[typeName] = (value) => typeof value === typeName;
            initialTypeSet[typeName].type = typeName
        });

        return initialTypeSet;
    }

    const typeHandler = {
        getAllTypes: function (typeSet) {
            return Object.keys(typeSet);
        },

        getType: function (typeSet, key) {
            if (typeof typeSet[key] === 'undefined') {
                throw new Error(`A-State does not support type ${key}`);
            }

            return typeSet[key];
        },

        get: function (typeSet, key) {
            return key === 'typeNames'
                ? this.getAllTypes(typeSet)
                : this.getType(typeSet, key);
        }
    }

    return {
        new: function (baseSchema) {
            const dataInterface = new DataInterface(baseSchema);
            const store = new Store(dataInterface);

            return new AState(store);
        },
        types: new Proxy(buildTypeDefinitionSet(), typeHandler)
    }

});