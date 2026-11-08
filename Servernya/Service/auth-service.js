
const { getDb } = require('../Config/db.js');
const { buatError } = require('../Utils/menu.js');

function getUsersCollection() {
    return getDb().collection('Users');
}

async function registerUser(username, password) {
    const usersCollection = getUsersCollection();

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

async function loginUser(username, password) {
    const usersCollection = getUsersCollection();

    const user = await usersCollection.findOne({ username: username.trim() });
    if (!user) {
        throw buatError(401, 'Username atau password salah');
    }

    if (user.password !== password) {
        throw buatError(401, 'Username atau password salah');
    }

    return user;
}

module.exports = {
    registerUser,
    loginUser
};
