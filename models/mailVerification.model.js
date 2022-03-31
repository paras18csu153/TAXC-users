const mongoose = require('mongoose');
var Schema = mongoose.Schema;

let mailverificationcodeSchema = new Schema({
    verification_link: {
        type: String,
        required: [true, 'Verification Link is required.']
    },
}, {
    timestamps: true
});

var MailVerification = (module.exports = mongoose.model('MailVerificationCode', mailverificationcodeSchema));

// Create Phone Verification Code
module.exports.create = async (verification_code) => {
    verification_code = await verification_code.save();
    return verification_code;
}

// Get By Verification Link
module.exports.getByVerificationLink = async (verification_link) => {
    var verification_code = await MailVerification.findOne({
        verification_link: verification_link
    });
    return verification_code;
}

// Find Verfication Link
module.exports.findByVerificationLink = async (verification_link) => {
    verification_code = await MailVerification.findOne({
        verification_link: verification_link
    });
    return verification_code;
}

// Delete By Verification Link
module.exports.deleteAllByVerificationLink = async (verification_code) => {
    var verification_code = await MailVerification.deleteMany({
        verification_link: verification_code.verification_link
    });
    return verification_code;
}

// Delete Invalid Verification Links
module.exports.deleteAllByTime = async (timestamp) => {
    timestamp = timestamp - 86400000;
    var verification = await MailVerification.deleteMany({
        createdAt: {
            $lt: timestamp
        },
    });
    return verification;
};