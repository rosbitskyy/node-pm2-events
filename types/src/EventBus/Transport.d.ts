import EventBus = require("./EventBus");

export = Transport;

declare class Transport {
    /**
     * @type {{READY: string, subscriber: string, SIGINT: string, HANDSHAKE: string, publisher: string, type: {iamhere: string, bye: string}, message: string}}
     */
    constant: {
        READY: string;
        subscriber: string;
        SIGINT: string;
        HANDSHAKE: string;
        publisher: string;
        type: {
            iamhere: string;
            bye: string;
        };
        message: string;
    };
    /**
     * @param {string} id
     * @return {boolean}
     */
    isSameId: (id: string) => boolean;
    /**
     * @param {string} process_name
     * @return {boolean}
     */
    isSameProcessName: (process_name: string) => boolean;
    /**
     * Waiting for ready state
     * -- three times per second
     * @return {Promise<boolean>}
     */
    waitingConnection: () => Promise<boolean>;

    /**
     * @param {EventBus} eventBus
     */
    constructor(eventBus: typeof EventBus);

    /**
     * Transport on ready state?
     * @return {boolean}
     */
    get isReady(): boolean;

    /**
     * @type {boolean}
     * @return {boolean}
     */
    get isPrimary(): boolean;

    /**
     * @type {boolean}
     * @return {boolean}
     */
    get isMain(): boolean;

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
    get processInfo(): {
        process_id: number;
        process_name: string;
        id: string;
        address: string;
        netmask: string;
        mac: string;
        internal: boolean;
        cidr: string | null;
        family: string;
        scopeid?: undefined;
    };

    /**
     * Set callback on transport ready state changed
     * @param {function(name:string, state:string)} callback
     * @return {Transport}
     */
    set onStateChange(callback: Function);

    /**
     * @param {boolean} v
     * @return {Transport}
     */
    setSendbox(v: boolean): Transport;

    /**
     * @param {function(isPrimary:boolean)} callback
     * @return {Transport}
     */
    onPrimaryChange(callback: any): Transport;

    /**
     * Initialize Duplex Transport
     * -- must be initialized before register routes
     * @param {{host: string, username?: string|null, password: string|null, keepAlive: boolean, port: number}} RedisOptions
     * @return {Transport}
     */
    initialize(RedisOptions: object): Transport;

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
    handshakes(): Promise<Transport>;

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
    filterByProcessName(v: boolean): Transport;

    /**
     * or filter by IP addresses.
     * ^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$
     * @param {string} ip
     * @return {Transport}
     */
    addIgnoredIPAddress(ip: string): Transport;

    /**
     * @param {string} channel
     * @return {Transport}
     */
    off(channel: string): Transport;

    /**
     * @param {string} channel
     * @param {function(channel:string, message:{channel:string, id:string, data:object, sender:object})} callback
     * @description msg - {channel, id, data: message,}
     */
    on(channel: string, callback: Function): void;

    /**
     * @param {string} channel
     * @param {object} message
     * @return {Promise<void>}
     */
    send(channel: string, message: object): Promise<void>;

    /**
     * @return {string}
     */
    toString(): string;
}

//# sourceMappingURL=Transport.d.ts.map