/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

const {parse, getRandomUID} = require('./utils');

class WebSocket {
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
        return JSON.stringify(v);
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
                console.error(e)
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
                console.error(e)
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
        const session = (req.userdata || {_id: getRandomUID()});
        const socket_id = session._id.toString() + getRandomUID();
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

module.exports = WebSocket;