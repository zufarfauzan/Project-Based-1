const { kirimError } = require('../Utils/menu.js');
const menuController = require('../Controller/menu-controller.js');

async function menuRouter(req, res, segmen) {
    // Jalur endpoint: segmen[1] mengambil segmen setelah '/menu'
    const endpoint = segmen[1];

    if (endpoint === 'search') {
        if (req.method === 'GET') {
            return await menuController.searchFoods(req, res);
        } else {
            res.setHeader('Allow', 'GET');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint pencarian makanan`);
        }
    }

    if (endpoint === 'manual') {
        if (req.method === 'POST') {
            return await menuController.FoodAdd(req, res);
        } else {
            res.setHeader('Allow', 'POST');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint penambahan makanan`);
        }
    }

    if (endpoint === 'history') {
        if (req.method === 'GET') {
            return await menuController.getFoodHistory(req, res);
        } else if (req.method === 'DELETE') {
            const foodId = segmen[2]; // Jika ada ID di path seperti /menu/history/:id
            return await menuController.deleteFoodHistory(req, res, foodId);
        } else {
            res.setHeader('Allow', 'GET, DELETE');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint history makanan`);
        }
    }

    if (endpoint === 'summary') {
        if (req.method === 'GET') {
            return await menuController.getNutritionSummary(req, res);
        } else {
            res.setHeader('Allow', 'GET');
            return kirimError(res, 405, `Method ${req.method} tidak didukung untuk endpoint ringkasan nutrisi`);
        }
    }

    return kirimError(res, 404, 'Endpoint menu tidak ditemukan');
}

module.exports = menuRouter;
