// Utils/parser.js

// Fungsi untuk membuat objek Error kustom dengan status code
function buatError(statusCode, pesan) {
    const err = new Error(pesan);
    err.statusCode = statusCode;
    err.message = pesan;
    return err;
}

// Fungsi untuk mengirim respons berformat JSON ke klien
function kirimJSON(res, statusCode, data) {
    if (res.headersSent) return;
    const body = JSON.stringify(data);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
}

// Fungsi untuk mengirim respons error berformat JSON
function kirimError(res, statusCode, pesan) {
    kirimJSON(res, statusCode, { error: pesan });
}

// Fungsi untuk merakit chunk body request POST/PUT (JSON)
function bacaBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });
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

module.exports = {
    buatError,
    kirimJSON,
    kirimError,
    bacaBody
};