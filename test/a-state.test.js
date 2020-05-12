const { assert } = require('chai');
const AState = require('../index');

describe('a-state', function () {

    const stateDefinition = {
        test: AState.types.string
    };

    describe('type handling', function () {

        it('returns a list of all supported types when using typeNames', function () {
            const expectedList = ['any', 'array', 'bigint', 'boolean', 'number', 'object', 'string', 'symbol'].join(',');
            const actualList = AState.types.typeNames.join(',');

            assert.equal(actualList, expectedList);
        });

        it('returns a type verification function when using a valid type name', function () {
            const numberVerifier = AState.types.number;

            assert.isTrue(numberVerifier(5));
            assert.equal(numberVerifier.type, 'number');
        });

        it('throws an error when a type is not defined', function () {
            const badTypeGetter = () => AState.types.badType;

            assert.throws(badTypeGetter);
        });
    });

    describe('sync endpoints', function () {
        it('stores and retrieves state synchronously', function () {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer;

            const expectedValue = 'this is a test value';

            stateContainer.writeSync(keys.test, expectedValue);

            const storedValue = stateContainer.read(keys.test);

            assert.equal(storedValue, expectedValue);
        });


        it('fails when key to read does not match expected keys', function () {
            const stateContainer = AState.new(stateDefinition);

            const failingBehavior = () => stateContainer.store.read('badKey');

            assert.throws(failingBehavior);
        });

        it('fails when key to write does not match expected keys', function () {
            const stateContainer = AState.new(stateDefinition);

            const failingBehavior = () => stateContainer.store.write('badKey', 'data');

            assert.throws(failingBehavior);
        });

        it('fails when keyed does not match expected type', function () {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer

            const failingBehavior = () => stateContainer.store.write(keys.test, []);

            assert.throws(failingBehavior);
        });
    });

    describe('async endpoints', function () {
        it('writes data asynchronously with a callback response handler', function (done) {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer
            const expectedValue = 'another test value';

            stateContainer.write(keys.test, expectedValue, verification);

            function verification() {
                const storedValue = stateContainer.read(keys.test);

                assert.equal(storedValue, expectedValue);
                done();
            }
        });

        it('writes data asynchronously and returns a promise', function () {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer

            const expectedValue = 'another test value';

            return stateContainer
                .write(keys.test, expectedValue)
                .then(function () {
                    const storedValue = stateContainer.read(keys.test);

                    assert.equal(storedValue, expectedValue);
                });
        });
    });

    describe('decoration', function () {
        it('calls the decorated function correctly', function () {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer;

            const expectedValue = 'decoration test value';
            const junkValue = 'junk value';

            const decoratedMethod = stateContainer.decorate(verify, { key: keys.test, argumentIndex: 1 });

            decoratedMethod(junkValue, expectedValue);

            function verify(value1, value2) {
                assert.equal(value1, junkValue);
                assert.equal(value2, expectedValue);
            }
        });

        it('decorates a function', function () {
            const stateContainer = AState.new(stateDefinition);
            const { keys } = stateContainer;

            const expectedValue = 'decoration test value';
            const junkValue = 'junk value';

            const decoratedMethod = stateContainer.decorate(verify, { key: keys.test, argumentIndex: 1 });

            decoratedMethod(junkValue, expectedValue);

            function verify() {
                const storedValue = stateContainer.read(keys.test);

                assert.equal(storedValue, expectedValue);
            }
        });
    });

});