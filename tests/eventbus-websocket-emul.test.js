const EventBus = require("../src/EventBus");
const {describe, it} = require("node:test");
const assert = require("node:assert");
const {sleep} = require("../src/EventBus/utils");
const EventEmitter = require("../src/EventBus/EventEmitter");
require('dotenv').config();
const req = {
    headers: {
        ip: '127.0.0.1'
    },
    params: {},
    body: {},
};
const reply = {
    _code: 200,
    _object: {},
    code: function (number) {
        reply._code = number;
        return reply;
    },
    send: function (object) {
        reply._object = object;
        console.log('REPLY:', reply._code, object || '');
    }
};
(async () => {
    let wsSentCount = 0;
    let wsSendCound = 0;
    let internalCatchCound = 0;
    const channelName = 'ToWebSocketChannelName'
    EventBus.setSendbox(true)
    await EventBus.transport.initialize({
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD,
        keepAlive: true,
        port: process.env.REDIS_PORT * 1
    }).filterByProcessName(false).handshakes()
    const connection = {
        socket: new EventEmitter(), setEncoding: (v) => {
            console.log('ws setEncoding', v)
        }
    };
    Object.defineProperties(connection.socket, {
        pong: {
            value: (v) => {
                console.log('ws pong NOT send - override', v)
            },
            writable: true
        },
        send: {
            value: (v) => {
                console.log(++wsSentCount, 'ws test send', v)
            }
        },
    });
    const routes = [];
    EventBus.websocket.registerDuplexEvents(channelName);
    const route = {
        method: 'GET',
        url: '/api/websocket/endpoint',
        preHandler: function auth(req, reply, done) {
            console.log('ws YOUR Auth Handler method')
        }, // YOUR Auth Handler method - generate session object with session _id!!!
        handler: (req, reply) => {
            reply.code(200).send("Hello"); // or something else for GET response...
        },
        wsHandler: (connection, req) => EventBus.websocket.wsHandler(connection, req)
    };
    routes.push(route);
    route.preHandler(req, reply, () => {
    });
    route.handler(req, reply);
    route.wsHandler(connection, req);

    ++wsSendCound && connection.socket.emit('message', JSON.stringify({type: "ping", data: '🇺🇦'}));
    ++wsSendCound && EventBus.send(channelName, {type: "some", data: '🇺🇦'});
    EventBus.on(channelName + '--2', (m) => {
        internalCatchCound++ // only one
        console.log(channelName + '--2', 'switched message --->', m, '<--- switched message')
    })
    EventBus.websocket.messagesHandler = (message, session, connection) => {
        ++wsSentCount && internalCatchCound++ // both
        // switched message
        EventBus.send(channelName + '--2', message)
    }
    const _o = JSON.stringify({
        type: "some",
        data: '🇺🇦 switch message via messagesHandler to other eventbus channel ' + channelName + '2'
    });
    ++wsSendCound && connection.socket.emit('message', _o);
    ++wsSendCound && EventBus.send(channelName, _o);
    ++wsSendCound && EventBus.websocket.send({some: 'text', type: 'reply'})

    describe('EventBus', () => {
        it('internal->ws->transport+ws events count', () => assert.equal(wsSentCount, wsSendCound))
        it('ws to other local events count', () => assert.equal(internalCatchCound % 2, 0))
    })

    await sleep(2000); // waiting for transport
    EventBus.transport.disconnect()


})()

