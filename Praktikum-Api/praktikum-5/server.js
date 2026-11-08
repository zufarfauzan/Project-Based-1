console.log("Nanda Chairunnisa | F5512520041, Muh. Zufar Fauzan | F5512520074, Rizky Jumadil M. | \nF5512520045, Juan Terrin K. Samatimbang | F5512520051, Mutiara Fajarianti | F5512520043");
const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { buildSchema, graphql } = require('graphql');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'destinations.json');
const REGION_FILE = path.join(__dirname, 'data', 'regions.json');
const KEY_FILE = path.join(__dirname, 'data', 'api-keys.json');
const USER_FILE = path.join(__dirname, 'data', 'users.json');
const TOKEN_SECRET = 'ambatron123';
const MASA_TOKEN = 3600;

// ---------- helper respons ----------
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

// ---------- helper request ----------
//const FIELD_WAJIB = ['name', 'region', 'category'];
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
/*function cekFieldWajib(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return FIELD_WAJIB;
    }
    return FIELD_WAJIB.filter(
        (field) => typeof input[field] !== 'string' || input[field].trim() === ''
    );
}*/

// ---------- helper data ----------
async function bacaData() {
    const isi = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(isi);
}
async function simpanData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function bacaRegions() {
    const isi = await fs.readFile(REGION_FILE, 'utf8');
    return JSON.parse(isi);
}
// ---------- keamanan ----------
async function periksaApiKey(req) {
    const kunci = req.headers['x-api-key'];
    if (!kunci) {
        throw buatError(401, 'API key tidak disertakan. Kirim melalui header x-api-key');
    }
    const isi = await fs.readFile(KEY_FILE, 'utf8');
    const pemilik = JSON.parse(isi).find((k) => k.key === kunci);
    if (!pemilik) {
        throw buatError(401, 'API key tidak dikenal');
    }
    return pemilik;
}

function samaAman(a, b) {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function passwordCocok(password, user) {
    const hash = crypto.scryptSync(password, user.salt, 32).toString('hex');
    return samaAman(hash, user.passwordHash);
}
function keBase64Url(data) {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
}
function tandaTangan(teks) {
    return crypto.createHmac('sha256', TOKEN_SECRET).update(teks).digest('base64url');
}
function buatToken(user) {
    const header = keBase64Url({ alg: 'HS256', typ: 'JWT' });
    const payload = keBase64Url({
        sub: String(user.id),
        username: user.username,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + MASA_TOKEN
    });
    const ttd = tandaTangan(`${header}.${payload}`);
    return `${header}.${payload}.${ttd}`;
}

function bacaToken(token) {
 const bagian = token.split('.');
 if (bagian.length !== 3) {
 throw buatError(401, 'Format token tidak valid');
 }
 const [header, payload, ttd] = bagian;
 if (!samaAman(ttd, tandaTangan(`${header}.${payload}`))) {
 throw buatError(401, 'Tanda tangan token tidak cocok');
 }
 const isi = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
 if (isi.exp < Math.floor(Date.now() / 1000)) {
 throw buatError(401, 'Token sudah kedaluwarsa, silakan login kembali');
 }
 return isi;
}
function bacaPengguna(req) {
 const nilai = req.headers['authorization'];
 if (!nilai || !nilai.startsWith('Bearer ')) {
 return null;
 }
 return bacaToken(nilai.slice(7));
}
function wajibLogin(pengguna) {
 if (!pengguna) {
 throw buatError(401, 'Anda belum login. Kirim token melalui header Authorization');
 }
 return pengguna;
}
function wajibRole(pengguna, roleYangBoleh) {
 wajibLogin(pengguna);
 if (!roleYangBoleh.includes(pengguna.role)) {
 throw buatError(403, `Role ${pengguna.role} tidak berhak melakukan tindakan ini`);
 }
 return pengguna;
}


// ---------- logika destinasi ----------
async function periksaDestinasi(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        throw buatError(400, 'Data destinasi harus berupa object');
    }
    const kurang = ['name', 'category'].filter(
        (field) => typeof input[field] !== 'string' || input[field].trim() === ''
    );
    if (kurang.length > 0) {
        throw buatError(400, `Field wajib belum diisi: ${kurang.join(', ')}`);
    }
    const regionId = Number(input.regionId);
    const regions = await bacaRegions();
    if (!regions.some((r) => r.id === regionId)) {
        throw buatError(400, 'regionId wajib diisi dengan id region yang tersedia');
    }
    return {
        name: input.name.trim(),
        category: input.category.trim(),
        regionId: regionId
    };
}
async function buatDestinasi(input) {
    const bersih = await periksaDestinasi(input);
    const data = await bacaData();
    const idBaru = data.length === 0 ? 1 : Math.max(...data.map((d) => d.id)) + 1;
    const item = { id: idBaru, ...bersih };
    data.push(item);
    await simpanData(data);
    return item;
}

// ---------- handler ----------
async function daftarDestinasi(req, res, url) {
    let data = await bacaData();
    const kategori = url.searchParams.get('category');
    if (kategori) {
        data = data.filter((item) => item.category === kategori);
    }
    kirimJSON(res, 200, data);
}
async function detailDestinasi(req, res, id) {
    const data = await bacaData();
    const item = data.find((d) => d.id === id);
    if (!item) {
        return kirimError(res, 404, `Destinasi dengan id ${id} tidak ditemukan`);
    }
    kirimJSON(res, 200, item);
}

async function tambahDestinasi(req, res) {
    const input = await bacaBody(req);
    const item = await buatDestinasi(input);
    res.setHeader('Location', `/destinations/${item.id}`);
    kirimJSON(res, 201, item);
}

async function ubahDestinasi(req, res, id) {
 const input = await bacaBody(req);
 const data = await bacaData();
 const index = data.findIndex((d) => d.id === id);
 if (index === -1) {
 return kirimError(res, 404, `Destinasi dengan id ${id} tidak ditemukan`);
 }
 const bersih = await periksaDestinasi(input);
 data[index] = { id: id, ...bersih };
 await simpanData(data);
 kirimJSON(res, 200, data[index]);
}

async function hapusDestinasi(req, res, id) {
    const data = await bacaData();
    const index = data.findIndex((d) => d.id === id);
    if (index === -1) {
        return kirimError(res, 404, `Destinasi dengan id ${id} tidak ditemukan`);
    }
    data.splice(index, 1);
    await simpanData(data);
    res.writeHead(204);
    res.end();
}

async function tanganiRegions(req, res, segmen) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return kirimError(res, 405, `Method ${req.method} tidak didukung pada endpoint ini`);
    }
    const regions = await bacaRegions();
    if (segmen.length === 1) {
        return kirimJSON(res, 200, regions);
    }
    const item = regions.find((r) => r.id === Number(segmen[1]));
    if (!item) {
        return kirimError(res, 404, `Region dengan id ${segmen[1]} tidak ditemukan`);
    }
    kirimJSON(res, 200, item);
}

const loginAttempts = {};

async function tanganiLogin(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return kirimError(res, 405, 'Endpoint /login hanya menerima method POST');
    }

    const input = await bacaBody(req);
    const lengkap = input !== null && typeof input.username === 'string' && typeof input.password === 'string';
    
    if (!lengkap) {
        return kirimError(res, 400, 'Body harus memuat username dan password');
    }

    const username = input.username;
    const now = Date.now();

    if (!loginAttempts[username]) {
        loginAttempts[username] = { count: 0, lockUntil: 0 };
    }

    if (loginAttempts[username].lockUntil > now) {
        return kirimError(res, 429, 'Too Many Requests: Terlalu banyak percobaan gagal. Silakan coba lagi setelah 60 detik.');
    }

    const isi = await fs.readFile(USER_FILE, 'utf8');
    const user = JSON.parse(isi).find((u) => u.username === username);

    if (!user || !passwordCocok(input.password, user)) {
        loginAttempts[username].count += 1;
        
        if (loginAttempts[username].count >= 3) {
            loginAttempts[username].lockUntil = now + 60000;
            loginAttempts[username].count = 0; 
        }
        
        return kirimError(res, 401, 'Username atau password salah');
    }

    loginAttempts[username] = { count: 0, lockUntil: 0 };

    kirimJSON(res, 200, {
        token: buatToken(user),
        tokenType: 'Bearer',
        expiresIn: MASA_TOKEN
    });
}


/*
async function tanganiLogin(req, res) {
    let jumlah_gagal_login = 0
    if(jumlah_gagal_login >= 3){
        return kirimError(res, 429, 'Too Many Request')
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return kirimError(res, 405, 'Endpoint /login hanya menerima method POST');
    }
    const input = await bacaBody(req);
    const lengkap = input !== null && typeof input.username === 'string' && typeof input.password === 'string';
    if (!lengkap) {
        return kirimError(res, 400, 'Body harus memuat username dan password');
    }
    const isi = await fs.readFile(USER_FILE, 'utf8');
    const user = JSON.parse(isi).find((u) => u.username === input.username);
    if (!user || !passwordCocok(input.password, user)) {
        ++jumlah_gagal_login
        return kirimError(res, 401, 'Username atau password salah');
    }
    kirimJSON(res, 200, {
        token: buatToken(user),
        tokenType: 'Bearer',
        expiresIn: MASA_TOKEN
    });
}
*/
// ---------- graphql: schema ----------
const schema = buildSchema(`
    type Destination {
        id: ID!
        name: String!
        category: String
        region: Region
    }
    type Region {
        id: ID!
        name: String!
        weather: Weather
        destinations: [Destination]
    }
    type Weather {
        temperature: Float
        windSpeed: Float
        humidity: Float
        time: String
    }
    type Query {
        destinations(category: String): [Destination]
        destination(id: ID!): Destination
        regions: [Region]
        region(id: ID!): Region
    }
    type Mutation {
        createDestination(
            name: String!
            category: String!
            regionId: ID!
        ): Destination

        updateDestination(
            id: ID!
            name: String!
            category: String!
            regionId: ID!
        ): Destination
    deleteDestination(id: ID!): String
}
`);

async function ambilCuaca(region) {
    const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${region.latitude}&longitude=${region.longitude}`
    + '&current=temperature_2m,wind_speed_10m,relative_humidity_2m'
    + '&timezone=Asia/Makassar';

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
        throw new Error(`Open-Meteo menjawab dengan status ${res.status}`);
    }
    const hasil = await res.json();
    return {
        temperature: hasil.current.temperature_2m,
        windSpeed: hasil.current.wind_speed_10m,
        humidity: hasil.current.relative_humidity_2m, 
        time: hasil.current.time
    };
}

function lengkapiRegion(region) {
    return {
        ...region,
        weather: () => ambilCuaca(region)
    };
}

function lengkapiDestinasi(item) {
    return {
        ...item,
        region: async () => {
            console.log(` resolver region dijalankan untuk: ${item.name}`);
            const regions = await bacaRegions();
            const region = regions.find((r) => r.id === item.regionId);
            return region ? lengkapiRegion(region) : null;
        }
    };
}

// ---------- graphql: resolver ----------
const resolver = {};

resolver.regions = async () => {
    const regions = await bacaRegions();
    return regions.map(lengkapiRegionDibalik);
};

resolver.region = async (args) => {
    const regions = await bacaRegions();
    const region = regions.find((r) => r.id === Number(args.id));
    if (!region) throw new Error(`Region dengan id ${args.id} tidak ditemukan`);
    return lengkapiRegionDibalik(region);
};

function lengkapiRegionDibalik(region) {
    return {
        ...region,
        weather: () => ambilCuaca(region),
        destinations: async () => {
            const data = await bacaData();
            return data.filter((d) => d.regionId === region.id).map(lengkapiDestinasi);
        }
    };
}

resolver.destinations = async (args) => {
    let data = await bacaData();
    if (args.category) {
        data = data.filter((item) => item.category === args.category);
    }
    return data.map(lengkapiDestinasi);
};

resolver.destination = async (args) => {
    const data = await bacaData();
    const item = data.find((d) => d.id === Number(args.id));
    if (!item) {
        throw new Error(`Destinasi dengan id ${args.id} tidak ditemukan`);
    }
    return lengkapiDestinasi(item);
};

resolver.createDestination = async (args, context) => {
 wajibLogin(context.pengguna);
 const item = await buatDestinasi(args);
 return lengkapiDestinasi(item);
};

resolver.updateDestination = async (args, context) => {
    // Memastikan pengguna sudah login dan memiliki role admin atau editor
    wajibRole(context.pengguna, ['admin', 'editor']);

    const id = Number(args.id);
    const data = await bacaData();
    const index = data.findIndex((d) => d.id === id);
    if (index === -1) {
        throw new Error(`Destinasi dengan id ${id} tidak ditemukan`);
    }
    const bersih = await periksaDestinasi(args);
    data[index] = { id: id, ...bersih };
    await simpanData(data);
    return lengkapiDestinasi(data[index]);
};

resolver.deleteDestination = async (args, context) => {
    // Memastikan pengguna sudah login dan hanya role admin yang boleh menghapus
    wajibRole(context.pengguna, ['admin']);

    const id = Number(args.id);
    const data = await bacaData();
    const index = data.findIndex((d) => d.id === id);
    if (index === -1) {
        throw new Error(`Destinasi dengan id ${id} tidak ditemukan`);
    }
    data.splice(index, 1);
    await simpanData(data);
    return `Destinasi dengan id ${id} berhasil dihapus`;
};

// ---------- graphql: handler ----------
async function tanganiGraphQL(req, res) {
 if (req.method !== 'POST') {
 res.setHeader('Allow', 'POST');
 return kirimError(res, 405, 'Endpoint /graphql hanya menerima method POST');
 }
 const pengguna = bacaPengguna(req);
 const body = await bacaBody(req);
 if (body === null || typeof body.query !== 'string') {
 return kirimError(res, 400, 'Body harus berupa JSON yang memiliki field query');
 }
 const hasil = await graphql({
 schema: schema,
 source: body.query,
 rootValue: resolver,
 contextValue: { pengguna: pengguna }
 });
 kirimJSON(res, 200, hasil);
}

// ---------- router ----------
async function router(req, res) {
 const url = new URL(req.url, 'http://localhost');
 const segmen = url.pathname.split('/').filter(Boolean);
 const aplikasi = await periksaApiKey(req);
 console.log(` aplikasi: ${aplikasi.client}`);
 if (segmen[0] === 'login' && segmen.length === 1) {
 return tanganiLogin(req, res);
 }
 if (segmen[0] === 'graphql' && segmen.length === 1) {
 return tanganiGraphQL(req, res);
 }
 if (segmen[0] === 'regions' && segmen.length <= 2) {
 return tanganiRegions(req, res, segmen);
 }
 if (segmen[0] !== 'destinations' || segmen.length > 2) {
 return kirimError(res, 404, 'Endpoint tidak ditemukan');
 }
 // Endpoint koleksi: /destinations
 if (segmen.length === 1) {
 if (req.method === 'GET') return daftarDestinasi(req, res, url);
 if (req.method === 'POST') {
 wajibLogin(bacaPengguna(req));
 return tambahDestinasi(req, res);
 }
 res.setHeader('Allow', 'GET, POST');
 return kirimError(res, 405, `Method ${req.method} tidak didukung pada endpoint ini`);
 }
 // Endpoint item: /destinations/:id
 const id = Number(segmen[1]);
 if (!Number.isInteger(id) || id < 1) {
 return kirimError(res, 400, 'id harus berupa bilangan bulat positif');
 }
 if (req.method === 'GET') return detailDestinasi(req, res, id);
 if (req.method === 'PUT') {
 wajibLogin(bacaPengguna(req));
 return ubahDestinasi(req, res, id);
 }
 if (req.method === 'DELETE') {
 wajibRole(bacaPengguna(req), ['admin']);
 return hapusDestinasi(req, res, id);
 }
 res.setHeader('Allow', 'GET, PUT, DELETE');
 return kirimError(res, 405, `Method ${req.method} tidak didukung pada endpoint ini`);
}


// ---------- server ----------
const server = http.createServer(async (req, res) => {
    res.on('finish', () => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode}`);
    });

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
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

