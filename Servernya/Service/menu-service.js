const { getDb } = require("../Config/db.js");
const { buatError } = require('../Utils/menu.js');
const { ObjectId } = require('mongodb');

// Koleksi untuk katalog makanan (hasil pencarian & cache dari Open Food Facts)
function getCatalogCollection() {
  return getDb().collection('Foods');
}

// Koleksi khusus untuk log/riwayat makanan yang dikonsumsi oleh pengguna
function getLogsCollection() {
  return getDb().collection('Food_Logs');
}

// MENU 1: Pencarian makanan via API eksternal Open Food Facts dan koleksi katalog Foods
async function searchFoods(keyword) {
  const collection = getCatalogCollection();
  const searchResults = [];

  // 1. Cari via Open Food Facts API
  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", keyword);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", "10");
    url.searchParams.set("fields", "code,product_name,brands,nutriments");

    const response = await fetch(url, {
      headers: { "User-Agent": "NutriCheck/1.0" },
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      const result = await response.json();
      const products = result.products || [];

      for (const product of products) {
        if (!product.product_name) continue;

        const n = product.nutriments || {};

        const food = {
          name: product.product_name,
          brand: product.brands || null,
          calories: n["energy-kcal_100g"] != null ? Math.round(Number(n["energy-kcal_100g"]) * 10) / 10 : null,
          protein: n.proteins_100g != null ? Math.round(Number(n.proteins_100g) * 10) / 10 : null,
          fat: n.fat_100g != null ? Math.round(Number(n.fat_100g) * 10) / 10 : null,
          carbs: n.carbohydrates_100g != null ? Math.round(Number(n.carbohydrates_100g) * 10) / 10 : null,
          source: "open_food_facts"
        };

        if (product.code) {
          await collection.updateOne(
            { barcode: product.code },
            {
              $set: food,
              $setOnInsert: { barcode: product.code, createdAt: new Date() }
            },
            { upsert: true }
          );

          const saved = await collection.findOne({ barcode: product.code });
          searchResults.push({ ...saved, saved: true });
        } else {
          searchResults.push({ ...food, saved: false });
        }
      }
    }
  } catch (apiErr) {
    console.warn("Open Food Facts API warning/timeout:", apiErr.message);
  }

  // 2. Jika API eksternal kosong atau offline, ambil dari koleksi Foods lokal
  if (searchResults.length === 0) {
    const localFoods = await collection.find({
      name: { $regex: keyword, $options: 'i' }
    }).limit(10).toArray();

    for (const food of localFoods) {
      searchResults.push(food);
    }
  }

  return searchResults;
}

// MENU 2: Tambah Makanan Yang telah Dimakan (Manual Input ke Food_Logs)
async function AddFood(input, user) {

  const logsCollection = getLogsCollection();
  const userId = user.id || user._id.toString();

  const newFood = {
    name: input.name.trim(),
    portion: Number(input.portion) || 100,
    calories: Number(input.calories) || 0,
    protein: Number(input.protein) || 0,
    fat: Number(input.fat) || 0,
    carbs: Number(input.carbs) || 0,
    userId: userId,
    username: user.username,
    createdAt: new Date()
  };

  const result = await logsCollection.insertOne(newFood);
  return { _id: result.insertedId, ...newFood };
}

// MENU 3: Tampilkan History Makanan Pada Hari Tertentu (Hanya milik user login)
async function getFoodHistory(user, options = {}) {

  const logsCollection = getLogsCollection();
  const userId = user.id || user._id.toString();

  const filter = {
    $or: [
      { userId: userId },
      { username: user.username }
    ]
  };

  // Filter tanggal spesifik (format YYYY-MM-DD)
  if (!options.all && options.date) {
    const dateStr = options.date;
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999`);

    if (isNaN(startOfDay.getTime())) {
      throw buatError(400, 'Format tanggal tidak valid. Harap gunakan YYYY-MM-DD');
    }

    filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }

  const foods = await logsCollection.find(filter).sort({ createdAt: -1 }).toArray();
  return foods;
}

// MENU 4: Tampilkan Total Nutrisi Harian
async function getNutritionSummary(user, dateStr) {
  // Jika tanggal kosong, default ke tanggal hari ini (YYYY-MM-DD)
  const targetDate = dateStr || new Date().toLocaleDateString('en-CA');
  const foods = await getFoodHistory(user, { date: targetDate });

  let totalCalories = 0;
  let totalProtein = 0;
  let totalFat = 0;
  let totalCarbs = 0;

  for (const food of foods) {
    totalCalories += Number(food.calories) || 0;
    totalProtein += Number(food.protein) || 0;
    totalFat += Number(food.fat) || 0;
    totalCarbs += Number(food.carbs) || 0;
  }

  return {
    date: targetDate,
    itemCount: foods.length,
    calories: Math.round(totalCalories * 10) / 10,
    protein: Math.round(totalProtein * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10
  };
}

// MENU 5: Hapus History Makanan (berdasarkan ID atau semua riwayat)
async function deleteFoodHistory(user, foodId) {

  const logsCollection = getLogsCollection();
  const userId = user.id || user._id.toString();

  const userOwnership = {
    $or: [
      { userId: userId },
      { username: user.username }
    ]
  };

  if (foodId) {
    if (!ObjectId.isValid(foodId)) {
      throw buatError(400, 'Format ID makanan tidak valid');
    }

    const filter = {
      _id: new ObjectId(foodId),
      ...userOwnership
    };

    const result = await logsCollection.deleteOne(filter);
    if (result.deletedCount === 0) {
      throw buatError(404, 'Data makanan tidak ditemukan atau tidak memiliki hak akses');
    }

    return {
      deletedCount: result.deletedCount,
      message: 'Riwayat makanan berhasil dihapus'
    };
  } else {
    // Hapus semua riwayat makanan untuk user yang sedang login
    const result = await logsCollection.deleteMany(userOwnership);
    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} riwayat makanan berhasil dihapus`
    };
  }
}

module.exports = {
  searchFoods,
  AddFood,
  getFoodHistory,
  getNutritionSummary,
  deleteFoodHistory
};