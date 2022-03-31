const otpGenerator = require('otp-generator');

var PhoneVerificationCode = require('../models/phoneVerification.model');

async function sendOtpToPhone(user) {
    if (!user.phoneVerified) {
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

        var verification_code = new PhoneVerificationCode({
            phone: user.phone,
            otp: r
        });

        verification_code = await PhoneVerificationCode.create(verification_code);
        console.log('Redirecting to verification page...');
    }
}

module.exports = sendOtpToPhone;