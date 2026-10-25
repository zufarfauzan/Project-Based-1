const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const { kirimError } = require('../Utils/menu.js');

const SECRET_KEY = process.env.SECRET_KEY || process.env.JWT_SECRET || 'ambatron48';

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        kirimError(res, 401, 'Token autentikasi tidak ditemukan. Harap login terlebih dahulu.');
        return false;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedUser = jwt.verify(token, SECRET_KEY);
        req.user = decodedUser;
        if (typeof next === 'function') {
            next();
        }
        return true;
    } catch (err) {
        kirimError(res, 401, 'Token tidak valid atau kedaluwarsa');
        return false;
    }
}

function extractUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (err) {
        return null;
    }
}

module.exports = { verifyToken, extractUser };
