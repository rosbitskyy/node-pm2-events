const assert = require('assert');
const EventBus = require('../src/EventBus');
const {sleep} = require("../src/EventBus/utils");
const sinon = require("sinon");
const transport = EventBus.transport;

describe('Transport', function () {

    describe('#initialize', function () {
        it('should create Redis clients', function () {
            const options = {
                host: 'localhost',
                port: 6379
            };
            transport.initialize(options);
            assert.equal(typeof transport.publisher, 'object');
            assert.equal(typeof transport.subscriber, 'object');
        });
    });

    describe('#handshakes', function () {
        it('should register SIGINT handler', function () {
            process.on('SIGINT', function () {
            });
            transport.handshakes();
            assert.equal(typeof process.listeners('SIGINT')[0], 'function');
        });

        it('should subscribe to HANDSHAKE channel', function () {
            transport.handshakes();
            assert.equal(typeof transport.subscriber, 'object');
        });
    });

    describe('#on', function () {
        it('should register message listener', function () {
            const cb = function () {
            };
            transport.on('test', cb);
            assert.equal(transport.subscriber.listenerCount(transport.constant.message), 1);
        });

        it('should filter messages by exclusion methods', function () {
            transport.on('test', {});
            transport.isSameId = function () {
                return false;
            };
            transport.isSameProcessName = function () {
                return false;
            };
            transport.addIgnoredIPAddress('127.0.0.1');
            transport.subscriber.emit(transport.constant.message, 'test', {
                channel: 'test',
                id: '1',
                data: {},
                sender: {
                    id: '2',
                    process_name: 'test',
                    address: '127.0.0.1'
                }
            });
            assert.equal(transport.subscriber.offlineQueue._list.length > 0, true);
        });
    });

});