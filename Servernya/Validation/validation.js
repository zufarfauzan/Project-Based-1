const { buatError } = require('../Utils/menu.js');


function InputanRegister(input){
    if(!input.username || !input.password){
        throw buatError(400, 'Username dan password wajib diisi');
    }
    if(input.username.length < 3 || input.password.length < 8){
        throw buatError(400, 'Username minimal 3 karakter dan password minimal 8 karakter');
    }
}

function InputanLogin(input){
    if(!input.username || !input.password){
        throw buatError(400, 'Username dan password wajib diisi');
    }
    if(input.username.length < 3){
        throw buatError(400, 'Username minimal 3 karakter dan password minimal 8 karakter');
    }
}

function InputanAddFood(input){
    if(!input.name || !input.calories || !input.protein || !input.fat || !input.carbs){
        throw buatError(400, 'Semua field wajib diisi');
    }
    if(input.name.length < 3){
        throw buatError(400, 'Nama makanan minimal 3 karakter');
    }
    if(input.portion <= 0){
        throw buatError(400, 'Porsi harus lebih besar dari 0');
    }
    if(input.calories <= 0){
        throw buatError(400, 'Kalori harus lebih besar dari 0');
    }
    if(input.protein <= 0){
        throw buatError(400, 'Protein harus lebih besar dari 0');
    }
    if(input.fat <= 0){
        throw buatError(400, 'Lemak harus lebih besar dari 0');
    }
    if(input.carbs <= 0){
        throw buatError(400, 'Karbohidrat harus lebih besar dari 0');
    }

}


module.exports = {
    InputanRegister,
    InputanLogin,
    InputanAddFood
};
