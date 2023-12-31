const assert = require('assert');
const EventBus = require('../src/EventBus');


describe('EventBus', function () {
    describe('#send', function () {
        it('should emit the given channel and message', function () {
            const eventBus = EventBus;
            const channel = 'test';
            const message = {foo: 'bar'};
            let receivedMessage;
            eventBus.on(channel, (m) => {
                receivedMessage = m;
            });
            eventBus.send(channel, message);
            assert.deepStrictEqual(receivedMessage, message);
        });
    });
});