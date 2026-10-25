// Service/authService.js
const { getDb } = require('../Config/db.js');
const { buatError } = require('../Utils/menu.js');

function getUsersCollection() {
    return getDb().collection('Users');
}

// Fungsi untuk registrasi user baru ke koleksi Users
async function registerUser(username, password) {
    const usersCollection = getUsersCollection();

    // Cek apakah username sudah digunakan
    const existingUser = await usersCollection.findOne({ username: username.trim() });
    if (existingUser) {
        throw buatError(400, 'Username sudah terdaftar, silakan gunakan username lain');
    }

    const newUser = {
        username: username.trim(),
        password: password,
        createdAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    return result;
}

// Fungsi untuk verifikasi login user
async function loginUser(username, password) {
    const usersCollection = getUsersCollection();

    // Cari user berdasarkan username
    const user = await usersCollection.findOne({ username: username.trim() });
    if (!user) {
        throw buatError(401, 'Username atau password salah');
    }

    // Validasi password
    if (user.password !== password) {
        throw buatError(401, 'Username atau password salah');
    }

    return user;
}

module.exports = {
    registerUser,
    loginUser
};
