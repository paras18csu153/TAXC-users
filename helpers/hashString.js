const crypto = require('crypto');

function hashString(str) {
    var hash = crypto.createHash('md5').update(str).digest('hex');
    return hash;
}

module.exports = hashString;