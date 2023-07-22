## 🇺🇦Decentralized instances events

[![npm version](https://img.shields.io/npm/v/node-pm2-events.svg)](https://www.npmjs.com/package/node-pm2-events)
[![Downloads/month](https://img.shields.io/npm/dm/node-pm2-events.svg)](http://www.npmtrends.com/node-pm2-events)

Data exchange between instances of pm2
services located on decentralized servers (virtual machines), etc.

The usual mechanism embedded in the process notification

```ecmascript 6
process.on('message', async function (packet) {
    /* do something with packet.data */
})
```
does not include distributed virtual instances, but locally causes a pm2 instance crash under heavy load.

### Install

```shell
npm i node-pm2-events
```

### Initialize

```ecmascript 6
const EventBus = require('node-pm2-events');
```

### Using internal events

```ecmascript 6
// internal events
EventBus.on('channelName', (m) => {
    console.log('\tinternal:', m)
})
EventBus.send('channelName', {awesome: 'data'}) // work
EventBus.send('channelName-2', {data: 'awesome'}) // not work - not subscribed
```

*For the examples below - Let's use the configuration example*

```ecmascript 6
const Config = {
    redis: {
        host: 'localhost',
        password: "your password",
        keepAlive: true,
        port: 6379
    },
    isDev: true,
}
```
Free [Redis server](https://app.redislabs.com/)

### Exchange events between different instances
(decentralized or not, pm2 or not - ***it doesn't matter***)

> Execute on one server and on some other(s)
> - Because the server that sends the data itself does not receive it
```ecmascript 6
// execute on one server and on some other(s)
await EventBus.transport.initialize(Config.redis).waitingConnection();
// other server(s) - recivers
EventBus.transport.on('channelName', (message) => {
    console.log('\tcb :', message)
})
// one server - the one sending the data - senders
EventBus.transport.send('channelName', {some: 'object data'});
```

### Use with [Fastify](https://fastify.dev/) websocket

* Add [fastify web socket plugin](https://github.com/fastify/fastify-websocket)
```ecmascript 6
const fastify = require('fastify')({
    logger: {level: Config.isDev ? 'info' : 'warn'},
    trustProxy: true,
});
// Add [fastify web socket plugin](https://github.com/fastify/fastify-websocket)
fastify.register(require('@fastify/websocket'), {
    options: {
        maxPayload: 10000 // bytes
    }
});
fastify.after(async () => {
    await EventBus.transport
        .initialize(Config.redis)
        .filterByProcessName(true)
        .addIgnoredIPAddress('123.45.67.89')
        .waitingConnection();
    router.register(fastify); // register your routes - [https://fastify.dev/docs/latest/Reference/Routes]
});
// ....
```

### Add Festify routes
([About Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/))
> local events will be relayed to your websocket connections and to decentralized servers as well
```ecmascript 6
//...
const routes = [];
// From internal to self sockets and emit to other servers, and his sockets
// From external to self sockets
EventBus.websocket.registerDuplexEvents('channelName');
routes.push({
    method: 'GET',
    url: '/api/websocket/endpoint',
    preHandler: auth, // YOUR Auth Handler method - generate session object with session _id!!!
    handler: (req, reply) => {
        reply.code(404).send(); // or something else for GET response...
    },
    wsHandler: (connection, req) => EventBus.websocket.wsHandler(connection, req)
});
```

### Handle messages from clients sockets
```ecmascript 6
// override: handle messages from clients sockets
EventBus.websocket.messagesHandler = (message, session, connection) => {
    // do something with message ...
    // ...
    // send internal broadcast
    EventBus.send('toSomeWebsocketChannelHandler', message);
    // ...
    // or do something and send result
    // ...
    // to the current client (from somewhere else)
    EventBus.websocket.sendTo(session.socket_id, {some: 'data', to: 'client'});
    // or
    connection.socket.send({some: 'data', to: 'client'})
    
    // send broadcast to all ? (why? but)
    EventBus.websocket.send({some: 'data', to: 'client'});
}
```


[Redis](https://redis.io/docs/getting-started/) is used for exchange: [ioredis](https://www.npmjs.com/package/ioredis)
