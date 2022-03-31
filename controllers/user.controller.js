const axios = require('axios');
const formidable = require('formidable');
const PasswordHash = require('password-hash');

const ForgetPasswordOTP = require('../models/forgetPasswordOTP.model');
const MailVerification = require('../models/mailVerification.model');
const PhoneVerification = require('../models/phoneVerification.model');
const User = require('../models/user.model');

const hashString = require('../helpers/hashString');
const sendOtpToPhone = require('../helpers/sendOTPToPhone');
const sendOtpToPhoneForPassword = require('../helpers/sendOTPToPhoneForPassword');
const sendVerificationMail = require('../helpers/sendVerificationMail');

const secret = process.env.SECRET;
const token_service_url = process.env.TOKEN_SERVICE_URL;

// Create User
exports.register = async (req, res) => {
    // Convert request body to user
    var user = new User(req.body);

    // Check if user already exists
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!existing_user) {
            if (existing_user.username == user.username) {
                return res.status(409).send({
                    message: 'Username already exists.'
                });
            } else if (existing_user.email == user.email) {
                return res.status(409).send({
                    message: 'Email already exists.'
                });
            } else {
                return res.status(409).send({
                    message: 'Phone already exists.'
                });
            }
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Save User
    try {
        user = await User.create(user);
    } catch (err) {
        if (!!err.errors) {
            var errors = Object.values(err.errors);
            return res.status(400).send({
                message: errors[errors.length - 1].properties.message
            });
        } else {
            return res.status(500).send({
                message: 'Internal Server Error.'
            });
        }
    }

    // Send Verification Message
    try {
        sendOtpToPhone(user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    // Send Verification Mail
    try {
        var host_url = req.protocol + '://' + req.get('host') + '/users';
        sendVerificationMail(host_url, user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    // Request for Token Service
    var req_body = {
        'secret': secret,
        'username': user.username
    };

    // Hash Secret
    req_body.secret = hashString(req_body.secret);

    // Token Genration
    var token_service = await axios.put(token_service_url, req_body).catch((err) => {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    });

    var token = token_service.data.token;

    res.header('authorization', token);
    return res.status(200).send(user);
}

// Make Avatar
exports.avatar = async (req, res) => {
    const form = formidable({
        filename: (name, ext) => {
            return req.params['username'] + ext;
        },
        keepExtensions: true,
        multiples: false,
        uploadDir: 'uploads/'
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(409).send({
                message: 'Some error occured.'
            });
        }

        return res.status(200).send({
            message: 'File Uploaded Successfully.'
        });
    });
}

// User Login
exports.login = async (req, res) => {
    // Convert request body to user
    var user = req.body;

    // Data Validation
    if (!user.username) {
        return res.status(400).send({
            message: 'Username is required.'
        });
    }

    if (!user.password) {
        return res.status(400).send({
            message: 'Password is required.'
        });
    }

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Check Login Credentials
    if (!PasswordHash.verify(user.password, existing_user.password)) {
        return res.status(401).send({
            message: 'Unauthorized Access.'
        });
    }

    if (!existing_user.phoneVerified) {
        // Send Verification Message
        try {
            sendOtpToPhone(existing_user);
        } catch (err) {
            return res.status(500).send({
                message: 'Internal Server Error.',
            });
        }
    }

    if (!existing_user.emailVerified) {
        // Send Verification Mail
        try {
            var host_url = req.protocol + '://' + req.get('host') + '/users';
            sendVerificationMail(host_url, existing_user);
        } catch (err) {
            return res.status(500).send({
                message: 'Internal Server Error.',
            });
        }
    }

    // Request for Token Service
    var req_body = {
        'secret': secret,
        'username': existing_user.username
    }

    // Hash Secret
    req_body.secret = hashString(req_body.secret);

    // Token Genration
    var token_service = await axios.put(token_service_url, req_body).catch((err) => {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    });

    var token = token_service.data.token;

    res.header('authorization', token);
    return res.status(200).send(existing_user);
}

// Verify Phone Number
exports.verifyPhone = async (req, res) => {
    var phone_verification_code = req.body;

    if (!phone_verification_code.otp) {
        return res.status(400).send({
            message: 'OTP is required.'
        });
    }

    try {
        var existing_phone_verification_code = await PhoneVerification.getByOTP(phone_verification_code.otp);
        if (!!!existing_phone_verification_code) {
            return res.status(404).send({
                message: 'Invalid OTP.'
            });
        }

        if (Date.now() - existing_phone_verification_code.createdAt >= 600000) {
            return res.status(400).send({
                message: 'Invalid OTP.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    var user = {
        username: phone_verification_code.username
    };

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    if (existing_user.phoneVerified) {
        return res.status(409).send({
            message: 'User phone already verified.'
        });
    }

    if (existing_phone_verification_code.phone != existing_user.phone) {
        return res.status(400).send({
            message: 'Invalid OTP.'
        });
    }

    // Check User and Update
    try {
        var existing_user = await User.verifyPhone(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Delete Verification Code
    try {
        existing_phone_verification_code = await PhoneVerification.deleteAllByPhone(existing_phone_verification_code.phone);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

// Verify Mail
exports.verifyMail = async (req, res) => {
    var mail_verification_code = req.params['verification_link'];

    try {
        var existing_mail_verification_code = await MailVerification.getByVerificationLink(mail_verification_code);
        if (!!!existing_mail_verification_code) {
            return res.status(404).send({
                message: 'Invalid Verification Link.'
            });
        }

        if (Date.now() - existing_mail_verification_code.createdAt >= 86400000) {
            return res.status(400).send({
                message: 'Invalid Verification Link.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    var user = {
        username: req.body.username
    };

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    if (existing_user.emailVerified) {
        return res.status(409).send({
            message: 'User email already verified.'
        });
    }

    if (existing_mail_verification_code.verification_link != hashString(req.body.username)) {
        return res.status(400).send({
            message: 'Invalid Verification Link.'
        });
    }

    // Check User and Update
    try {
        var existing_user = await User.verifyMail(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Delete Verification Code
    try {
        existing_mail_verification_code = await MailVerification.deleteAllByVerificationLink(existing_mail_verification_code);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

// Get My Profile
exports.getMyprofile = async (req, res) => {
    var username = req.params['username'];

    var user = {
        username: username
    };

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

// Get Profile Phone Verified
exports.getProfileVerified = async (req, res) => {
    var username = req.params['username'];

    var user = {
        username: username
    };

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send({
        'isPhoneVerified': existing_user.phoneVerified
    });
}

// Update Ratings
exports.updateRatings = async (req, res) => {
    var user = req.body;

    if (!!!user.rating) {
        return res.status(400).send({
            message: 'Rating cannot be empty.'
        });
    }

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    if (!!!existing_user.rated_by) {
        existing_user.rated_by = 0;
    }

    var current_rating = existing_user.rating * existing_user.rated_by;
    if (!!!current_rating) {
        current_rating = 0;
    }

    existing_user.rated_by = existing_user.rated_by + 1;
    existing_user.rating = (current_rating + user.rating) / (existing_user.rated_by);

    // Check User and Update
    try {
        existing_user = await User.updateUser(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

// Change Password
exports.changePassword = async (req, res) => {
    // Convert request body to user
    var user = req.body;

    // Data Validation
    if (!user.oldPassword) {
        return res.status(400).send({
            message: 'Old Password is required.'
        });
    }

    if (!user.password) {
        return res.status(400).send({
            message: 'Password is required.'
        });
    }

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Check Login Credentials
    if (!PasswordHash.verify(user.oldPassword, existing_user.password)) {
        return res.status(401).send({
            message: 'Unauthorized Access.'
        });
    }

    // Change current password
    existing_user.password = user.password;

    // Change Password
    try {
        existing_user = await User.changePassword(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

// Forgot Password Message
exports.forgotPasswordMessage = async (req, res) => {
    // Convert request body to user
    var user = req.body;

    // Data Validation
    if (!user.username) {
        return res.status(400).send({
            message: 'Username is required.'
        });
    }

    if (!user.phone) {
        return res.status(400).send({
            message: 'Email is required.'
        });
    }

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernameAndPhone(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Send Verification Message
    try {
        sendOtpToPhoneForPassword(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    res.status(200).send({
        'message': 'Forgot Password Message Successfully Sent.'
    });
}

// Forgot Password
exports.forgotPassword = async (req, res) => {
    // Convert request body to user
    var user = req.body;

    if (!user.username) {
        return res.status(400).send({
            message: 'Username is required.'
        });
    }

    if (!user.otp) {
        return res.status(400).send({
            message: 'OTP is required.'
        });
    }

    if (!user.password) {
        return res.status(400).send({
            message: 'Password is required.'
        });
    }

    try {
        var existing_phone_verification_code = await ForgetPasswordOTP.getByOTP(user.otp);
        if (!!!existing_phone_verification_code) {
            return res.status(404).send({
                message: 'Invalid OTP.'
            });
        }

        if (Date.now() - existing_phone_verification_code.createdAt >= 600000) {
            return res.status(400).send({
                message: 'Invalid OTP.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.',
        });
    }

    // Check if user doesn't exist
    try {
        var existing_user = await User.getByUsernamePhoneEmail(user);
        if (!!!existing_user) {
            return res.status(404).send({
                message: 'User not found.'
            });
        }
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    existing_user.password = user.password;

    // Change Password
    try {
        existing_user = await User.changePassword(existing_user);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    // Delete Verification Code
    try {
        existing_phone_verification_code = await ForgetPasswordOTP.deleteAllByPhone(existing_phone_verification_code.phone);
    } catch (err) {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    }

    return res.status(200).send(existing_user);
}

exports.logout = async (req, res) => {
    // Set Header
    axios.defaults.headers.common['authorization'] = req.headers['authorization'];

    // Token Deletion if verified
    var token_service = await axios.delete(token_service_url).catch((err) => {
        return res.status(500).send({
            message: 'Internal Server Error.'
        });
    });

    // Return Logged out successfully
    return res.status(200).send({
        message: 'Logged Out Successfully.'
    });
};