/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */

/**
 * @param {object|string} msg
 * @return {object}
 */
const parse = (msg) => msg.constructor === ''.constructor ? JSON.parse(msg) : msg;
const getRandomUID = () => Math.random().toString(16).substring(2);
/**
 * @param {number} ms
 * @return {Promise<number>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    getRandomUID,
    parse,
    sleep,
}