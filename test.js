/*
 *  Copyright (c) 2023.
 *  @Author: 🇺🇦Rosbitskyy Ruslan
 *  @email: rosbitskyy@gmail.com
 */

// const EventBus = require('node-pm2-events');
const EventBus = require('./index');

const Config = {
    redis: {
        host: 'localhost',
        password: "your password",
        keepAlive: true,
        port: 6379
    },
    isDev: true
}

Number.prototype.sleep = function () {
    return new Promise(resolve => setTimeout(resolve, this));
}

async function doit() {

    // internal events
    EventBus.on('target', (m) => {
        console.log('\tinternal:', m)
    })
    EventBus.send('target', {a: 'qwerty'}) // work
    EventBus.send('target2', {a: 'qwerty'}) // not work - not subscribed

    // with distributed events (example: pm2 instances, single decentralized servers)
    EventBus.transport.initialize({...Config.redis, debug: true});
    const channelName = 'AweSome Channel Or Event Name';
    EventBus.transport.on(channelName, (message) => {
        console.log('\tcb :', message)
    })
    EventBus.transport.on(channelName, (message) => {
        console.log('\tcb :', message)
    })
    EventBus.transport.send(channelName, {action: 'some action'});

    // // with fastify and websockets
    // const fastify = require('fastify')({logger: {level: 'info'}, trustProxy: true,});
    // fastify.after(async () => {
    //     const EventBus = require('node-pm2-events');
    //     await EventBus.transport.initialize({...Config.redis, debug: Config.isDev}).waitingConnection();
    //     router.register(fastify); // register your routes - [https://fastify.dev/docs/latest/Reference/Routes]
    // });
    //
    // const routes = [];

    // // From internal to self sockets and emit to other servers, and his sockets
    // // From external to self sockets
    // EventBus.websocket.registerDuplexEvents(channelName);
    // routes.push({
    //     method: 'GET',
    //     url: '/api/websocket/endpoint',
    //     preHandler: auth, // YOUR Auth Handler method - generate session object with session _id!!!
    //     handler: (req, reply) => {
    //         reply.code(404).send();
    //     },
    //     wsHandler: (connection, req) => EventBus.websocket.wsHandler(connection, req)
    // });

    // // handle messages from clients sockets
    // EventBus.websocket.messagesHandler = (message, session, connection) => {
    //     // do something with message ...
    //     // ...
    //     // send internal broadcast
    //     EventBus.send('toSomeWebsocketChannelHandler', message);
    //     // ...
    //     // or do something and send result
    //     // ...
    //     // to the current client (from somewhere else)
    //     EventBus.websocket.sendTo(session._id, {some: 'result', to: 'client'});
    //     // or
    //     connection.socket.send({some: 'result', to: 'client'})
    // }


    await Number(3000).sleep()
    process.exit()

}

doit();