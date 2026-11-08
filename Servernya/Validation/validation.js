const { buatError } = require('../Utils/menu.js');

function InputanRegister(input){
    if (!input || typeof input !== 'object') {
        throw buatError(400, 'Data input tidak valid');
    }
    if(!input.username || !input.password){
        throw buatError(400, 'Username dan password wajib diisi');
    }
    if(typeof input.username !== 'string' || input.username.trim().length < 3 || typeof input.password !== 'string' || input.password.length < 8){
        throw buatError(400, 'Username minimal 3 karakter dan password minimal 8 karakter');
    }
}

function InputanLogin(input){
    if (!input || typeof input !== 'object') {
        throw buatError(400, 'Data input tidak valid');
    }
    if(!input.username || !input.password){
        throw buatError(400, 'Username dan password wajib diisi');
    }
    if(typeof input.username !== 'string' || input.username.trim().length < 3){
        throw buatError(400, 'Username minimal 3 karakter');
    }
    if(typeof input.password !== 'string' || input.password.length < 8){
        throw buatError(400, 'Password minimal 8 karakter');
    }
}

function InputanAddFood(input){
    if (!input || typeof input !== 'object') {
        throw buatError(400, 'Data input tidak valid');
    }
    if(!input.name || typeof input.name !== 'string' || input.name.trim().length < 3){
        throw buatError(400, 'Nama makanan minimal 3 karakter');
    }

    // Validasi keberadaan seluruh field numerik (porsi, kalori, protein, lemak, karbohidrat)
    const requiredFields = ['portion', 'calories', 'protein', 'fat', 'carbs'];
    for (const field of requiredFields) {
        if (input[field] === undefined || input[field] === null || input[field] === '') {
            throw buatError(400, `Field '${field}' wajib diisi`);
        }
        const val = Number(input[field]);
        if (isNaN(val)) {
            throw buatError(400, `Field '${field}' harus berupa angka valid`);
        }
    }

    const portion = Number(input.portion);
    const calories = Number(input.calories);
    const protein = Number(input.protein);
    const fat = Number(input.fat);
    const carbs = Number(input.carbs);

    if(portion <= 0){
        throw buatError(400, 'Porsi harus lebih besar dari 0');
    }
    if(calories < 0){
        throw buatError(400, 'Kalori tidak boleh bernilai negatif');
    }
    if(protein < 0){
        throw buatError(400, 'Protein tidak boleh bernilai negatif');
    }
    if(fat < 0){
        throw buatError(400, 'Lemak tidak boleh bernilai negatif');
    }
    if(carbs < 0){
        throw buatError(400, 'Karbohidrat tidak boleh bernilai negatif');
    }
}

module.exports = {
    InputanRegister,
    InputanLogin,
    InputanAddFood
};
