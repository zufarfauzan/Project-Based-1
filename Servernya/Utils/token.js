const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY || 'ambatron48';

function createToken(user) {
    const payload = {
        id: user && (user._id ? user._id.toString() : user.id),
        username: user && (user.username || user)
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '24h' });
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
