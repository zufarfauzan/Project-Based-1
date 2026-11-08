const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const { verifyToken } = require('./Middleware/middleware.js');
const { connectToDb } = require('./Config/db.js');
const { kirimError } = require('./Utils/menu.js');

const PORT = 3000;

connectToDb((err) => {
    if (err) {
        console.error('Gagal terhubung ke database:', err);
        process.exit(1);
    }

    const authRouter = require('./Route/auth-route.js');
    const menuRouter = require('./Route/menu-route.js');

    async function mainRouter(req, res) {
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const segmen = url.pathname.split('/').filter(Boolean);

        if (segmen[0] === 'auth') {
            return await authRouter(req, res, segmen);
        }

        if (segmen[0] === 'menu') {
            if (!await verifyToken(req, res)) return;
            return await menuRouter(req, res, segmen);
        }

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
        console.log("\nMuh. Zufar Fauzan\tF5512520074\nNanda Chairunnisa\tF5512520041\nJuan Terrin K. Samatimbang\tF5512520051\n"
            + "Mutiara Fajarianti\tF55125200\n Muh. Rizky Jumadil M.\tF5512520045")
    });
});
