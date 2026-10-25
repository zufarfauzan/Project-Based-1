const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

// Connection String MongoDB Atlas
const usernameDB = process.env.usernameDB;
const passwordDB = process.env.passwordDB;
const namaDB = process.env.namaDB;
const uri = `mongodb+srv://${usernameDB}:${passwordDB}@cluster0.oznru4g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let dbConnection;

module.exports = {
  connectToDb: (cb) => {
    MongoClient.connect(uri)
      .then((client) => {
        dbConnection = client.db(namaDB);
        console.log("Berhasil terhubung ke MongoDB Atlas!");
        return cb();
      })
      .catch((err) => {
        console.error("Gagal terhubung ke database:", err);
        return cb(err);
      });
  },
  getDb: () => dbConnection
};
