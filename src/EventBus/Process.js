/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */


const {execSync} = require("child_process");
const {parse, getRandomUID} = require('./utils');

class Process {

    /**
     * @type {number}
     */
    static #unrealId = Number(`0x${getRandomUID()}`);
    /**
     * @type {number}
     */
    static #process_id = Number(process.env.pm_id || Process.unrealId);
    /**
     * @type {string}
     */
    static #process_name = String(process.env.name || getRandomUID());
    /**
     * @type {string}
     */
    static #id = ([Process.interface.mac, Process.interface.address, Process.process_name,
        Process.process_id, getRandomUID()].toString().replaceAll(/[^0-9a-f]/g, ''));

    /**
     * @return {number}
     */
    static get masterProcessId() {
        return Number(Process.#masterProcessId);
    }

    /**
     * @return {number}
     */
    static get unrealId() {
        return Number(Process.#unrealId);
    }

    /**
     * @return {number}
     */
    static get process_id() {
        return Number(Process.#process_id);
    }

    /**
     * @return {string}
     */
    static get process_name() {
        return Process.#process_name;
    }
    static #interface = Process.#_interface();

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
    static get interface() {
        return Process.#interface;
    }

    /**
     * @return {string}
     */
    static get id() {
        return this.#id;
    }

    /**
     * @return {object|NetworkInterfaceInfo}
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

    /**
     * @return {number[]}
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
     * @deprecated - since v1.2.32
     * @return {boolean}
     */
    static get isPm2Master() {
        return Process.isPm2Primary;
    }

    /**
     * is PM2 primary instance (for current pm2 VM, not decentralized)
     * in case of local launch without PM2 - always true
     * @return {boolean}
     */
    static get isPm2Primary() {
        return Process.masterProcessId === Process.process_id || Process.process_id === Process.unrealId;
    }

}

module.exports = Process;