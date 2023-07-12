🇺🇦***PM2 Instances Events***

Data exchange between instances of pm2
services located on decentralized servers (virtual machines), etc.

The usual mechanism embedded in the process notification 
`
process.on('message', async function (packet){
    /* do something with packet.data */
}
`
does not include distributed virtual instances, but locally causes a pm2 instance crash under heavy load.

**An example** of data exchange between different instances 
(decentralized or not - it doesn't matter)
```ecmascript 6
const Events = require('node-pm2-events');

const channelName = 'AweSome Channel Or Event Name';

// pm2 some instances test
const redisExternalSenderServer = new Events.Redis('some-server-1', {...Config.redis, debug: true});
const redisReceiver = new Events.Redis('other-server-2', {...Config.redis, debug: true});

redisReceiver.onMessage(async (channel, message) => {
    console.log(redisReceiver.originatorId, 'receive message', channel, message)
}).subscribe(channelName);

let count = 0;
const timer = setInterval(() => {
    const v = {action: 'contract', obj: {_d: 2}, _id: String(Date.now()).hash()}
    redisExternalSenderServer.publish(channelName, v);
    if (count++ > 100) process.exit();
}, 10);
```

**Usage example with websocket**
```ecmascript 6
const Events = require('node-pm2-events');

const channelName = 'AweSome Channel Or Event Name';
const pm2 = new Events.Pm2({...Config.redis, debug: true});
// Listen to all external events and broadcast them locally 
// to all connected clients via websocket
pm2.addEventListener(channelName);

// Sending a local event anywhere in the project.
// Will be caught locally and passed to other pm2 instances and attempt 
// to pass to all connected websocket clients.
pm2.dispatch(channelName, {awesome: 'something'});
```

**Use with [Fastify](https://fastify.dev/)**

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
// ....

// then add some route
const channelName = 'AweSome Channel Or Event Name';
const pm2 = new Events.Pm2({...Config.redis, debug: true});
pm2.addEventListener(channelName);
// ....

routes.push({
    method: 'GET',
    url: '/api/wss',
    preHandler: wssAuth, // check auth
    handler: (req, reply) => {
        // this will handle http requests or... >> send 404
        reply.code(404).send();
    },
    wsHandler: async (connection, req) => {
        pm2.wsHandler(connection, req);
    }
})
```


[Redis](https://redis.io/docs/getting-started/) is used for exchange: [ioredis](https://www.npmjs.com/package/ioredis)
