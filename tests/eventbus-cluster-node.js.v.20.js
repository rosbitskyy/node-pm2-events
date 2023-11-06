/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

const EventBus = require('../src/EventBus');
const {sleep} = require('../src/EventBus/utils')
const cluster = require('cluster');
const https = require('https');
const {availableParallelism} = require('os');
const {describe, it} = require("node:test");
const assert = require("node:assert");

const numCPUs = Math.max(2, Math.min(2, availableParallelism()));
const LocalAweSomeEvent = 'LocalAweSomeEvent';
const channelName = 'AweSomeDecentralizedEvent';

class Statistics {
    clusterSent = 0;
    clusterReceive = 0;
    localReceive = 0;
    localSent = 0;
    transportReceive = 0;
    transportSent = 0;
}

/**
 * @param {string} name
 * @param {Statistics} stat
 */
const registerProcessSignal = (name, stat) => {
    console.log(name, `process ${process.pid} is running`);
    const events = [{event: 'exit', code: 0, name}, {event: 'SIGINT', code: 2, name}]

    for (let v of events) process.on(v.event, async () => {
        console.log(v.name, 'process', v.event, process.pid, 'statistic', stat);
        if (!cluster.isPrimary) {
            stat.clusterSent++;
            process.send(stat);
        } else {
            const checkIt = [
                {name: 'Cluster', conditions: stat.clusterSent === stat.clusterReceive && stat.clusterSent === numCPUs},
                {name: 'Local', conditions: stat.localSent === stat.localReceive - numCPUs}, // - receive once of every worker
                {name: 'Transport', conditions: stat.transportSent === stat.transportReceive},
                {name: 'Statistical', conditions: stat.localReceive % 2 === 0},
            ];
            const text = 'Invalid number of sent and received %o process messages';
            for (let it of checkIt) {
                if (!it.conditions) {
                    console.log(text, v.name);
                    // can be error with free redis service access
                    process.exit(1);
                }
            }
        }
        await sleep(200); // wait for console log
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
            statistic.clusterReceive++;
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

    EventBus.setSendbox(true)
    await EventBus.transport.initialize(Config.redis)
        .filterByProcessName(false)
        .handshakes()


    EventBus.transport.on(channelName, (channelName, message) => {
        console.log(name, 'process', process.pid, EventBus.process.process_name, 'receive', message)
        statistic.transportReceive++;
    })

    EventBus.transport.onPrimaryChange(async (isPrimary) => {
        if (isPrimary) {
            console.log(name, 'process', process.pid, EventBus.process.process_name, 'isPrimary', isPrimary, 'Some unique event to be processed by the main server')
            // Some unique event to be processed by the main server
            EventBus.transport.on('Contract', (ch, msg) => {
                /* Do something with the contract */
                statistic.transportReceive++;
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
                await sleep(200);
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
        statistic.localReceive++
    })
    EventBus.on(LocalAweSomeEvent, (on) => {
        console.log(name, process.pid, 'on event', LocalAweSomeEvent, on)
        statistic.localReceive++
    })
}

/**
 * @param {Statistics} statistic
 */
const testLocalEvents = (statistic) => {
    for (let i = 0; i < 5; i++) {
        EventBus.send(LocalAweSomeEvent, {index: i});
        ++statistic.localSent;
    }
}

const start = async () => {
    let statistic;
    if (cluster.isPrimary) {
        statistic = new Statistics();
        registerProcessSignal('Cluster', statistic)
        for (let i = 0; i < numCPUs; i++) cluster.fork();
        registerClusterEvents(statistic)
    } else {
        // Workers can share any TCP connection
        // In this case it is an HTTP server
        https.createServer((req, res) => {
            res.writeHead(200);
            res.end('hello world\n');
        }).listen(8080);

        const name = 'Worker';
        statistic = new Statistics();
        registerProcessSignal(name, statistic)
        registerLocalEvents(name, statistic)
        await registerDecentralizedEvents(name, statistic)
        testLocalEvents(statistic)

        await sleep(5000)
        process.exit(0)
    }

    describe('EventBus', () => {
        it('local events count', () => assert.equal(statistic.localReceive, 0))
        it('local events count', () => assert.equal(statistic.localSent, 0))
        it('local events count', () => assert.equal(statistic.transportReceive, 0))
        it('local events count', () => assert.equal(statistic.transportSent, 0))
    })
}

start();