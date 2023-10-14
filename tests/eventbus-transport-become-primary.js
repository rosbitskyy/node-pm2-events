/*
 * Copyright (c) 2023.
 * @Author: 🇺🇦Rosbitskyy Ruslan
 */

const EventBus = require('../src/EventBus');
const {sleep} = require('../src/EventBus/utils')
// const EventBus = require('node-pm2-events');

// Try using a free [Redis server](https://app.redislabs.com/)
const Config = {
    redis: {
        host: process.env.REDIS_HOST,
        password: process.env.REDIS_PASSWORD,
        keepAlive: true,
        port: process.env.REDIS_PORT * 1
    },
}

async function doit() {

    console.log(EventBus.transport.toString())


    if (!Config.redis.port) process.exit(0)


    await EventBus.transport.initialize(Config.redis)
        .filterByProcessName(false)
        .handshakes()

    EventBus.transport.setSendbox(true)
    EventBus.websocket.setSendbox(true)

    const channelName = 'AweSome';
    EventBus.transport.on(channelName, (channelName, message) => {
        console.log('process', EventBus.process.process_name, 'receive', message)
    })

    EventBus.transport.send(channelName, {awesomedata: 'some action'});

    EventBus.transport.onPrimaryChange(async (isPrimary) => {
        if (isPrimary) {
            console.log(EventBus.process.process_name, 'isPrimary', isPrimary, 'Some unique event to be processed by the main server')
            // Some unique event to be processed by the main server
            EventBus.transport.on('Contract', (ch, msg) => {
                /* Do something with the contract */
            })

            // example
            for (let i = 0; i < 5; i++) {
                if (!EventBus.transport.isPrimary) break; // is it still the main one?
                EventBus.transport.send(channelName, {
                    from: 'Primary',
                    primary: EventBus.process.process_name,
                    to: 'other',
                })
                await sleep(1000);
            }
        } else {
            EventBus.transport.off('Contract');
            console.log(EventBus.process.process_name, 'isPrimary', isPrimary, 'Off unique event')
        }
    })
}

doit();