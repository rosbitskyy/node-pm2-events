/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */


const Redis = require('ioredis');
const {sleep, parse} = require('./utils');

class Transport {
    /**
     * @type {{READY: string, subscriber: string, SIGINT: string, HANDSHAKE: string, publisher: string, type: {iamhere: string, bye: string}, message: string}}
     */
    constant = {
        SIGINT: 'SIGINT',
        HANDSHAKE: 'handshake',
        READY: 'ready',
        type: {iamhere: 'im', bye: 'bye',},
        publisher: 'publisher',
        subscriber: 'subscriber',
        message: 'message',
    }
    #state = ["wait", "reconnecting", "connecting", "connect", this.constant.READY, "close", "end"];
    #wto = 30000;
    #wtd = 100;
    #publisher = null;
    #subscriber = null;
    #duplex = null;
    #name;
    #id;
    #EventBus;

    #isPrimary = true;
    #filterByProcessName = true;
    #excludeAddress = new Set();
    #requestId = 1;

    #sendbox = false;

    /**
     * Transport on ready state?
     * @return {boolean}
     */
    get isReady() {
        return this.#publisher && this.#publisher.status === this.constant.READY;
    }

    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus) {
        this.#EventBus = eventBus;
        this.#duplex = [this.#publisher, this.#subscriber];
        this.#name = 'EventBus Transport ' + eventBus.process.process_id;
        this.#id = eventBus.process.id;
    }

    /**
     * @return {{process_id: number, process_name: string, id: string, address: string;
     *         netmask: string;
     *         mac: string;
     *         internal: boolean;
     *         cidr: string | null;
     *         family: string;
     *         scopeid?: undefined;
     *         }}
     */
    get processInfo() {
        return {
            id: this.#id,
            process_name: this.#EventBus.process.process_name,
            process_id: this.#EventBus.process.process_id,
            ...this.#EventBus.process.interface
        }
    }

    /**
     * @type {boolean}
     * @return {boolean}
     */
    get isPrimary() {
        return this.#isPrimary
    }

    /**
     * @type {boolean}
     * @return {boolean}
     */
    get isMain() {
        return this.#isPrimary
    }

    /**
     * Set callback on transport ready state changed
     * @param {function(name:string, state:string)} callback
     * @return {Transport}
     */
    set onStateChange(callback) {
        this.#onStateChange = callback;
        return this;
    }

    /**
     * @param {boolean} v
     * @return {Transport}
     */
    setSendbox(v) {
        this.#sendbox = !!v;
        return this;
    }

    /**
     * Establish that this is the main process
     * @param {string:EventBus.process.id} id
     * @return {Transport}
     */
    #setIsPrimary(id) {
        this.#isPrimary = this.#id === id;
        if (this.#onPrimaryChange && typeof this.#onPrimaryChange === 'function') this.#onPrimaryChange(this.#isPrimary);
        return this;
    }

    /**
     * by default do nothing
     * @param {boolean} isPrimary
     */
    #onPrimaryChange = (isPrimary) => {
        /* Some unique event to be processed by the main server */
        /* register or unregister awesome event here */
        /* do awesome here */
    }

    /**
     * @param {function(isPrimary:boolean)} callback
     * @return {Transport}
     */
    onPrimaryChange(callback) {
        this.#onPrimaryChange = callback;
        return this;
    }

    /**
     * Initialize Duplex Transport
     * -- must be initialized before register routes
     * @param {{host: string, username: string|null, password: string|null, keepAlive: boolean, port: number}} RedisOptions
     * @return {Transport}
     */
    initialize(RedisOptions) {
        if (this.#duplex.every(it => it === null)) {
            this.#publisher = Redis.createClient(RedisOptions);
            this.#subscriber = Redis.createClient(RedisOptions);
            this.#duplex = [this.#publisher, this.#subscriber];
            this.#registerReadyState();
        }
        return this;
    }

    /**
     * @param {string<EventBus.process.id>} id
     * @return {boolean}
     */
    isSameId = (id) => id === this.#id;

    /**
     * @param {string} process_name
     * @return {boolean}
     */
    isSameProcessName = (process_name) => process_name === this.#EventBus.process.process_name;

    /**
     * Register handshakes and change decentralised primary server.
     * There are no replicas - no slaves - only the Primary and that's it.
     * He has to do something alone, in a decentralized environment of many servers and their variety of services
     * - including PM2 or not - it doesn't matter.
     * @return {Promise<Transport>}
     * @example
     *      await EventBus.transport.initialize({...Config.redis})
     *         .filterByProcessName(false) // ?? or not :)
     *         .handshakes()
     */
    async handshakes() {
        const _send = (v) => this.isReady && this.send(this.constant.HANDSHAKE, {type: v});
        process.on(this.constant.SIGINT, async () => {
            console.log(new Date().toLocaleTimeString(), this.constant.SIGINT, Transport.name, this.#id);
            this.off(this.constant.HANDSHAKE);
            _send(this.constant.type.bye)
            await sleep(1000)
            process.exit(0)
        });
        await this.waitingConnection();

        this.#subscriber.on(this.constant.message, async (channel, message) => {
            try {
                if (channel !== this.constant.HANDSHAKE) return;
                message = parse(message);
                if (message.data.type === this.constant.type.iamhere) this.#setIsPrimary(message.sender.id);
                if (message.data.type === this.constant.type.bye && !this.isSameId(message.sender.id)) _send(this.constant.type.iamhere);
            } catch (e) {
                console.error(e)
            }
        })
        this.#subscriber.subscribe(this.constant.HANDSHAKE);

        _send(this.constant.type.iamhere);
        return this;
    }

    /**
     * Waiting for ready state
     * -- three times per second
     * @return {Promise<boolean>}
     */
    waitingConnection = async () => {
        while (this.#duplex.some(it => it.status !== this.constant.READY)) await sleep(this.#wto / this.#wtd);
    }

    /**
     * In the case of using the same Redis server for different projects
     * (different databases, but there will be common alerts),
     * it is better to additionally use filtering by the name of the desired process.
     * @param {boolean} v
     * @return {Transport}
     * @example
     * PM2 processes list
     * ┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
     * │ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
     * ├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
     * ...
     * │ 11 │ ym-api             │ cluster  │ 0    │ online    │ 0%       │ 62.4mb   │
     * │ 12 │ ym-api             │ cluster  │ 0    │ online    │ 0%       │ 73.0mb   │
     * ...
     * │ 13 │ my-api             │ cluster  │ 0    │ online    │ 0%       │ 91.3mb   │
     * │ 14 │ my-api             │ cluster  │ 0    │ online    │ 0%       │ 99.2mb   │
     * │ 15 │ my-api             │ cluster  │ 0    │ online    │ 0%       │ 92.1mb   │
     * │ 16 │ my-api             │ cluster  │ 0    │ online    │ 0%       │ 92.1mb   │
     * ...
     */
    filterByProcessName(v) {
        this.#filterByProcessName = Boolean(!!v)
        return this;
    }

    /**
     * or filter by IP addresses.
     * ^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$
     * @param {string} ip
     * @return {Transport}
     */
    addIgnoredIPAddress(ip) {
        if (!require('net').isIPv4(ip)) return this;
        this.#excludeAddress.add(ip);
        return this;
    }

    /**
     * @param {string} channel
     * @return {Transport}
     */
    off(channel) {
        if (!this.#subscriber) return this;
        this.#subscriber.unsubscribe(channel)
        return this;
    }

    /**
     * @param {string} channel
     * @param {function(channel:string, message:{channel:string, id:string, data:object, sender:object})} callback
     * @description msg - {channel, id, data: message,}
     */
    on(channel, callback) {
        if (!this.#subscriber) throw new Error(this.#name + ' subscriber not initialized yet');
        this.#subscriber.on(this.constant.message, async (ch, message) => {
            try {
                // filter by exclusion method
                if (channel !== ch) return;
                message = parse(message);
                if (this.isSameId(message.sender.id) ||
                    this.#filterByProcessName && !this.isSameProcessName(message.sender.process_name) ||
                    this.#excludeAddress.has(message.sender.address)
                ) return;
                this.#sendbox && console.log('transport on callback', channel, message)
                callback(ch, message.data);
            } catch (e) {
                console.error(e)
            }
        });
        this.#subscriber.subscribe(channel);
    }

    /**
     * @param {string} channel
     * @param {object} message
     * @return {Promise<void>}
     */
    async send(channel, message) {
        if (!this.#publisher) throw new Error(this.#name + ' publisher not initialized yet');
        await this.waitingConnection()
        message = JSON.stringify({
            channel,
            id: Number(++this.#requestId).toString(16),
            data: message,
            sender: this.processInfo
        });
        this.#sendbox && console.log('transport send', channel, message)
        this.#publisher.publish(channel, message);
    }

    /**
     * @return {string}
     */
    toString() {
        return JSON.stringify({
            ...this.processInfo,
            excludeAddress: this.#excludeAddress,
            filterByProcessName: this.#filterByProcessName,
            isPM2Primary: this.#EventBus.process.isPm2Primary,
            isPrimary: this.#isPrimary,
        })
    }

    #registerReadyState = () => {
        for (let v of this.#state) {
            this.#subscriber.on(v, () => this.#onStateChange && this.#onStateChange(this.constant.subscriber, v))
            this.#publisher.on(v, () => this.#onStateChange && this.#onStateChange(this.constant.publisher, v))
        }
    }

    /**
     * @param {string} name
     * @param {string} state
     */
    #onStateChange = (name, state) => {
        this.#sendbox && console.log(this.#name, name, 'status:', state)
    };
}

module.exports = Transport;
