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

class Process {

    static #unrealId = new Date().getTime();
    static #process_id = Number(process.env.pm_id || Process.unrealId);
    static #process_name = (process.env.name || 'UnrealName' + Process.process_id);
    static #name = EventBus.name + ' ' + Process.name + ' ' + Process.process_id;

    static get masterProcessId() {
        return Process.#masterProcessId;
    }

    static get unrealId() {
        return Process.#unrealId;
    }

    static get process_id() {
        return Process.#process_id;
    }

    static get process_name() {
        return Process.#process_name;
    }

    /**
     * @return {string}
     */
    static get id() {
        return ([Process.interface.mac, Process.interface.address, Process.process_name, Process.process_id,
            Date.now()].toString());
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
            return ids;
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

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * From external to self sockets
     * @param {string} channel
     */
    registerDuplexEvents(channel) {
        this.on(channel);
        this.EventBus.transport.on(channel, async (channel, message) => this.EventBus.websocket.send(message));
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
     * @param {object} connection - Duplex
     * @param {object} req - Request
     * @return {WebSocket}
     * @example
     *  [About Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
     *  [Fastify websocket plugin](https://github.com/fastify/fastify-websocket)
     */
    wsHandler = (connection, req) => {
        // after your AUTH handler fastify hook (preHandler: your auth method)
        const session = (req.userdata || {_id: Math.random().toString(16).substring(2)});
        const uid = session._id.toString();
        this.removeConnection(uid);
        this.addConnection(uid, connection);
        connection.setEncoding('utf8')
        connection.socket.pong = () => connection.socket.send(JSON.stringify({type: 'pong', data: '🇺🇦'}));
        connection.socket.on('message', (message) => {
            try {
                message = parse(message);
                if (message.type === 'ping') connection.socket.pong();
                else if (this.#messagesHandler) this.#messagesHandler(message, session, connection)
            } catch (e) {
            }
        });
        connection.socket.on('close', () => this.removeConnection(uid));
        return this;
    }
}

const Redis = require('ioredis');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class Transport {
    #state = ["wait", "reconnecting", "connecting", "connect", "ready", "close", "end"];
    #name = EventBus.name + ' ' + Transport.name + ' ' + Process.process_id;
    #wto = 30000;
    #wtd = 100;
    #publisher = null;
    #subscriber = null;
    #duplex = null;

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
            this.originatorId = Process.id;
            this.#duplex = [this.#publisher, this.#subscriber];
            this.#registerReadyState();
        }
        return this;
    }

    /**
     * Waiting for ready state
     * -- three times per second
     * @return {Promise<boolean>}
     */
    waitingConnection = async () => {
        while (this.#duplex.some(it => it.status !== 'ready')) await sleep(this.#wto / this.#wtd);
    }

    /**
     * @param {string} channel
     * @param {function(channel, message)} callback
     * @description msg - {channel, originatorId, data: message,}
     */
    on(channel, callback) {
        if (!this.#subscriber) throw new Error(this.#name + ' subscriber not initialized yet');
        this.#subscriber.on('message', async (ch, msg) => {
            try {
                if (channel === ch) {
                    msg = parse(msg);
                    if (msg.originatorId !== this.originatorId) callback(ch, msg.data);
                }
            } catch (e) {
                console.error(e)
            }
        });
        this.#subscriber.subscribe(channel);
    }

    /**
     * @param {string} channel
     */
    off(channel) {
        if (!this.#subscriber) return
        this.#subscriber.unsubscribe(channel)
    }

    /**
     * @param {string} channel
     * @param {object} message
     * @return {Promise<void>}
     */
    async send(channel, message) {
        if (!this.#publisher) throw new Error(this.#name + ' publisher not initialized yet');
        if ((message || {}).constructor !== {}.constructor) {
            throw new Error('We expected a variable(message) as an object - got - ' + (typeof (message)))
        }
        await this.waitingConnection()
        message = JSON.stringify({channel, originatorId: this.originatorId, data: message,});
        this.#publisher.publish(channel, message);
    }

    #registerReadyState = () => {
        for (let v of this.#state) {
            this.#subscriber.on(v, () => this.#onStateChange('subscriber', v))
            this.#publisher.on(v, () => this.#onStateChange('publisher', v))
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
