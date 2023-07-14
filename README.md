🇺🇦***PM2 Instances Events***

Data exchange between instances of pm2
services located on decentralized servers (virtual machines), etc.

The usual mechanism embedded in the process notification 
```ecmascript 6
process.on('message', async function (packet){
    /* do something with packet.data */
}
```
does not include distributed virtual instances, but locally causes a pm2 instance crash under heavy load.

**Internal events**
```ecmascript 6
// internal events
EventBus.on('channelName', (m) => {
    console.log('\tinternal:', m)
})
EventBus.send('channelName', {a: 'qwerty'}) // work
EventBus.send('channelName-2', {a: 'qwerty'}) // not work - not subscribed
```

**An example** of data exchange between different instances 
(decentralized or not - it doesn't matter)
```ecmascript 6
const Config = {
    redis: {
        host: 'localhost',
        password: "your password",
        keepAlive: true,
        port: 6379
    },
    isDev: true,
    fastify: {
        logger: {level: 'info'},
        trustProxy: true,
    }
}

// with distributed events (example: pm2 instances, single decentralized servers)
EventBus.transport.initialize({...Config.redis, debug: true});
EventBus.transport.on('channelName', (message) => {
    console.log('\tcb :', message)
})
EventBus.transport.on('channelName', (message) => {
    console.log('\tcb :', message)
})
EventBus.transport.send('channelName', {action: 'some action'});
```

**Use with [Fastify](https://fastify.dev/) and websocket**

* Add [fastify web socket plugin](https://github.com/fastify/fastify-websocket)
```ecmascript 6
const fastify = require('fastify')(Config.fastify || {
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
    await EventBus.transport.initialize({...Config.redis, debug: Config.isDev}).waitingConnection();
    router.register(fastify); // register your routes - [https://fastify.dev/docs/latest/Reference/Routes]
});
// ....
```

**Add festify routes**
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
        reply.code(404).send();
    },
    wsHandler: (connection, req) => EventBus.websocket.wsHandler(connection, req)
});
```

**Handle messages from clients sockets**
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
    EventBus.websocket.sendTo(session._id, {some: 'result', to: 'client'});
    // or
    connection.socket.send({some: 'result', to: 'client'})
}
```


[Redis](https://redis.io/docs/getting-started/) is used for exchange: [ioredis](https://www.npmjs.com/package/ioredis)
