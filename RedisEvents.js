/*
 *  Copyright (c) 2023.
 *  @Author: 🇺🇦Rosbitskyy Ruslan
 *  @email: rosbitskyy@gmail.com
 */

const Redis = require('ioredis');

class RedisEvents {

    /**
     * Constructor
     * @param {string} OriginatorId - server name or unique identificator
     * @param {Object|RedisOptions} RedisOptions
     */
    constructor(OriginatorId, RedisOptions) {
        this.debug = RedisOptions.debug
        this.originatorId = OriginatorId;
        this.#publisher = Redis.createClient(RedisOptions);
        this.#subscriber = Redis.createClient(RedisOptions);
        this.#setDebugger();
        this.#subscriber.on('message', async (channel, message) => {
            try {
                if (this.debug) console.log(this, 'message:', channel, message);
                if (this.#channels.has(channel)) this.#_onMessage(channel, JSON.parse(message));
            } catch (e) {
                console.error(e)
            }
        });
    }

    #publisher
    #subscriber
    #channels = new Set();

    toString() {
        return RedisEvents.name
    }

    /**
     * on Message object received
     * - filtered - no from self instance
     * @param {function} callback
     * @return {RedisEvents}
     */
    onMessage(callback) {
        this.#_onMessage = (channel, message) => {
            if (this.debug) console.log(this, '_onMessage:', channel, message);
            if (message.originatorId !== this.originatorId) {
                if (this.debug) console.log(this, 'on message originatorId confirmed');
                callback(channel, message);
            } else if (this.debug) console.log(this, 'skipped by self originator id:', this.originatorId)
        };
        return this;
    }

    #_onMessage = () => {
    }

    /**
     * Send message object
     * @param {string} channel
     * @param {Object} message
     */
    publish(channel, message) {
        if (!message || message.constructor !== {}.constructor) {
            throw new Error('We expected a variable(message) as an object - got - ' + (typeof (message)))
        }
        if (this.#publisher.status !== 'ready') return;
        message = JSON.stringify({...message, originatorId: this.originatorId});
        if (this.debug) console.log(this, 'publish:', channel, message);
        this.#publisher.publish(channel, message);
    }

    /**
     * Subscribe to receive messages filtered by channel name
     * @param {string} channel
     * @return {boolean}
     */
    subscribe(channel) {
        if (!this.#channels.has(channel)) {
            this.#channels.add(channel);
            this.#subscriber.subscribe(channel);
            if (this.debug) console.log(this, 'subscribe channel:', channel);
            return true
        }
        return false
    }

    /**
     * Remove subscribed event by name
     * @param {string} channel
     */
    unsubscribe(channel) {
        if (this.#channels.has(channel)) {
            this.#channels.delete(channel);
            this.#subscriber.unsubscribe(channel);
        }
        if (this.debug) console.log(this, 'unsubscribe channel:', channel);
    }

    /**
     * Debug
     */
    #setDebugger = () => {
        if (!this.debug) return;
        for (let v of ["wait", "reconnecting", "connecting", "connect", "ready", "close", "end"])
            this.#subscriber.on(v, () => console.log(this, v))
    }


}

module.exports = RedisEvents;