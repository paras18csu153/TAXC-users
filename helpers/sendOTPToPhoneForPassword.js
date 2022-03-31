const otpGenerator = require('otp-generator');

var ForgetPasswordOTP = require('../models/forgetPasswordOTP.model');

async function sendOtpToPhoneForPassword(user) {
    var r = otpGenerator.generate(6, {
        digits: true,
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false
    });

    const accountSid = process.env.ACCOUNT_SID;
    const authToken = process.env.AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    client.messages
        .create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: user.phone,
            body: 'Hi ' + user.name + ', Your Verification code for TAXC is: ' + r + ' and is valid for only 10 minutes.'
        })
        .then(message => console.log(message.sid))
        .done();

    var verification_code = new ForgetPasswordOTP({
        phone: user.phone,
        otp: r
    });

    verification_code = await ForgetPasswordOTP.create(verification_code);
    console.log('Redirecting to verification page...');
}

module.exports = sendOtpToPhoneForPassword;