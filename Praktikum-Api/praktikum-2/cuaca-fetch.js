async function ambilCuaca(latitude, longitude) {
 const url = 'https://api.open-meteo.com/v1/forecast'
 + `?latitude=${latitude}&longitude=${longitude}`
 + '&current=temperature_2m';
 let res;
 try {
 res = await fetch(url);
 } catch (err) {
 console.error('Network error:', err.message);
 return;
 }
 const data = await res.json();
 if (!res.ok) {
 console.error(`HTTP error ${res.status}:`, data.reason);
 return;
 }
 console.log('Status code:', res.status);
 console.log('Suhu :', data.current.temperature_2m, '°C');
}
ambilCuaca(-0.8917, 119.8707);
