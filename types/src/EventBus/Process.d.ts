import {NetworkInterfaceInfo} from "os";

export = Process;

declare class Process {
    /**
     * @type {number}
     */
    static "__#1@#unrealId": number;
    /**
     * @type {number}
     */
    static "__#1@#process_id": number;
    /**
     * @type {string}
     */
    static "__#1@#process_name": string;
    /**
     * @return {object|NetworkInterfaceInfo}
     */
    static "__#1@#_interface": () => object | NetworkInterfaceInfo;
    static "__#1@#interface": any;
    /**
     * @type {string}
     */
    static "__#1@#id": string;
    /**
     * @return {number[]}
     */
    static getInstansesIds: () => number[];
    /**
     * @type {number}
     */
    static "__#1@#masterProcessId": number;

    /**
     * @return {number}
     */
    static get masterProcessId(): number;

    /**
     * @return {number}
     */
    static get unrealId(): number;

    /**
     * @return {number}
     */
    static get process_id(): number;

    /**
     * @return {string}
     */
    static get process_name(): string;

    /**
     * @return {string}
     */
    static get id(): string;

    /**
     * @return {{address: string;
     *         netmask: string;
     *         mac: string;
     *         internal: boolean;
     *         cidr: string | null;
     *         family: string;
     *         scopeid?: undefined;
     *         }|NetworkInterfaceInfo}
     */
    static get interface(): object | NetworkInterfaceInfo;

    /**
     * @deprecated - since v1.2.32
     * @return {boolean}
     */
    static get isPm2Master(): boolean;

    /**
     * is PM2 primary instance (for current pm2 VM, not decentralized)
     * in case of local launch without PM2 - always true
     * @return {boolean}
     */
    static get isPm2Primary(): boolean;
}

//# sourceMappingURL=Process.d.ts.map