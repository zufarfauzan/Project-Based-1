// Controller/authController.js
const authService = require('../Service/auth-service.js');
const { bacaBody, kirimJSON, kirimError } = require('../Utils/menu.js');
const {createToken} = require('../Utils/token.js');
const { InputanRegister, InputanLogin } = require('../Validation/validation.js');

// Controller untuk Registrasi User
async function register(req, res) {
    try {
        const input = await bacaBody(req);
        InputanRegister(input);

        const result = await authService.registerUser(input.username, input.password);
        kirimJSON(res, 201, { 
            message: 'Registrasi akun berhasil' 
        });
    } catch (err) {
        return kirimError(res, err.statusCode || 500, err.message);
    }
}

// Controller untuk Login User
async function login(req, res) {
    try {
        const input = await bacaBody(req);
        InputanLogin(input);

        const user = await authService.loginUser(input.username, input.password);
        const token = createToken(user);
        kirimJSON(res, 200, { 
            message: 'Login berhasil',
            token: token
        });
    } catch (err) {
        return kirimError(res, err.statusCode || 500, err.message);
    }
}

module.exports = {
    register,
    login
};