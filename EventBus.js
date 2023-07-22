/*
 * Copyright (c) 2023, 🇺🇦 Rosbitskyy Ruslan
 * @Author: 🇺🇦 rosbitskyy@gmail.com
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {

    #name = EventBus.name + ' ' + Process.process_id;

    constructor() {
        super();
        this.transport = new Transport();
        this.websocket = new WebSocket(this);
        this.process = Process;
    }

    /**
     * @param {string} channel
     * @param {object} message
     */
    send(channel, message) {
        this.emit(channel, message);
    };
}

const {execSync} = require("child_process");
const parse = (msg) => msg.constructor === ''.constructor ? JSON.parse(msg) : msg;
const getRandomUID = () => Math.random().toString(16).substring(2);

class Process {

    static #unrealId = Number(`0x${getRandomUID()}`);
    static #process_id = (process.env.pm_id || Process.unrealId);
    static #process_name = (process.env.name || getRandomUID());
    static #name = EventBus.name + ' ' + Process.name + ' ' + Process.process_id;

    static get masterProcessId() {
        return Number(Process.#masterProcessId);
    }

    static get unrealId() {
        return Number(Process.#unrealId);
    }

    static get process_id() {
        return Number(Process.#process_id);
    }

    static get process_name() {
        return Process.#process_name;
    }

    /**
     * @return {string}
     */
    static get id() {
        return ([Process.interface.mac, Process.interface.address, Process.process_name,
            Process.process_id, getRandomUID()].toString().replaceAll(/[^0-9a-f]/g, ''));
    }

    /**
     * @return {{}|NetworkInterfaceInfo}
     */
    static get interface() {
        return Process.#interface;
    }

    /**
     * @return {any[]|number[]}
     */
    static getInstansesIds = () => {
        try {
            if (Process.unrealId === Process.process_id) return [-1];
            const pm2ListCmd = `pm2 id "${Process.process_name}"`;
            let rows = execSync(pm2ListCmd).toString();
            if (rows === '') rows = '[-1]';
            let ids = parse(`${rows}`);
            ids = Array.from(new Set(ids)).reverse().filter(it => it * 1 >= 0);
            return ids.map(it => Number(it));
        } catch (e) {
            console.error(e)
        }
        return [-1];
    };

    /**
     * @type {number}
     */
    static #masterProcessId = Math.min(...Process.getInstansesIds());

    /**
     * is PM2 master instance (for current pm2 VM, not decentralized)
     * in case of local launch without PM2 - always true
     * @return {boolean}
     */
    static get isPm2Master() {
        return Process.masterProcessId === Process.process_id || Process.process_id === Process.unrealId;
    }

    /**
     * @return {{}|NetworkInterfaceInfo}
     */
    static #_interface = () => {
        const interfaces = require('os').networkInterfaces();
        for (let key of Object.keys(interfaces)) {
            const found = interfaces[key].filter(it => it.family === 'IPv4' && !it.internal)
            for (let it of found) {
                if (!it.mac.startsWith('00:00') && !it.address.startsWith('127.')) return it;
            }
        }
        return {};
    }
    static #interface = Process.#_interface();

}

class WebSocket {
    #name = EventBus.name + ' ' + WebSocket.name + ' ' + Process.process_id;
    #connections = new Map();

    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus) {
        this.EventBus = eventBus;
    }

    /**
     * @Override Default incoming socket message
     * @param {function(message, session, connection)} callback
     */
    set messagesHandler(callback) {
        this.#messagesHandler = callback;
        return this;
    }

    /**
     * Default - send internal eventbus message with channel `websocketHandler`
     * @param {object} message
     * @param {object} session - user session data
     * @param {object} connection - wss connection
     */
        // by default - internal send event
    #messagesHandler = (message, session, connection) =>
        this.EventBus.send('websocketHandler', {message, session, connection});

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * @param {string} channel
     */
    on(channel) {
        this.EventBus.on(channel, (message) => {
            this.send(message); // catch internal event and send broadcast to connected clients
            this.EventBus.transport.send(channel, message); // send to other server instances
        });
        return this;
    }

    get getRandomUID() {
        return getRandomUID();
    }

    /**
     * @param {string} id
     * @param {object} connection
     * @return {Map<any, any>}
     */
    addConnection = (id, connection) => this.#connections.set(id, connection);
    /**
     * @param {string} id
     * @return {boolean}
     */
    removeConnection = (id) => this.#connections.delete(id);

    /**
     * @param {string|object|array} v
     * @return {string|*}
     */
    stringify = (v) => {
        return {}.constructor === v.constructor || [].constructor === v.constructor ? JSON.stringify(v) : v;
    }

    /**
     * @param {object} message
     * @return {WebSocket}
     */
    send = (message) => {
        if (message) {
            message = this.stringify(message);
            for (let connection of this.#connections.values()) try {
                connection.socket.send(message);
            } catch (e) {
            }
        }
        return this;
    };

    /**
     * @param {string} id
     * @param {object} message
     * @return {WebSocket}
     */
    sendTo = (id, message) => {
        const connection = this.#connections.get(id);
        if (message && connection) {
            try {
                message = this.stringify(message);
                connection.socket.send(message);
            } catch (e) {
            }
        }
        return this;
    }

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * From external to self sockets
     * @param {string} channel
     */
    registerDuplexEvents(channel) {
        this.on(channel);
        this.EventBus.transport.on(channel, async (channel, message) => this.send(message));
    }

    /**
     * @param {object} connection - Duplex
     * @param {object} req - Request
     * @return {WebSocket}
     * @example [About Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/) [Fastify websocket plugin](https://github.com/fastify/fastify-websocket)
     */
    wsHandler = (connection, req) => {
        // after your AUTH handler fastify hook (preHandler: your auth method)
        const session = (req.userdata || {_id: this.getRandomUID});
        const socket_id = session._id.toString() + this.getRandomUID;
        this.removeConnection(socket_id);
        this.addConnection(socket_id, connection);
        connection.setEncoding('utf8')
        connection.socket.pong = () => connection.socket.send(JSON.stringify({type: 'pong', data: '🇺🇦'}));
        connection.socket.on('message', (message) => {
            try {
                message = parse(message.toString());
                if (message.type === 'ping') connection.socket.pong();
                else if (this.#messagesHandler) this.#messagesHandler(message, {...session, socket_id}, connection)
            } catch (e) {
            }
        });
        connection.socket.on('close', () => this.removeConnection(socket_id));
        return this;
    }
}

const Redis = require('ioredis');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Transport {
    constant = {
        SIGINT: 'SIGINT',
        HANDSHAKE: 'handshake',
        READY: 'ready',
        type: {iamhere: 'im', bye: 'bye',},
        publisher: 'publisher',
        subscriber: 'subscriber',
    }
    #state = ["wait", "reconnecting", "connecting", "connect", this.constant.READY, "close", "end"];
    #name = EventBus.name + ' ' + Transport.name + ' ' + Process.process_id;
    #wto = 30000;
    #wtd = 100;
    #publisher = null;
    #subscriber = null;
    #duplex = null;
    #id = Process.id;

    constructor() {
        this.#duplex = [this.#publisher, this.#subscriber];
    }

    /**
     * Initialize Duplex Transport
     * -- must be initialized before register routes
     * @param {Object|RedisOptions} RedisOptions
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

    get isReady() {
        return this.#publisher && this.#publisher.status === this.constant.READY;
    }

    /**
     * Register handshakes
     * @return {Promise<Transport>}
     */
    async handshakes() {
        const _send = (v) => this.isReady && this.send(this.constant.HANDSHAKE, {type: v, id: Process.id});
        process.on(this.constant.SIGINT, async () => {
            console.log(new Date().toLocaleTimeString(), this.constant.SIGINT, Transport.name, Process.process_id);
            _send(this.constant.type.bye)
            await sleep(1000)
            process.exit(0)
        });
        await this.waitingConnection();
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

    #filterByProcessName = true;
    #excludeAddress = new Set();
    #requestId = 1;

    get processInfo() {
        return {
            id: this.#id,
            process_name: Process.process_name,
            process_id: Process.process_id,
            ...Process.interface
        }
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
     * @param {function(channel, message:{channel, id, data, sender})} callback
     * @description msg - {channel, id, data: message,}
     */
    on(channel, callback) {
        if (!this.#subscriber) throw new Error(this.#name + ' subscriber not initialized yet');
        this.#subscriber.on('message', async (ch, msg) => {
            try {
                // filter by exclusion method
                if (channel !== ch) return;
                msg = parse(msg);
                if (msg.sender.id === this.#id ||
                    this.#filterByProcessName && msg.sender.process_name !== Process.process_name ||
                    this.#excludeAddress.has(msg.sender.address)
                ) return;
                callback(ch, msg.data);
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
        this.#publisher.publish(channel, message);
    }

    toString() {
        return {
            ...this.processInfo,
            excludeAddress: this.#excludeAddress,
            filterByProcessName: this.#filterByProcessName,
            isPM2Master: Process.isPm2Master,
        }
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
        console.log(this.#name, name, 'status:', state)
    };
    /**
     * Set callback on transport ready state changed
     * @param {function(name<string>, state<string>)} callback
     */
    set onStateChange(callback) {
        this.#onStateChange = callback;
        return this;
    }
}

const event = new EventBus();

module.exports = event;
