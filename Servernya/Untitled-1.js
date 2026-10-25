
const http = require("node:http");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const PORT = 3000;
const usernameDB = process.env.usernameDB;
const passwordDB = process.env.passwordDB;
const namaDB = process.env.namaDB;
const uri = `mongodb+srv://${usernameDB}:${passwordDB}@cluster0.oznru4g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const dbName = namaDB;

let dbConnection;

const connectToDb = (cb) => {
    MongoClient.connect(uri)
      .then((client) => {
        dbConnection = client.db(dbName);
        console.log("Berhasil terhubung ke MongoDB Atlas!");
        return cb();
      })
      .catch((err) => {
        console.error("Gagal terhubung ke database:", err);
        return cb(err);
      });
    }

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });

  res.end(JSON.stringify(data));
}

async function searchFoods(keyword) {
  const url = new URL(
    "https://world.openfoodfacts.org/cgi/search.pl"
  );

  url.searchParams.set("search_terms", keyword);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "10");
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments"
  );

  const response = await fetch(url, {
    headers: {
      "User-Agent": "NutriCheck/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error("Open Food Facts gagal merespons");
  }

  const data = await response.json();

  return (data.products || [])
    .filter((product) => product.product_name)
    .map((product) => {
      const n = product.nutriments || {};

      return {
        barcode: product.code || null,
        name: product.product_name,
        brand: product.brands || null,
        calories: n["energy-kcal_100g"] ?? null,
        protein: n.proteins_100g ?? null,
        fat: n.fat_100g ?? null,
        carbs: n.carbohydrates_100g ?? null,
        source: "open_food_facts",
      };
    });
}

async function handleRequest(req, res) {
  // Endpoint pencarian makanan
  if (
    req.method === "GET" &&
    req.url.startsWith("/api/foods/search")
  ) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const keyword = url.searchParams.get("q")?.trim();

      if (!keyword || keyword.length < 2) {
        return sendJSON(res, 400, {
          message: "Kata pencarian minimal 2 karakter",
        });
      }

      if (keyword.length > 100) {
        return sendJSON(res, 400, {
          message: "Kata pencarian maksimal 100 karakter",
        });
      }

      const products = await searchFoods(keyword);

      // Simpan/update produk yang mempunyai barcode.
      const results = await Promise.all(
        products.map(async (food) => {
          if (!food.barcode) {
            return { ...food, saved: false };
          }

          const { barcode, ...fields } = food;

          const savedFood = await foodsCollection.findOneAndUpdate(
            { barcode },
            {
              $set: fields,
              $setOnInsert: { barcode },
            },
            {
              upsert: true,
              returnDocument: "after",
            }
          );

          return {
            ...savedFood,
            saved: true,
          };
        })
      );

      return sendJSON(res, 200, {
        message: "Pencarian berhasil",
        count: results.length,
        data: results,
      });
    } catch (error) {
      console.error("Search error:", error.message);

      return sendJSON(res, 502, {
        message: "Gagal mengambil data makanan",
      });
    }
  }

  sendJSON(res, 404, {
    message: "Endpoint tidak ditemukan",
  });
}

async function startServer() {
  await client.connect();

  const db = client.db(dbName);
  foodsCollection = db.collection("foods");

  // Satu barcode hanya boleh mewakili satu dokumen produk.
  await foodsCollection.createIndex(
    { barcode: 1 },
    {
      unique: true,
      partialFilterExpression: {
        barcode: { $type: "string" },
      },
    }
  );

  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });

  server.listen(PORT, () => {
    console.log(`NutriCheck berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Gagal menjalankan server:", error.message);
  process.exit(1);
});
