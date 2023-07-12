/*
 * Copyright (c) 2023
 * @Author: 🇺🇦 Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

// https://stackoverflow.com/questions/37929429/sharing-event-across-modules

// use the ES6 class andextends keywords to get language level inheritance support.
const EventEmitter = require('events');

class Event extends EventEmitter {
    /**
     * Send event with data
     * @param {string} channel
     * @param {object} message
     */
    send(channel, message) {
        this.emit(channel, message);
    };
}

const event = new Event();

module.exports = {
    event
};