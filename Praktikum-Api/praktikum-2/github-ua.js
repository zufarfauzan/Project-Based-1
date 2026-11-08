const https = require('https');
const options = {
 hostname: 'api.github.com',
 path: '/users/octocat',
 headers: {
 'User-Agent': 'praktikum-rekayasa-api'
 }
};
https.get(options, (res) => {
 console.log('Status code :', res.statusCode);
 console.log('Content-Type:', res.headers['content-type']);
 let body = '';
 res.on('data', (chunk) => { body += chunk; });
 res.on('end', () => console.log(body));
}).on('error', (err) => {
 console.error('Gagal terhubung:', err.message);
});