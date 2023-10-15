/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

const EventBus = require('../src/EventBus');
const {sleep} = require('../src/EventBus/utils')
const cluster = require('cluster');
const http = require('http');
const {availableParallelism} = require('os');

const numCPUs = Math.max(2, Math.min(2, availableParallelism()));
const LocalAweSomeEvent = 'LocalAweSomeEvent';
const channelName = 'AweSomeDecentralizedEvent';

class Statistics {

    localRecieve = 0;
    transportRecieve = 0;
    transportSent = 0;

}

/**
 * @param {string} name
 * @param {Statistics} statistic
 */
const registerProcessSignal = (name, statistic) => {
    console.log(name, `process ${process.pid} is running`);
    const events = [{event: 'exit', code: 0, name}, {event: 'SIGINT', code: 2, name}]

    for (let v of events) process.on(v.event, async () => {
        console.log(v.name, 'process', v.event, process.pid, 'statistic', statistic);
        if (!cluster.isPrimary) process.send(statistic);
        else {
            console.assert(statistic.transportSent === statistic.transportRecieve,
                'Invalid number of sent and received traffic messages')
            console.assert(statistic.localRecieve % 2 === 0, 'Invalid number of statistical classes')
        }
        await sleep(200);
        process.exit(v.code)
    });
}

/**
 * @param {Statistics} statistic
 */
const registerClusterEvents = (statistic) => {
    cluster.on('listening', (worker, address) => {
        console.log(`A worker ${worker.process.pid} is now connected to`, address.address || 'localhost', ':', address.port);
    });
    cluster.on('message',
        /**
         * @param {cluster} worker
         * @param {Statistics} message
         * @param {any} signal
         */
        (worker, message, signal) => {
            for (let k of Object.keys(statistic)) if (!isNaN(statistic[k])) statistic[k] += message[k];
        });
}

/**
 * @param {string} name
 * @param {Statistics} statistic
 */
const registerDecentralizedEvents = async (name, statistic) => {
    const Config = {
        redis: {
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD,
            keepAlive: true,
            port: process.env.REDIS_PORT * 1
        },
    }
    if (!Config.redis.port) process.exit(1)

    await EventBus.transport.initialize(Config.redis)
        .filterByProcessName(false)
        .handshakes()
    EventBus.transport.setSendbox(true)

    EventBus.transport.on(channelName, (channelName, message) => {
        console.log(name, 'process', process.pid, EventBus.process.process_name, 'receive', message)
        statistic.transportRecieve++;
    })

    EventBus.transport.onPrimaryChange(async (isPrimary) => {
        if (isPrimary) {
            console.log(name, 'process', process.pid, EventBus.process.process_name, 'isPrimary', isPrimary, 'Some unique event to be processed by the main server')
            // Some unique event to be processed by the main server
            EventBus.transport.on('Contract', (ch, msg) => {
                /* Do something with the contract */
                statistic.transportRecieve++;
            })

            // example
            for (let i = 0; i < 2; i++) {
                if (!EventBus.transport.isPrimary) break; // is it still the main one?
                EventBus.transport.send(channelName, {
                    from: 'Primary',
                    primary: EventBus.process.process_name,
                    to: 'other',
                    name, pid: process.pid,
                })
                statistic.transportSent++;
                await sleep(1000);
            }
        } else {
            EventBus.transport.off('Contract');
            console.log(name, 'process', process.pid, EventBus.process.process_name, 'isPrimary', isPrimary, 'Off unique event')
        }
    });
}

/**
 * @param {string} name
 * @param {Statistics} statistic
 */
const registerLocalEvents = (name, statistic) => {
    EventBus.once(LocalAweSomeEvent, (once) => {
        console.log(name, process.pid, 'once event', LocalAweSomeEvent, once)
        statistic.localRecieve++
    })
    EventBus.on(LocalAweSomeEvent, (on) => {
        console.log(name, process.pid, 'on event', LocalAweSomeEvent, on)
        statistic.localRecieve++
    })
}

const testLocalEvents = () => {
    for (let i = 0; i < 5; i++) EventBus.send(LocalAweSomeEvent, {index: i})
}

const start = async () => {
    if (cluster.isPrimary) {
        const statistic = new Statistics();
        registerProcessSignal('Cluster', statistic)
        for (let i = 0; i < numCPUs; i++) cluster.fork();
        registerClusterEvents(statistic)
    } else {
        // Workers can share any TCP connection
        // In this case it is an HTTP server
        http.createServer((req, res) => {
            res.writeHead(200);
            res.end('hello world\n');
        }).listen(8080);


        const name = 'Worker';
        const statistic = new Statistics();
        registerProcessSignal(name, statistic)
        registerLocalEvents(name, statistic)
        await registerDecentralizedEvents(name, statistic)

        testLocalEvents()

        await sleep(5000)
        process.exit(0)
    }
}

start();