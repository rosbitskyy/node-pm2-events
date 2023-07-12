/*
 *  Copyright (c) 2023.
 *  @Author: 🇺🇦Rosbitskyy Ruslan
 *  @email: rosbitskyy@gmail.com
 */

const interfaces = require('os').networkInterfaces();
const events = require("./EventBus");
const RedisEvents = require("./RedisEvents");

class Pm2Events {

    #redis;
    #connections = new Map();

    /**
     * Constructor
     * @param {{}|Object|RedisOptions} RedisOptions
     */
    constructor(RedisOptions = {}) {
        const unrealId = new Date().getTime();
        const pm2_process_id = Number(process.env.pm_id || unrealId);
        const pm2_process_name = (process.env.name || 'unrealName' + pm2_process_id);
        const OriginatorId = ([this.interface.mac, this.interface.address, pm2_process_name].toString());
        this.#redis = new RedisEvents(OriginatorId, RedisOptions);
        this.debug = RedisOptions.debug;
        // will listen external subscribed incoming messages
        this.#redis.onMessage(async (channel, message) => {
            if (this.debug) console.log(Pm2Events.name, 'external message:', channel, message);
            this.sendSocketMessage(message); // only my sockets
        })
    }

    /**
     * Network Interface Info
     * @return {NetworkInterfaceInfoIPv4|NetworkInterfaceInfoIPv6|{}}
     */
    get interface() {
        return this.#interface;
    }

    /**
     * Network Interface Info
     * @return {{}|NetworkInterfaceInfo}
     */
    #_interface = () => {
        for (let key of Object.keys(interfaces)) {
            const found = interfaces[key].filter(it => it.family === 'IPv4' && !it.internal)
            for (let it of found) {
                if (!it.mac.startsWith('00:00') && !it.address.startsWith('127.')) return it;
            }
        }
        return {};
    }

    #interface = this.#_interface();

    dispatch(channel, message) {
        events.event.send(channel, message);
    }

    /**
     * Add event listener by channel(event) name
     * @param {string} channel
     * @return {Pm2Events}
     */
    addEventListener(channel) {
        if (this.#redis.subscribe(channel)) {
            if (this.debug) console.log(Pm2Events.name, 'subscribe channel:', channel);
            // will listen internal eventbus events
            events.event.on(channel, (message) => {
                if (this.debug) console.log(Pm2Events.name, 'internal message:', channel, message);
                this.sendSocketMessage(message); // catch internal event and send connected clients
                this.#redis.publish(channel, message); // send to other pm2 instances
            });
        }
        return this;
    }

    /**
     * Remove event listener by channel(event) name
     * @param {string} channel
     * @return {Pm2Events}
     */
    removeEventListener(channel) {
        this.#redis.unsubscribe(channel);
        return this;
    }

    /**
     * Add socket connection for user/person by _id
     * @param {string<_id>} id - user or person _id
     * @param {Object} connection - sockect object
     * @return {Map<string, object>}
     */
    addConnection = (id, connection) => this.#connections.set(id, connection);
    /**
     * Remove socket connection
     * @param {string<_id>} id - user or person _id
     * @return {boolean}
     */
    removeConnection = (id) => this.#connections.delete(id);
    /**
     * Stringify object
     * @param {(string|string[]|object)} object
     * @return {string}
     */
    stringify = (object) => {
        return {}.constructor === object.constructor || [].constructor === object.constructor ? JSON.stringify(object) : object;
    }
    /**
     * Send message to all connected clients sockets
     * @param {(string|string[]|object)} object
     * @return {Pm2Events}
     */
    sendSocketMessage = (object) => {
        if (object) {
            object = this.stringify(object);
            for (let connection of this.#connections.values()) {
                try {
                    connection.socket.send(object);
                } catch (e) {
                }
            }
        }
        return this;
    };
    /**
     * Send message to socket by user or person _id
     * @param {string<_id>} id - user or person _id
     * @param {(string|string[]|object)} object
     * @return {Pm2Events}
     */
    sendMessage = (id, object) => {
        const connection = this.#connections.get(id);
        if (object && connection) {
            try {
                object = this.stringify(object);
                connection.socket.send(object);
            } catch (e) {
            }
        }
        return this;
    }
    /**
     * Fastify socket  handler
     * @param {Object} connection - socket object
     * @param {Object} req - Fastify request object
     * @return {Pm2Events}
     * @description for @fastify/websocket
     * @example
     *      // Add Fastify
     *      const fastify = require('fastify')(Config.fastify || {
     *          logger: {level: Config.isDev ? 'info' : 'warn'},
     *          trustProxy: true,
     *      });
     *      // Add [fastify web socket plugin](https://github.com/fastify/fastify-websocket)
     *      fastify.register(require('@fastify/websocket'), {
     *          options: {
     *              maxPayload: 10000 // bytes
     *          }
     *      });
     *      // then in some WSS route
     *      const pm2 = new Pm2Events({...Config.redis, debug: true});
     *      routes.push({
     *         method: 'GET',
     *         url: '/api/wss',
     *         preHandler: wssAuth, // check auth
     *         handler: (req, reply) => {
     *             // this will handle http requests or... >> send 404
     *             reply.code(404).send();
     *         },
     *         wsHandler: async (connection, req) => {
     *             pm2.wsHandler(connection, req);
     *         }
     *     })
     */
    wsHandler = (connection, req) => {
        const authData = req.userdata;
        this.removeConnection(authData._id);
        this.addConnection(authData._id, connection);
        connection.setEncoding('utf8')
        console.log(new Date().toLocaleTimeString('uk-UA'), 'ws connected', authData.ip, authData._id);
        connection.socket.on('message', message => {
            try {
                message = JSON.parse(message);
                if (message.type === 'ping') connection.socket.send(JSON.stringify({type: 'pong', data: '🇺🇦'}));
                // 🇺🇦
            } catch (e) {
            }
        });
        connection.socket.on('close', () => {
            this.removeConnection(authData._id);
            console.log(new Date().toLocaleTimeString('uk-UA'), 'ws disconnected', authData.ip, authData._id);
        });
        return this;
    }

}

module.exports = Pm2Events;