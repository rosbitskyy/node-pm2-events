import EventBus = require("./EventBus");

export = WebSocket;

declare class WebSocket {
    EventBus: typeof EventBus;
    /**
     * @param {string} id
     * @param {object} connection
     * @return {Map<any, any>}
     */
    addConnection: (id: string, connection: object) => Map<any, any>;
    /**
     * @param {string} id
     * @return {boolean}
     */
    removeConnection: (id: string) => boolean;
    /**
     * @param {string|object|array} v
     * @return {string|*}
     */
    stringify: (v: string | object | any[]) => string | any;
    /**
     * @param {object} message
     * @return {WebSocket}
     */
    send: (message: object) => WebSocket;
    /**
     * @param {string} id
     * @param {object} message
     * @return {WebSocket}
     */
    sendTo: (id: string, message: object) => WebSocket;
    /**
     * @param {object} connection - Duplex
     * @param {object} req - Request
     * @return {WebSocket}
     * @example [About Fastify hooks](https://fastify.dev/docs/latest/Reference/Hooks/) [Fastify websocket plugin](https://github.com/fastify/fastify-websocket)
     */
    wsHandler: (connection: object, req: object) => WebSocket;

    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus: typeof EventBus);

    /**
     * @Override Default incoming socket message
     * @param {function(message, session, connection)} callback
     */
    set messagesHandler(callback: (arg0: object, arg1: object, arg2: object) => any);

    /**
     * @param {boolean} v
     * @return {WebSocket}
     */
    setSendbox(v: boolean): WebSocket;

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * @param {string} channel
     */
    on(channel: string): this;

    /**
     * From internal to self sockets and emit to other servers, and his sockets
     * From external to self sockets
     * @param {string} channel
     */
    registerDuplexEvents(channel: string): void;
}

//# sourceMappingURL=WebSocket.d.ts.map