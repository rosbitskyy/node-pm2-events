/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

const EventEmitter = require('events');
const Process = require('./Process');
const WebSocket = require('./WebSocket');
const Transport = require('./Transport');

class EventBus extends EventEmitter {

    #sendbox = false;
    static #instance = null;

    static get instance() {
        return this.getInstance()
    }

    static getInstance() {
        if (!this.#instance) this.#instance = new EventBus()
        return this.#instance
    }


    setSendbox(v) {
        this.#sendbox = !!v;
        this.transport.setSendbox(v)
        this.websocket.setSendbox(v)
    }

    constructor() {
        super();
        this.process = Process;
        this.transport = new Transport(this);
        this.websocket = new WebSocket(this);
    }

    /**
     * @param {string} channel
     * @param {object} message
     */
    send(channel, message) {
        this.emit(channel, message);
    };
}

const instance = EventBus.instance;
module.exports = instance;