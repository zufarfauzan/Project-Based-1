const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Secret key rahasia yang hanya diketahui oleh server (simpan di Environment Variable)
const SECRET_KEY = process.env.SECRET_KEY || 'ambatron48';

function createToken(user) {
    const payload = {
        id: user._id ? user._id.toString() : user.id,
        username: user.username
    };

    // Token kedaluwarsa dalam 24 jam
    const options = { expiresIn: '24h' };

    // Membuat token
    const token = jwt.sign(payload, SECRET_KEY, options);
    return token;
}

function verifyToken(token) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
}

module.exports = { createToken, verifyToken };
