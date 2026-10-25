// Route/auth-route.js
const authController = require('../Controller/auth-controller.js');
const { kirimError } = require('../Utils/menu.js');

async function authRouter(req, res, segmen) {
    // Jalur endpoint: /auth/register atau /auth/login
    const endpoint = segmen[1]; // Mengambil segmen setelah '/auth'

    if (endpoint === 'register') {
        if (req.method === 'POST') {
            return await authController.register(req, res);
        } else {
            res.setHeader('Allow', 'POST');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint registrasi`);
        }
    }

    if (endpoint === 'login') {
        if (req.method === 'POST') {
            return await authController.login(req, res);
        } else {
            res.setHeader('Allow', 'POST');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint login`);
        }
    }

    return kirimError(res, 404, 'Endpoint autentikasi tidak ditemukan');
}

module.exports = authRouter;
