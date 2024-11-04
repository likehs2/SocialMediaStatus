const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const multer = require('multer');
const path = require('path');


const JWT_SECRET = 'sua_chave_secreta_super_secreta';


router.get('/register', (req, res) => {
  res.render('register');
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/avatars'); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); 
  }
});


const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Arquivos permitidos são imagens!');
  }
};


const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } 
});


router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  const { nomeusuario } = req.body; 
  const file = req.file; 

  if (!nomeusuario) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    
    if (!file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada!' });
    }

    
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [nomeusuario]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id; 

    const avatarPath = `/uploads/avatars/${file.filename}`; 

    
    await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [avatarPath, userId]);

    
    res.json({ avatar: avatarPath });
  } catch (error) {
    console.error('Erro ao fazer upload do avatar:', error);
    res.status(500).json({ error: 'Erro ao fazer upload do avatar' });
  }
});

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
      [username, email, hashedPassword]
    );
    res.redirect('/users/login');
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});


router.get('/login', (req, res) => {
  res.render('login');
});


router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log("Linha 99 useRoutes.js")
  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }

    
    const token = jwt.sign(
      { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    
    res.json({ token });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

router.post('/carregaFoto', async (req, res) => {
  const { username } = req.body;
  console.log("Linha 140 useRoutes.js")
  try {
    const userPicture = await pool.query('select profile_picture from users WHERE username = $1', [username]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }
    res.status(201).json(userPicture)
  } catch (error) {
    console.error('Erro ao enviar foto:', error);
    res.status(500).json({ message: 'Erro ao enviar foto' });
  }
});


router.get('/profile', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/users/login');
  }
  res.render('profile', { user: req.user });
});


router.get('/logout', (req, res) => {
  req.logout(() => {
    req.flash('success', 'Você saiu com sucesso.');
    res.redirect('/');
  });
});

module.exports = router;
