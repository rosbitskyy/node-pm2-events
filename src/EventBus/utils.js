/*
 * Copyright (c) 2023.
 * @author: 🇺🇦Rosbitskyy Ruslan
 * @email: rosbitskyy@gmail.com
 */


const parse = (msg) => msg.constructor === ''.constructor ? JSON.parse(msg) : msg;
const getRandomUID = () => Math.random().toString(16).substring(2);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    getRandomUID,
    parse,
    sleep,
}