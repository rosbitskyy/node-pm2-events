import {expectType} from 'tsd';
import EventBus = require("./index");
import Transport = require("./src/EventBus/Transport");
import Process = require("./src/EventBus/Process");
import WebSocket = require("./src/EventBus/WebSocket");


(async () => {
    const Config = {
        redis: {
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD,
            keepAlive: true,
            port: process.env.REDIS_PORT
        },
    }
    await EventBus.transport.initialize(Config.redis)
        .filterByProcessName(false)
        .handshakes()
    expectType<Transport>(EventBus.transport)
    expectType<boolean>(EventBus.transport.isReady)
    expectType<boolean>(EventBus.transport.isMain)
    expectType<boolean>(EventBus.transport.isPrimary)
    expectType<boolean>(EventBus.transport.isSameProcessName('-'))
    expectType<typeof Process>(EventBus.process)
    expectType<number>(EventBus.process.process_id)
    expectType<WebSocket>(EventBus.websocket)
})();

