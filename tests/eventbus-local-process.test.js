/*
 * Copyright (c) 2023.
 * @Author: 🇺🇦Rosbitskyy Ruslan
 */

const EventBus = require('../src/EventBus');
const {describe, it} = require("node:test");
const assert = require("node:assert");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function doit() {
    const count = 5;
    const expect = (count + 1) * 2;
    let __count = 0;
    const eventName = 'AweSome';
    EventBus.setSendbox(true)
    EventBus.once(eventName, (once) => {
        console.log('once 1', eventName, once)
        __count++;
    })
    EventBus.once(eventName, (once) => {
        console.log('once 2', eventName, once)
        __count++;
    })

    // rejector
    EventBus.on(eventName, (on) => {
        console.log('on - 1', eventName, on)
        __count++;
    })
    // notification
    EventBus.on(eventName, (on) => {
        console.log('on - 2', eventName, on)
        __count++;
    })

    for (let i = 0; i < count; i++) {
        EventBus.send(eventName, {index: i})
    }

    describe('EventBus', () => {
        it('local events count', () => assert.equal(__count, expect))
    })

}

doit();