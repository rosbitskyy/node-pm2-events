/*
 *  Copyright (c) 2023.
 *  @Author: 🇺🇦Rosbitskyy Ruslan
 *  @email: rosbitskyy@gmail.com
 */

const Events = require('./index');

const Config = {
    redis: {
        host: 'localhost',
        password: "your password",
        keepAlive: true,
        port: 6379
    },
}

const sleep = () => new Promise(resolve => setTimeout(resolve, this));

async function doit() {

    // 1
    // PM@ test
    const channelName1 = 'AweSome Channel Or Event Name #1';
    const channelName2 = 'AweSome Channel Or Event Name #2';
    const channelName3 = 'AweSome Channel Or Event Name #3';

    const pm2 = new Events.Pm2({...Config.redis, debug: true});
    pm2.addEventListener(channelName1);

    await sleep(2000);
    pm2.dispatch(channelName1, {awesome: 'something'});


    // 2
    // Redis test
    const connect1 = new Events.Redis('server-1', {...Config.redis});
    connect1.onMessage(async (channel, message) => {
        console.log(connect1.originatorId, 'receive message', channel, message)
    }).subscribe(channelName1);
    connect1.subscribe(channelName2);
    connect1.subscribe(channelName3);

    const connect2 = new Events.Redis('server-2', {...Config.redis});
    connect2.onMessage(async (channel, message) => {
        console.log(connect2.originatorId, 'receive message', channel, message)
    }).subscribe(channelName1);
    connect2.subscribe(channelName2);
    connect2.subscribe(channelName3);

    //
    let count = 0;
    const timer = setInterval(() => {
        const v = {action: 'action1'}, v2 = {action: 'some else'};
        connect1.publish(channelName1, v);
        connect2.publish(channelName1, v2);
        connect1.publish(channelName2, v);
        connect2.publish(channelName3, v2);
        if (count++ > 10) process.exit();
    }, 100);

}

doit();