'use strict';
const Nightmare = require('nightmare');
const Promise = require('bluebird');

Nightmare.action('scrollDown', function (done) {
    this.evaluate_now(() => {
        window.scrollTo(0, document.body.scrollHeight);
    }, done);
});

const nightmare = Nightmare({
    show: true,
    Promise: require('bluebird')
});

const DOUBAN_URL = exports.DOUBAN_URL = {
    home: 'https://www.douban.com',
    daily: 'https://m.douban.com/selection/theme/17?dt_dapp=1',
    login: 'https://www.douban.com/accounts/login',
    following: 'https://www.douban.com/contacts/list'
};

// todo save cookies to local file
const login = exports.login = (email, password) => {
    return nightmare
        .goto(DOUBAN_URL.login)
        .type('#email', email)
        .type('#password', password)
        .click('.btn-submit')
        .wait(5000)
        .cookies.get({
            path: '/'
        });
};

const follow = exports.follow = (userPage, groupID) => {
    userPage = userPage.match(/https:\/\/www.douban.com\/people\/[^\/]*\//g)[0];

    return nightmare.goto(userPage)
        .evaluate(() => { // is following
            return document.querySelector('.user-cs') &&
                document.querySelector('.user-cs').innerText === '已关注';
        })
        .then((rst) => { // follow
            if (!rst)
                return nightmare.click('.add_contact')
                    .wait('#follow-msg-submit')
                    .click('#follow-msg-submit')
                    .wait('.user-cs');
            else
                return null;
        })
        .then(() => { // is in group
            return nightmare.evaluate((groupID) => {
                return document.getElementById('g' + groupID).checked;
            }, groupID);
        })
        .then((rst) => { // add to group
            if (!rst)
                return nightmare.click('.user-group-arrow')
                    .click('#g' + groupID);
            else
                return null;
        }).then(() => {
            return nightmare.wait(20000);
        });
};

const group = exports.group = (groupName) => {
    return nightmare
        .goto(DOUBAN_URL.following)
        .evaluate((groupName) => {
            const groups = Array
                .from(document.querySelectorAll('.menu-list li a'));
            const idx = groups.findIndex(function (ele) {
                return ele.innerText === groupName;
            });
            if (idx == -1)
                return null;
            return parseInt(groups[idx].href.match(/tag=(\d.*)/)[1]);
        }, groupName)
        .then((groupID) => {
            if (groupID === null) {
                return nightmare
                    .evaluate(() => {
                        return document.querySelectorAll('.menu-list li').length;
                    }).then((groupCount) => {
                        return nightmare.click('#add-new-group')
                            .wait('#new-group-name')
                            .type('#new-group-name', groupName)
                            .click('#create-group-submit')
                            .wait((groupCount) => {
                                return document.querySelectorAll('.menu-list li').length > groupCount;
                            }, groupCount);
                    })
                    .then(() => group(groupName));
            }
            return groupID;
        });
};

const daily = exports.daily = (page) => {
    return nightmare.goto(page)
        .evaluate(() => {
            const selector = ".neo-root > div > .neo-status > a";
            return Array.from(document.querySelectorAll(selector))
                .map((ele) => ele.href);
        }).then((pages) => {
            return Promise.mapSeries(pages, (page) => {
                return nightmare.goto(page).evaluate(() => {
                    return document.URL;
                });
            });
        });
};

const allDailyPages = exports.allDailyPages = () => {
    nightmare.goto(DOUBAN_URL.daily);
    let itemCount = 0;
    function scrollToTheEnd() {
        return nightmare.scrollDown().wait(2000).evaluate(() => {
            const selector = ".Theme-item > a";
            return document.querySelectorAll(selector).length;
        }).then((count) => {
            if (count > itemCount) {
                itemCount = count;
                return scrollToTheEnd();
            }
            else
                return nightmare.evaluate(() => {
                    const selector = ".Theme-item > a";
                    return Array.from(document.querySelectorAll(selector))
                        .map((ele) => ele.href);
                });
        });
    };
    return scrollToTheEnd();
};
