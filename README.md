## 🇺🇦Decentralized instances events

[![npm version](https://img.shields.io/npm/v/node-pm2-events.svg)](https://www.npmjs.com/package/node-pm2-events)
[![Downloads/month](https://img.shields.io/npm/dm/node-pm2-events.svg)](http://www.npmtrends.com/node-pm2-events)

Data exchange between instances of pm2
services located on decentralized servers (virtual machines), etc.

The usual mechanism embedded in the process notification

```javascript
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

```javascript
const EventBus = require('node-pm2-events');
```

### Using internal events

```javascript
// internal events
EventBus.on('channelName', (m) => {
    console.log('\tinternal:', m)
})
EventBus.send('channelName', {awesome: 'data'}) // work
EventBus.send('channelName-2', {data: 'awesome'}) // not work - not subscribed
```

*For the examples below - Let's use the configuration example*

```javascript
const Config = {
    redis: {
        host: 'localhost',
        username: "username",
        password: "password",
        keepAlive: true,
        port: 6379
    },
    isDev: true,
}
```

Try using a free [Redis server](https://app.redislabs.com/)

### Exchange events between different instances

(decentralized or not, pm2 or not - ***it doesn't matter***)

> Execute on one server and on some other(s)
> - Because the server that sends the data itself does not receive it

[![initialize](https://img.shields.io/badge/eventbus-transport_initialize-blue)](https://github.com/rosbitskyy/node-pm2-events/blob/main/main-srv-test.js)

```javascript
// execute on one server and on some other(s)
await EventBus.transport
    .initialize(Config.redis)
    .filterByProcessName(false)
    .waitingConnection();
// other server(s) - recivers
EventBus.transport.on('channelName', (message) => {
    console.log('\tcb :', message)
})
// one server - the one sending the data - senders
EventBus.transport.send('channelName', {some: 'object data'});
```

### Use with [Fastify](https://fastify.dev/) websocket

* Add [fastify web socket plugin](https://github.com/fastify/fastify-websocket)
```javascript
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
```javascript
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

[![filterByProcessName](https://img.shields.io/badge/eventbus-websocket_messagesHandler-blue)](https://github.com/rosbitskyy/node-pm2-events/blob/main/tests/)
```javascript
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

### Register handshakes and change decentralised master/main server

There are no replicas - no slaves - only the Primary(Main) and that's it.
He has to do something alone, in a decentralized environment of many servers and their variety of services

- including PM2 or not - it doesn't matter.

#### Example 1

[![handshakes](https://img.shields.io/badge/eventbus-transport_handshakes-blue)](https://github.com/rosbitskyy/node-pm2-events/blob/main/tests/eventbus-transport-become-primary.js)

```javascript
await EventBus.transport.initialize(Config.redis)
    .filterByProcessName(false)
    .handshakes()
```

[![onMasterChange](https://img.shields.io/badge/eventbus-transport_onPrimaryChange-blue)](https://github.com/rosbitskyy/node-pm2-events/blob/main/tests/eventbus-transport-become-primary.js)

```javascript
// Somewhere, in the place you need
EventBus.transport.onPrimaryChange((isMain) => {
    console.log('isMain', isMain)
    if (isMain) {
        // Some unique event to be processed by the main server
        EventBus.transport.on('Contract', (ch, msg) => {
            /* Do something with the contract */
        })
    } else {
        EventBus.transport.off('Contract');
    }
})
```

#### Example 2

```javascript
await EventBus.transport.initialize(Config.redis)
    .filterByProcessName(false)
    .onPrimaryChange((isMain) => {
        console.log('isMain', isMain)
        if (isMain) {
            // Some unique event to be processed by the main server
            EventBus.transport.on('Contract', (ch, msg) => {
                /* Do something with the contract */
            })
        } else {
            EventBus.transport.off('Contract');
        }
    })
    .handshakes()
```

#### filterByProcessName

[![filterByProcessName](https://img.shields.io/badge/eventbus-transport_filterByProcessName-blue)](https://github.com/rosbitskyy/node-pm2-events/blob/main/main-srv-test.js)

In the case of using the same Redis server for different projects
(different databases, but there will be common alerts),
it is better to additionally use filtering by the name of the
desired process.
```javascript
EventBus.transport.filterByProcessName(true)
```

#### PM2 processes list

| id  | **name**    | mode    | ↺ | status | cpu | memory |
|-----|-------------|---------|---|--------|-----|--------|
| ... |
| 11  | **ym-api**  | cluster | 0 | online | 0%  | 62.4mb |
| 12  | ym-api      | cluster | 0 | online | 0%  | 73.0mb |
| 13  | **my-api**  | cluster | 0 | online | 0%  | 91.3mb |
| 14  | my-api      | cluster | 0 | online | 0%  | 99.2mb |
| ... |
| 94  | **api-bot** | cluster | 2 | online | 0%  | 47.7mb |

If your decentralized processes have different names, but are a single
entity of the microservices ecosystem, turn off filtering by process name:
```javascript
EventBus.transport.filterByProcessName(false)
```

### Dependencies

[![Redis](https://img.shields.io/badge/Redis-ioredis-blue?logo=npm)](https://www.npmjs.com/package/ioredis)
[![](https://img.shields.io/badge/Node.js-v16.x.x-blue?logo=nodedotjs)](https://nodejs.org)

#### Read more (Recommendation)

[![nodedotjs](https://img.shields.io/badge/Node.js-Cluster_--_Node.js_v20.x.x_documentation-blue?logo=nodedotjs)](https://nodejs.org/api/cluster.html)
