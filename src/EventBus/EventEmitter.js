/*
 * Copyright (c) 2018-2023.
 * @Author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

class EventEmitter {

    #events = {};
    #once = {};
    #maxEvents = Infinity;
    #maxListeners = Infinity;
    #warn = {};
    addListener = this.on;
    removeListener = this.off;

    constructor() {
    }

    setMaxListeners(n) {
        this.#maxListeners = n || Infinity;
        return this;
    }

    setMaxEvents(n) {
        this.#maxEvents = n || Infinity;
        return this;
    }

    #get(event) {
        !this.#events[event] && (this.#events[event] = []);
        return this;
    }

    /**
     * @param {string} event
     * @param {function(any)} listener
     */
    on(event, listener) {
        this.#get(event).#events[event].push(listener);
        let cnt = this.#events[event].length;
        if (this.#maxListeners <= cnt && !this.#warn.maxListeners) {
            console.warn('WARNING:', (
                `Listeners count is ${cnt} for event '${event}' ` +
                `added to EventEmitter. Use this.setMaxListeners(n) to increase limit`));
            this.#warn.maxListeners = 1;
        }
        cnt = Object.keys(this.#events).length;
        if (cnt >= this.#maxEvents && !this.#warn.maxEvents) {
            console.warn('WARNING:', (
                `Events count is ${cnt}, but max is ${this.#maxEvents} ` +
                `added to EventEmitter. Use this.setMaxEvents(n) to increase limit`));
            this.#warn.maxEvents = 1;
        }
        return this;
    }

    /**
     * @param {string} event
     * @param {function(any)} listener
     */
    off(event, listener) {
        this.#events[event] = this.#get(event).#events[event].filter(it => it !== listener);
        return this;
    }

    /**
     * @param {string} event
     * @param {function(any)} listener
     */
    once(event, listener) {
        if (this.#once[event] && !this.#warn.once) {
            console.warn('WARNING:', (`Once listener '${event}' already added to EventEmitter. Prev listener will be override.`));
            this.#warn.once = 1;
        }
        this.#once[event] = (async (args) => {
            try {
                if (listener) {
                    listener(args); // maybe the listener has already been kicked? :)
                    this.removeOnceListener(event)
                }
            } catch (e) {
                console.error(e)
            }
        });
        return this;
    }

    removeOnceListener(event) {
        delete this.#once[event];
        return this;
    }

    /**
     * @param {string} event
     * @param {any} object
     */
    emit(event, object) {
        this.#events[event] && this.#events[event].forEach(listener => listener.call(null, object));
        this.#once[event] && this.#once[event](object);
        return this;
    }
}

module.exports = EventEmitter;