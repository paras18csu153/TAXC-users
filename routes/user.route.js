var express = require('express');
var router = express.Router();

const auth = require('../middlewares/auth.middleware');
const user_controller = require('../controllers/user.controller');

/* Create User. */
router.post('/register', user_controller.register);

/* Make Avatar. */
router.put('/:username/avatar', auth, user_controller.avatar);

/* User Login. */
router.post('/', user_controller.login);

/* Verify Phone. */
router.patch('/verifyPhone', auth, user_controller.verifyPhone);

/* Verify Mail. */
router.post('/verifyMail/:verification_link', auth, user_controller.verifyMail);

/* Get My Profile. */
router.get('/:username', auth, user_controller.getMyprofile);

/* Get Profile Phone Verified. */
router.get('/:username/isPhoneVerified', user_controller.getProfileVerified);

/* Update User Ratings. */
router.put('/', auth, user_controller.updateRatings);

/* Change Password. */
router.patch('/changePassword', auth, user_controller.changePassword);

/* Forgot Password Message. */
router.post('/forgetPasswordMessage', user_controller.forgotPasswordMessage);

/* Forgot Password. */
router.patch('/forgetPassword', user_controller.forgotPassword);

/* User Logout. */
router.post('/logout', auth, user_controller.logout);

module.exports = router;