console.log("Nanda Chairunnisa | F5512520041, Muh. Zufar Fauzan | F5512520074, Rizky Jumadil M. | F5512520045, Juan Terrin K. Samatimbang | F5512520051, Mutiara Fajarianti | F5512520043");

const http = require('http');
const fs = require('fs/promises');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'stocks.json');

// ---------- Helper Respons ----------
function kirimJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function kirimError(res, statusCode, pesan) {
  kirimJSON(res, statusCode, { error: pesan });
}

// ---------- Helper File Persistence ----------
async function bacaData() {
  const isi = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(isi);
}

async function simpanData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Helper Request & Validasi ----------
function buatError(statusCode, pesan) {
  const err = new Error(pesan);
  err.statusCode = statusCode;
  return err;
}

function bacaBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      if (body === '') return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(buatError(400, 'Body request bukan JSON yang valid'));
      }
    });
    req.on('error', reject);
  });
}

function validasiInputSaham(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return 'Format data body harus berupa JSON object';
  }

  const { ticker, name, sector, price, lot } = input;

  if (typeof ticker !== 'string' || ticker.trim() === '') {
    return 'Field "ticker" wajib diisi kode saham (string)';
  }
  if (typeof name !== 'string' || name.trim() === '') {
    return 'Field "name" wajib diisi nama emiten (string)';
  }
  if (typeof sector !== 'string' || sector.trim() === '') {
    return 'Field "sector" wajib diisi sektor industri (string)';
  }
  if (!Number.isFinite(price) || price < 0) {
    return 'Field "price" wajib bertipe number dan bernilai >= 0';
  }
  if (!Number.isFinite(lot) || lot < 0) {
    return 'Field "lot" wajib bertipe number dan bernilai >= 0';
  }

  return null;
}

// ---------- Handler Endpoints ----------
async function daftarSaham(req, res, url) {
  let data = await bacaData();
  const sector = url.searchParams.get('sector');
  if (sector) {
    data = data.filter((item) => item.sector.toLowerCase() === sector.toLowerCase());
  }
  kirimJSON(res, 200, data);
}

async function detailSaham(req, res, id) {
  const data = await bacaData();
  const item = data.find((s) => s.id === id);
  if (!item) {
    return kirimError(res, 404, `Saham dengan id ${id} tidak ditemukan`);
  }
  kirimJSON(res, 200, item);
}

async function tambahSaham(req, res) {
  const input = await bacaBody(req);
  const errorValidasi = validasiInputSaham(input);
  if (errorValidasi) {
    return kirimError(res, 400, errorValidasi);
  }

  const data = await bacaData();
  const idBaru = data.length === 0 ? 1 : Math.max(...data.map((s) => s.id)) + 1;
  const item = {
    id: idBaru,
    ticker: input.ticker.trim().toUpperCase(),
    name: input.name.trim(),
    sector: input.sector.trim().toLowerCase(),
    price: input.price,
    lot: input.lot
  };

  data.push(item);
  await simpanData(data);

  res.setHeader('Location', `/stocks/${idBaru}`);
  kirimJSON(res, 201, item);
}

async function ubahSaham(req, res, id) {
  const input = await bacaBody(req);
  const data = await bacaData();
  const index = data.findIndex((s) => s.id === id);
  if (index === -1) {
    return kirimError(res, 404, `Saham dengan id ${id} tidak ditemukan`);
  }

  const errorValidasi = validasiInputSaham(input);
  if (errorValidasi) {
    return kirimError(res, 400, errorValidasi);
  }

  data[index] = {
    id,
    ticker: input.ticker.trim().toUpperCase(),
    name: input.name.trim(),
    sector: input.sector.trim().toLowerCase(),
    price: input.price,
    lot: input.lot
  };
  await simpanData(data);
  kirimJSON(res, 200, data[index]);
}

async function hapusSaham(req, res, id) {
  const data = await bacaData();
  const index = data.findIndex((s) => s.id === id);
  if (index === -1) {
    return kirimError(res, 404, `Saham dengan id ${id} tidak ditemukan`);
  }

  data.splice(index, 1);
  await simpanData(data);
  res.writeHead(204);
  res.end();
}

// ---------- Router Manual ----------
async function router(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const segmen = url.pathname.split('/').filter(Boolean);

  if (segmen[0] !== 'stocks' || segmen.length > 2) {
    return kirimError(res, 404, 'Endpoint tidak ditemukan');
  }

  // Endpoint Koleksi: /stocks
  if (segmen.length === 1) {
    if (req.method === 'GET') return daftarSaham(req, res, url);
    if (req.method === 'POST') return tambahSaham(req, res);
    res.setHeader('Allow', 'GET, POST');
    return kirimError(res, 405, `Method ${req.method} tidak didukung pada endpoint ini`);
  }

  // Endpoint Item: /stocks/:id
  const id = Number(segmen[1]);
  if (!Number.isInteger(id) || id < 1) {
    return kirimError(res, 400, 'id harus berupa bilangan bulat positif');
  }

  if (req.method === 'GET') return detailSaham(req, res, id);
  if (req.method === 'PUT') return ubahSaham(req, res, id);
  if (req.method === 'DELETE') return hapusSaham(req, res, id);
  res.setHeader('Allow', 'GET, PUT, DELETE');
  return kirimError(res, 405, `Method ${req.method} tidak didukung pada endpoint ini`);
}

// ---------- Inisialisasi Server ----------
const server = http.createServer(async (req, res) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  try {
    await router(req, res);
  } catch (err) {
    if (err.statusCode) {
      return kirimError(res, err.statusCode, err.message);
    }
    console.error(err);
    kirimError(res, 500, 'Terjadi kesalahan pada server');
  }
});

server.listen(PORT, () => {
  console.log(`Server Saham berjalan di http://localhost:${PORT}`);
});