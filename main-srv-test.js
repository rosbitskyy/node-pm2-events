/*
 * Copyright (c) 2023.
 * @Author: 🇺🇦Rosbitskyy Ruslan
 */

const EventBus = require('./index');

// Try using a free [Redis server](https://app.redislabs.com/)
const Config = {
    redis: {
        host: 'redis-XXXXX.XXXX.us-east-X-X.X.cloud.redislabs.com',
        username: "XXX",
        password: "XXX",
        keepAlive: true,
        port: 17300
    },
    isDev: true
}

/**
 * @return {Promise<void>}
 * @example
 * Run in local terminal (3 instances)
 *  $ node main-srv-test.js
 *  $ node main-srv-test.js
 *  $ node main-srv-test.js
 *  Alternately stop and enable different of them to see the result of changing the main service
 *
 *  Or read -> [Cluster Fork Node.js v20.5.0 documentation](https://nodejs.org/api/cluster.html)
 */

async function doit() {

    console.log(this, EventBus.transport.toString())

    // Somewhere, in the place you need
    await EventBus.transport.initialize(Config.redis)
        .filterByProcessName(false)
        .handshakes()

    // Somewhere, in the place you need
    const channelName = 'AweSome';
    EventBus.transport.on(channelName, (channelName, message) => {
        console.log('srv', message)
    })

    // Somewhere, in the place you need
    EventBus.transport.send(channelName, {awesomedata: 'some action'});

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
}

doit();