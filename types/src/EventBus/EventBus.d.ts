export = instance;
declare const instance: EventBus;

declare class EventBus extends EventEmitter {
    /**
     * @type {EventBus}
     */
    static "__#4@#instance": EventBus;
    process: typeof Process;
    transport: Transport;
    websocket: WebSocket;

    constructor();

    /**
     * @return {EventBus}
     */
    static get instance(): EventBus;

    /**
     * @return {EventBus}
     */
    static getInstance(): EventBus;

    setSendbox(v: any): this;

    /**
     * @param {string} channel
     * @param {object} message
     */
    send(channel: string, message: object): void;
}

import EventEmitter = require("events");
import Process = require("./Process");
import Transport = require("./Transport");
import WebSocket = require("./WebSocket");
//# sourceMappingURL=EventBus.d.ts.map