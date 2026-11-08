const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3000';
let username = '';
let tokenDiterima = null;


const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function requestAPI(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(tokenDiterima ? { 'Authorization': `Bearer ${tokenDiterima}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { status: response.status, ok: response.ok };
  }

  if (response.status === 401) {
    console.log(`\n[AUTENTIKASI GAGAL (401)] ${data.error || 'Token tidak valid atau kedaluwarsa. Harap login kembali.'}`);
    tokenDiterima = null;
    username = '';
    await showAuthMenu();
    return null;
  }

  return data;
}

// Menu Awal (Autentikasi: Register / Login)
async function showAuthMenu() {
  console.log('\n=== SELAMAT DATANG DI NUTRICHECK ===');
  console.log('1. Login');
  console.log('2. Register (Buat Akun)');
  console.log('3. Keluar Aplikasi');

  const choice = await question('\nPilih menu (1-3): ');

  switch (choice.trim()) {
    case '1':
      await handleLogin();
      break;
    case '2':
      await handleRegister();
      break;
    case '3':
      console.log('Keluar dari aplikasi. Sampai jumpa!');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('Pilihan tidak valid.');
      await showAuthMenu();
  }
}

// Handler Registrasi
async function handleRegister() {
  console.log('\n--- REGISTRASI AKUN BARU ---');
  const inputUsername = await question('Masukkan Username: ');
  const inputPassword = await question('Masukkan Password: ');

  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inputUsername, password: inputPassword })
    });
    const data = await response.json();
    
    if (response.ok) {
      console.log('Sukses:', data.message || 'Akun berhasil dibuat!');
    } else {
      console.log('Gagal:', data.error || 'Terjadi kesalahan saat registrasi.');
    }
  } catch (error) {
    console.log('Error koneksi ke server:', error.message);
  }
  await showAuthMenu();
}

// Handler Login
async function handleLogin() {
  console.log('\n--- LOGIN AKUN ---');
  const inputUsername = await question('Masukkan Username: ');
  const inputPassword = await question('Masukkan Password: ');

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: inputUsername, password: inputPassword })
    });
    const data = await response.json();

    if (response.ok) {
      tokenDiterima = data.token; 
      username = data.username || inputUsername;
      console.log(data.message || 'Login berhasil!');
      await showMainMenu();
    } 
    else {
      console.log('Login Gagal:', data.error || 'Username atau password salah.');
      await showAuthMenu();
    }
  } catch (error) {
    console.log('Error koneksi ke server:', error.message);
    await showAuthMenu();
  }
}

// Menu Utama Aplikasi (Setelah Login)
async function showMainMenu() {
  console.log(`\n=== NUTRICHECK MENU (Login sebagai: ${username}) ===`);
  console.log('1. Cari Makanan (API Pencarian Makanan)');
  console.log('2. Tambah Makanan Yang telah Dimakan');
  console.log('3. Tampilkan History Makanan Pada Hari Tertentu');
  console.log('4. Tampilkan Total Nutrisi Harian');
  console.log('5. Hapus History Makanan');
  console.log('6. Logout / Keluar Akun');

  const choice = await question('\nPilih menu (1-6): ');

  switch (choice.trim()) {
    case "1":
      await searchFood();
      break;
    case "2":
      await AddFood();
      break;
    case "3":
      await showFoodHistory();
      break;
    case "4":
      await showNutritionSummary();
      break;
    case "5":
      await deleteFoodHistory();
      break;
    case "6":
      tokenDiterima = null;
      username = '';
      console.log('Berhasil logout.');
      await showAuthMenu();
      break;
    default:
      console.log("Pilihan tidak valid.");
      await showMainMenu();
  }
}

// MENU 1: Cari Makanan (API Pencarian Makanan)
async function searchFood() {
  console.log("\n=== CARI MAKANAN ===");

  const keyword = await question("Nama makanan: ");

  if (!keyword.trim()) {
    console.log("Nama makanan tidak boleh kosong.");
    return showMainMenu();
  }

  try {
    const data = await requestAPI(
      `/menu/search?q=${encodeURIComponent(keyword.trim())}`
    );
    if (!data) return; // 401 Unauthorized sudah diarahkan kembali ke auth menu

    console.log("\nHasil pencarian:");

    if (!data.data || data.data.length === 0) {
      console.log("Makanan tidak ditemukan.");
    } else {
      data.data.forEach((food, index) => {
        console.log(`\n${index + 1}. ${food.name || food.product_name}`);
        console.log(`   Merek       : ${food.brand || "-"}`);
        console.log(`   Kalori      : ${food.calories ?? "-"} kkal/100g`);
        console.log(`   Protein     : ${food.protein ?? "-"} g/100g`);
        console.log(`   Lemak       : ${food.fat ?? "-"} g/100g`);
        console.log(`   Karbohidrat : ${food.carbs ?? "-"} g/100g`);
      });

      console.log("\n" + (data.message || "Pencarian berhasil."));

      // Opsi untuk mencatat makanan yang ditemukan ke riwayat makanan
      const pick = await question("\nPilih nomor makanan untuk dicatat ke riwayat (tekan Enter untuk kembali ke menu): ");
      const selectedIdx = parseInt(pick.trim(), 10) - 1;
      if (!isNaN(selectedIdx) && selectedIdx >= 0 && selectedIdx < data.data.length) {
        const selectedFood = data.data[selectedIdx];
        const portionInput = await question("Porsi yang dimakan (gram, default 100g): ");
        const portion = Number(portionInput) || 100;
        const multiplier = portion / 100;

        const addRes = await requestAPI("/menu/manual", {
          method: "POST",
          body: JSON.stringify({
            name: selectedFood.name || selectedFood.product_name,
            portion: portion,
            calories: Math.max(1, Math.round(((Number(selectedFood.calories) || 0) * multiplier) * 10) / 10),
            protein: Math.max(0.1, Math.round(((Number(selectedFood.protein) || 0) * multiplier) * 10) / 10),
            fat: Math.max(0.1, Math.round(((Number(selectedFood.fat) || 0) * multiplier) * 10) / 10),
            carbs: Math.max(0.1, Math.round(((Number(selectedFood.carbs) || 0) * multiplier) * 10) / 10)
          })
        });
        if (!addRes) return;
        console.log(addRes.message || "Makanan berhasil dicatat ke riwayat!");
      }
    }
  } catch (error) {
    console.log("Gagal mencari makanan:", error.message);
  }

  await showMainMenu();
}

// MENU 2: Input Makanan Manual
async function AddFood() {
  console.log("\n=== INPUT MAKANAN MANUAL ===");

  const name = await question("Nama makanan: ");
  const portionInput = await question("Porsi (gram): ");
  const caloriesInput = await question("Kalori (kkal): ");
  const proteinInput = await question("Protein (gram): ");
  const fatInput = await question("Lemak (gram): ");
  const carbsInput = await question("Karbohidrat (gram): ");

  const portion = Number(portionInput);
  const calories = Number(caloriesInput);
  const protein = Number(proteinInput);
  const fat = Number(fatInput);
  const carbs = Number(carbsInput);

  try {
    const data = await requestAPI("/menu/manual", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        portion,
        calories,
        protein,
        fat,
        carbs
      })
    });
    if (!data) return;

    console.log(data.message || data.error || "Makanan berhasil dicatat.");
  } catch (error) {
    console.log("Gagal mencatat makanan:", error.message);
  }

  await showMainMenu();
}

// MENU 3: Tampilkan History Makanan Pada Hari Tertentu
async function showFoodHistory() {
  console.log("\n=== RIWAYAT MAKANAN ===");
  const dateInput = await question("Masukkan tanggal (YYYY-MM-DD) [kosongkan untuk hari ini, ketik 'semua' untuk semua riwayat]: ");

  let query = '';
  const trimmed = dateInput.trim().toLowerCase();
  if (trimmed === 'semua' || trimmed === 'all') {
    query = '?all=true';
  } else if (trimmed) {
    query = `?date=${encodeURIComponent(trimmed)}`;
  } else {
    const today = new Date().toLocaleDateString('en-CA');
    query = `?date=${today}`;
  }

  try {
    const data = await requestAPI(`/menu/history${query}`);
    if (!data) return;

    if (!data.data || data.data.length === 0) {
      console.log("\nBelum ada riwayat makanan untuk periode tersebut.");
    } else {
      console.log(`\nMenampilkan ${data.data.length} riwayat makanan:`);
      data.data.forEach((food, index) => {
        console.log(`\n${index + 1}. ${food.name}`);
        console.log(`   ID          : ${food._id}`);
        console.log(`   Porsi       : ${food.portion ?? "-"} gram`);
        console.log(`   Kalori      : ${food.calories ?? "-"} kkal`);
        console.log(`   Protein     : ${food.protein ?? "-"} gram`);
        console.log(`   Lemak       : ${food.fat ?? "-"} gram`);
        console.log(`   Karbohidrat : ${food.carbs ?? "-"} gram`);
        const formattedDate = food.createdAt ? new Date(food.createdAt).toLocaleString('id-ID') : (food.date || "-");
        console.log(`   Waktu       : ${formattedDate}`);
      });
    }
  } catch (error) {
    console.log("Gagal mengambil riwayat:", error.message);
  }

  await showMainMenu();
}

// MENU 4: Tampilkan Total Nutrisi Harian
async function showNutritionSummary() {
  console.log("\n=== RINGKASAN TOTAL NUTRISI HARIAN ===");
  const dateInput = await question("Masukkan tanggal (YYYY-MM-DD) [kosongkan untuk hari ini]: ");

  let query = '';
  const trimmed = dateInput.trim();
  if (trimmed) {
    query = `?date=${encodeURIComponent(trimmed)}`;
  } else {
    const today = new Date().toLocaleDateString('en-CA');
    query = `?date=${today}`;
  }

  try {
    const data = await requestAPI(`/menu/summary${query}`);
    if (!data) return;
    const summary = data.data || data;

    console.log(`\nRingkasan untuk tanggal: ${summary.date || (trimmed || 'Hari ini')}`);
    console.log(`Jumlah makanan dicatat : ${summary.count ?? summary.itemCount ?? 0} item`);
    console.log(`Total kalori           : ${summary.calories ?? 0} kkal`);
    console.log(`Total protein          : ${summary.protein ?? 0} gram`);
    console.log(`Total lemak            : ${summary.fat ?? 0} gram`);
    console.log(`Total karbohidrat      : ${summary.carbs ?? 0} gram`);
  } catch (error) {
    console.log("Gagal mengambil ringkasan:", error.message);
  }

  await showMainMenu();
}

// MENU 5: Hapus History Makanan
async function deleteFoodHistory() {
  console.log("\n=== HAPUS HISTORY MAKANAN ===");
  console.log("1. Hapus riwayat makanan berdasarkan ID");
  console.log("2. Hapus seluruh riwayat makanan");
  console.log("3. Kembali ke Menu Utama");

  const choice = await question("\nPilih opsi (1-3): ");

  if (choice.trim() === "1") {
    const foodId = await question("Masukkan ID makanan yang ingin dihapus: ");
    if (!foodId.trim()) {
      console.log("ID makanan tidak boleh kosong.");
      return await showMainMenu();
    }

    try {
      const data = await requestAPI(`/menu/history/${encodeURIComponent(foodId.trim())}`, {
        method: "DELETE"
      });
      if (!data) return;
      console.log(data.message || data.error);
    } catch (error) {
      console.log("Gagal menghapus riwayat makanan:", error.message);
    }
  } else if (choice.trim() === "2") {
    const confirm = await question("Apakah Anda yakin ingin menghapus SEMUA riwayat makanan Anda? (y/n): ");
    if (confirm.trim().toLowerCase() === "y" || confirm.trim().toLowerCase() === "ya") {
      try {
        const data = await requestAPI("/menu/history", {
          method: "DELETE"
        });
        if (!data) return;
        console.log(data.message || data.error);
      } catch (error) {
        console.log("Gagal menghapus riwayat makanan:", error.message);
      }
    } else {
      console.log("Penghapusan dibatalkan.");
    }
  } else if (choice.trim() === "3") {
    return await showMainMenu();
  } else {
    console.log("Pilihan tidak valid.");
  }

  await showMainMenu();
}

showAuthMenu(); // Memulai aplikasi dengan menu autentikasi
