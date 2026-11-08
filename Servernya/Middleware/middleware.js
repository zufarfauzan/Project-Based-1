const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const { kirimError } = require('../Utils/menu.js');
const { getDb } = require('../Config/db.js');

const SECRET_KEY = process.env.SECRET_KEY || 'ambatron48';

async function verifyToken(req, res) {
    if (req.user) return true;

    const authHeader = req.headers['authorization'] || req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        kirimError(res, 401, 'Token tidak ditemukan. Harap login terlebih dahulu.');
        return false; 
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
        kirimError(res, 401, 'Token tidak ditemukan. Harap login terlebih dahulu.');
        return false;
    }

    try {
        const decodedUser = jwt.verify(token, SECRET_KEY);
        if (!decodedUser || (!decodedUser.id && !decodedUser._id && !decodedUser.username)) {
            kirimError(res, 401, 'Token tidak valid atau kedaluwarsa');
            return false;
        }

        // Verifikasi ke database Users: memastikan pengguna benar-benar terdaftar
        try {
            const db = getDb();
            if (db) {
                const query = {};
                if (decodedUser.username) {
                    query.username = decodedUser.username;
                }
                const existingUser = await db.collection('Users').findOne(query);
                if (!existingUser) {
                    kirimError(res, 401, 'Token tidak valid: Pengguna tidak terdaftar');
                    return false;
                }
                req.user = {
                    id: existingUser._id.toString(),
                    _id: existingUser._id,
                    username: existingUser.username
                };
                return true;
            }
        } catch (dbErr) {
            console.error('Verifikasi user DB gagal:', dbErr);
        }

        req.user = decodedUser;
        return true;
    } 
    catch (err) {
        kirimError(res, 401, 'Token tidak valid atau kedaluwarsa');
        return false; 
    }
}

module.exports = { verifyToken };
