/*
 *  Copyright (c) 2023.
 *  @Author: 🇺🇦Rosbitskyy Ruslan
 *  @email: rosbitskyy@gmail.com
 */

const EventBus = require('./EventBus')
const Pm2Events = require('./Pm2Events')
const RedisEvents = require('./RedisEvents')
const Events = {
    get internal() {
        return EventBus
    },
    get Pm2() {
        return Pm2Events
    },
    get Redis() {
        return RedisEvents
    },
};
module.exports = Events;