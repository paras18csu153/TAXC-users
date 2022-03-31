const schedule = require('node-schedule');

const ForgetPasswordOTP = require('../models/forgetPasswordOTP.model');
const MailVerification = require('../models/mailVerification.model');
const PhoneVerification = require('../models/phoneVerification.model');

function scheduler() {
    const job = schedule.scheduleJob('30 2 * * *', function () {
        var currentTimestamp = Date.now();
        ForgetPasswordOTP.deleteAllByTime(currentTimestamp);
        MailVerification.deleteAllByTime(currentTimestamp);
        PhoneVerification.deleteAllByTime(currentTimestamp);
    });
}

module.exports = scheduler;