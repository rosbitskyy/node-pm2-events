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
        console.log(this.#name, 'initialized')
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
            //console.log(Process.#name, pm2ListCmd, '->', rows);
            let ids = JSON.parse(`${rows}`);
            //console.log(Process.#name, 'pm2 ids', ids);
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
    #connections = {};

    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus) {
        this.EventBus = eventBus;
    }

    /**
     * @param {function(message, session, connection)} callback
     */
    set messagesHandler(callback) {
        this.#messagesHandler = callback;
        return this;
    }

    /**
     * @param {object} message
     * @param {object} session - user session data
     * @param {object} connection - wss connection
     */
    #messagesHandler = (message, session, connection) => { // by default - internal send event
        this.EventBus.send('websocketHandler', {message, session, connection});
    };

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * @param {string} channel
     */
    on(channel) {
        if (this.EventBus.transport.debug) console.log(this.#name, 'subscribe to channel:', channel);
        this.EventBus.on(channel, (message) => {
            if (this.EventBus.transport.debug) console.log(this.#name, 'internal message:', channel, message);
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
        this.EventBus.transport.on(channel, async (channel, message) => {
            this.EventBus.websocket.send(message)
        });
    }

    /**
     * @param {string} id
     * @param {object} connection
     * @return {Map<any, any>}
     */
    addConnection = (id, connection) => {
        this.#connections[id] = connection.socket;
        if (this.EventBus.transport.debug) console.log(this.#name, 'addConnection', Object.keys(this.#connections).length);
        return this.#connections[id];
    }
    /**
     * @param {string} id
     * @return {boolean}
     */
    removeConnection = (id) => {
        delete this.#connections[id];
        if (this.EventBus.transport.debug) console.log(this.#name, 'removeConnection', Object.keys(this.#connections).length);
    }

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
            for (let id of Object.keys(this.#connections)) {
                try {
                    if (this.EventBus.transport.debug) console.log(this.#name, 'to socket', id);
                    this.#connections[id].send(message);
                } catch (e) {
                }
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
        const socket = this.#connections[id];
        if (message && socket) {
            try {
                message = this.stringify(message);
                socket.send(message);
            } catch (e) {
            }
        }
        return this;
    }

    /**
     * @param {object} connection
     * @param {object} req
     * @return {WebSocket}
     */
    wsHandler = (connection, req) => {
        const session = req.session || {}; // after your AUTH handler (preHandler: auth, // YOUR Auth Handler method !!!)
        const uid = session._id.toString();
        this.removeConnection(uid);
        this.addConnection(uid, connection);
        connection.setEncoding('utf8')
        if (this.EventBus.transport.debug) console.log(new Date().toLocaleTimeString(),
            this.#name, 'ws connected', session.ip, uid);
        this.#connections[uid].on('message', (message) => {
            try {
                message = JSON.parse(message);
                if (message.type === 'ping') {
                    // connection.socket.send(JSON.stringify({type: 'pong', data: '🇺🇦'})); // or like ->
                    this.#connections[uid].send(JSON.stringify({type: 'pong', data: '🇺🇦'})); // same like <-
                } else if (this.#messagesHandler) this.#messagesHandler(message, session, connection)
            } catch (e) {
            }
        });
        this.#connections[uid].on('close', () => {
            this.removeConnection(uid);
            if (this.EventBus.transport.debug) console.log(new Date().toLocaleTimeString(),
                this.#name, 'ws disconnected', session.ip, uid);
        });
        return this;
    }
}

const Redis = require('ioredis');

class Transport {

    #name = EventBus.name + ' ' + Transport.name + ' ' + Process.process_id;
    #wto = 30000;
    #wtd = 100;
    #publisher
    #subscriber
    #tryCount = 0;

    constructor() {
    }

    /**
     * Initialize Duplex Transport
     * -- must be initialized before register routes
     * @param {Object|RedisOptions} RedisOptions
     * @return {Transport}
     */
    initialize(RedisOptions) {
        if (!this.#subscriber) {
            this.#publisher = Redis.createClient(RedisOptions);
            this.#subscriber = Redis.createClient(RedisOptions);
            this.debug = RedisOptions.debug;
            this.originatorId = Process.id;
            console.log(this.#name, 'initialized')
            this.#connectionStatus();
        }
        return this;
    }

    async waitingConnection() {
        while (this.#publisher.status !== 'ready') {
            await Number(this.#wto / this.#wtd).sleep(); // three times per second
            if (++this.#tryCount > this.#wtd) return false;
        }
        return true
    }

    /**
     * @param {string} channel
     * @param {function(channel, message)} callback
     */
    on(channel, callback) {
        if (!this.#subscriber) throw new Error(this.#name + ' subscriber not initialized yet');
        this.#subscriber.on('message', async (ch, msg) => {
            try {
                if (channel === ch) {
                    msg = msg.constructor === ''.constructor ? JSON.parse(msg) : msg;
                    if (msg.originatorId !== this.originatorId) {
                        callback(ch, msg.data);
                        if (this.debug) console.log(this.#name, 'receive message:', ch, msg);
                    }
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
        while (this.#publisher.status !== 'ready') {
            await Number(this.#wto / this.#wtd).sleep(); // three times per second
            if (++this.#tryCount > this.#wtd) return;
        }
        this.#tryCount = 0;
        message = JSON.stringify({channel, originatorId: this.originatorId, data: message,});
        this.#publisher.publish(channel, message);
        if (this.debug) console.log(this.#name, 'publish:', channel, message);
    }

    #connectionStatus = () => {
        if (!this.debug) return;
        for (let v of ["wait", "reconnecting", "connecting", "connect", "ready", "close", "end"]) {
            this.#subscriber.on(v, () => console.log(this.#name, 'subscriber status:', v))
            this.#publisher.on(v, () => console.log(this.#name, 'publisher status:', v))
        }
    }
}

const event = new EventBus();

module.exports = event;
