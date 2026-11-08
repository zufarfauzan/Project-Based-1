const https = require('https');
const url = 'https://api.open-meteo.com/v1/forecast'
 + '?latitude=-0.8917&longitude=119.8707'
 + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m'
 + '&timezone=Asia/Makassar';
https.get(url, (res) => {
 let body = '';
 res.on('data', (chunk) => { body += chunk; });
 res.on('end', () => {
 let data;
 try {
 data = JSON.parse(body);
 } catch (err) {
 console.error('Respons bukan JSON yang valid:', err.message);
 return;
 }
 const suhu = data.current.temperature_2m;
 const satuanSuhu = data.current_units.temperature_2m;
 const kelembapan = data.current.relative_humidity_2m;
 const angin = data.current.wind_speed_10m;
 console.log('Waktu :', data.current.time);
 console.log('Suhu :', suhu, satuanSuhu);
 console.log('Kelembapan :', kelembapan, '%');
 console.log('Angin :', angin, 'km/h');
 });
}).on('error', (err) => {
 console.error('Gagal terhubung:', err.message);
});
