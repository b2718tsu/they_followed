const douban = require('./index');
const Promise = require('bluebird');

let groupID;
douban.login().then(() => {
    return douban.group('广播精选');
}).then((gid) => {
    groupID = gid;
    return douban.allDailyPages();
}).then((links) => {
    return Promise.mapSeries(links, (link) => {
        return douban.daily(link).then((pages) => {
            return Promise.mapSeries(pages, (page) => {
                return douban.follow(page, groupID);
            });
        });
    });
});
