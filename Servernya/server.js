const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { connectToDb } = require('./Config/db.js');
const { kirimError } = require('./Utils/menu.js');

const PORT = 3000;

// Hubungkan ke database MongoDB Atlas terlebih dahulu sebelum server dijalankan
connectToDb((err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err);
        process.exit(1);
    }

    console.log('Berhasil terhubung ke database MongoDB Atlas!');
    const authRouter = require('./Route/auth-route');
    const menuRouter = require('./Route/menu-route');

    // Fungsi Router Utama
    async function mainRouter(req, res) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const segmen = url.pathname.split('/').filter(Boolean);

        // Jika path berawalan 'auth', arahkan ke authRouter
        if (segmen[0] === 'auth') {
            return await authRouter(req, res, segmen);
        }
        // Jika path berawalan 'menu', arahkan ke menuRouter
        if (segmen[0] === 'menu') {
            return await menuRouter(req, res, segmen);
        }

        // Default jika endpoint tidak ditemukan
        return kirimError(res, 404, 'Endpoint API tidak ditemukan');
    }

    const server = http.createServer(async (req, res) => {
        console.log(`${new Date().toISOString()} | Method: ${req.method} | URL: ${req.url}`);

        try {
            await mainRouter(req, res);
        } catch (err) {
            console.error(err);
            if (!res.headersSent) {
                kirimError(res, 500, 'Terjadi kesalahan pada server');
            }
        }
    });

    server.listen(PORT, () => {
        console.log(`Server NutriCheck berjalan di http://localhost:${PORT}`);
    });
});
