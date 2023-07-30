/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */


/*
 * Copyright (c) 2023.
 * @Author: 🇺🇦Rosbitskyy Ruslan
 */

const EventBus = require('../src/EventBus');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function doit() {

    const eventName = 'AweSome';
    EventBus.once(eventName, (once) => {
        console.log('once 1', eventName, once)
    })
    EventBus.once(eventName, (once) => {
        console.log('once 2', eventName, once)
    })

    // rejector
    EventBus.on(eventName, (on) => {
        console.log('on - 1', eventName, on)
    })
    // notification
    EventBus.on(eventName, (on) => {
        console.log('on - 2', eventName, on)
    })

    for (let i = 0; i < 5; i++) {
        EventBus.send(eventName, {index: i})
    }

    process.exit(0)
}

doit();