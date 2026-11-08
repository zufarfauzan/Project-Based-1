const foodService = require("../Service/menu-service.js");
const { bacaBody, kirimJSON, kirimError } = require('../Utils/menu.js');
const { verifyToken } = require('../Middleware/middleware.js');
const { InputanAddFood } = require('../Validation/validation.js');

// Controller untuk Menu 1: Pencarian Makanan
async function searchFoods(req, res) {
  try {

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const keyword = url.searchParams.get("q")?.trim();

    if (!keyword || keyword.length < 2) {
      return kirimError(res, 400, "Kata pencarian minimal 2 karakter");
    }

    if (keyword.length > 100) {
      return kirimError(res, 400, "Kata pencarian maksimal 100 karakter");
    }

    const foods = await foodService.searchFoods(keyword);

    return kirimJSON(res, 200, {
      message: "Pencarian berhasil",
      count: foods.length,
      data: foods
    });
  } 
  catch (error) {
    console.error("searchFoods error:", error);
    return kirimError(res, error.statusCode || 500, error.message || "Gagal mencari makanan");
  }
}

async function FoodAdd(req, res) {
  try {

    const input = await bacaBody(req);
    InputanAddFood(input);

    const result = await foodService.AddFood(input, req.user);
    return kirimJSON(res, 201, { 
      message: 'Makanan berhasil ditambahkan',
      data: result
    });
  } 
  catch (err) {
    return kirimError(res, err.statusCode || 500, err.message);
  }
}

// Controller untuk Menu 3: Tampilkan History Makanan
async function getFoodHistory(req, res) {
  try {
    if (!await verifyToken(req, res)) return;

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const date = url.searchParams.get("date")?.trim();
    const all = url.searchParams.get("all") === "true";

    const foods = await foodService.getFoodHistory(req.user, { date, all });

    return kirimJSON(res, 200, {
      message: "Riwayat makanan berhasil diambil",
      count: foods.length,
      data: foods
    });
  } 
  catch (error) {
    console.error("getFoodHistory error:", error);
    return kirimError(res, error.statusCode || 500, error.message || "Gagal mengambil riwayat makanan");
  }
}

async function getNutritionSummary(req, res) {
  try {

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const date = url.searchParams.get("date")?.trim();

    const summary = await foodService.getNutritionSummary(req.user, date);

    return kirimJSON(res, 200, {
      message: "Ringkasan nutrisi berhasil diambil",
      data: summary
    });
  } 
  catch (error) {
    console.error("getNutritionSummary error:", error);
    return kirimError(res, error.statusCode || 500, error.message || "Gagal mengambil ringkasan nutrisi");
  }
}

// Controller untuk Menu 5: Hapus History Makanan
async function deleteFoodHistory(req, res, idFromParam) {
  try {

    const url = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    const foodId = idFromParam || url.searchParams.get("id")?.trim();

    const result = await foodService.deleteFoodHistory(req.user, foodId);

    return kirimJSON(res, 200, {
      message: result.message || "Riwayat makanan berhasil dihapus",
      deletedCount: result.deletedCount
    });
  } 
  catch (error) {
    console.error("deleteFoodHistory error:", error);
    return kirimError(res, error.statusCode || 500, error.message || "Gagal menghapus riwayat makanan");
  }
}

module.exports = {
  searchFoods,
  FoodAdd,
  getFoodHistory,
  getNutritionSummary,
  deleteFoodHistory
};
