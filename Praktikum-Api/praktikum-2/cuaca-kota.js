const namaKota = process.argv[2];
if (!namaKota) {
 console.log('Cara pakai: node cuaca-kota.js "<nama kota>"');
 process.exit(1);
}
async function cariLokasi(nama) {
 const params = new URLSearchParams({
 name: nama,
 count: 1,
 language: 'id',
 countryCode: 'ID'
 });
 const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
 if (!res.ok) {
 throw new Error(`API geocoding menjawab dengan status ${res.status}`);
 }
 const data = await res.json();
 if (!data.results || data.results.length === 0) {
 throw new Error(`Lokasi "${nama}" tidak ditemukan`);
 }
 const hasil = data.results[0];
 return {
 nama: hasil.name,
 wilayah: hasil.admin1,
 latitude: hasil.latitude,
 longitude: hasil.longitude,
 zonaWaktu: hasil.timezone
 };
}
async function ambilCuaca(lokasi) {
 const params = new URLSearchParams({
 latitude: lokasi.latitude,
 longitude: lokasi.longitude,
 current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
 timezone: lokasi.zonaWaktu
 });
 const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
 if (!res.ok) {
 throw new Error(`API cuaca menjawab dengan status ${res.status}`);
 }
 const data = await res.json();
 return data.current;
}
async function main() {
 try {
 const lokasi = await cariLokasi(namaKota);
 console.log(`Lokasi : ${lokasi.nama}, ${lokasi.wilayah}`);
 console.log(`Koordinat : ${lokasi.latitude}, ${lokasi.longitude}`);
 console.log(`Zona waktu : ${lokasi.zonaWaktu}`);
 const cuaca = await ambilCuaca(lokasi);
 console.log(`Waktu : ${cuaca.time}`);
 console.log(`Suhu : ${cuaca.temperature_2m} °C`);
 console.log(`Kelembapan : ${cuaca.relative_humidity_2m} %`);
 console.log(`Angin : ${cuaca.wind_speed_10m} km/h`);
 } catch (err) {
 console.error('Gagal:', err.message);
 process.exitCode = 1;
 }
}
main();