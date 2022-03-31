const nodemailer = require('nodemailer');

var MailVerificationCode = require('../models/mailVerification.model');

const hashString = require('./hashString');

// async..await is not allowed in global scope, must use a wrapper
async function sendVerificationMail(host_url, user) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_ACCOUNT,
            pass: process.env.MAIL_PASSWORD
        }
    });

    var hash = hashString(user.username);
    var verification_link = host_url + '/verify/' + hash;

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: process.env.MAIL_ACCOUNT, // sender address
        to: user.email, // list of receivers
        subject: 'Verification Mail', // Subject line
        html: "<h3>Hi " + user.name + ", </h3><p>Your Verification link is:</p><a href='" +
            verification_link +
            "'>" +
            verification_link +
            "</a><p>and is valid for 24 hours.</p>", // html body
    }, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });

    var verification = new MailVerificationCode({
        verification_link: hash,
    });

    var existing_verification = await MailVerificationCode.findByVerificationLink(verification.verification_link);

    if (!!!existing_verification) {
        verification = await MailVerificationCode.create(verification)
    };
}

module.exports = sendVerificationMail;