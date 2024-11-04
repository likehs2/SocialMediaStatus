const express = require('express');
const session = require('express-session');
const passport = require('passport'); 
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const pool = require('./db'); 
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes'); 
const passportConfig = require('./passport'); 
const jwt = require('jsonwebtoken');  
const bcrypt = require('bcrypt');
const app = express();
const PORT = 5010;
const path = require('path');


const JWT_SECRET = 'c360848b2c927f333ed22548fa7fb46fecd56e6995601284aa7cc2cc08b75e57';

app.set('view engine', 'ejs');

function authenticateJWT(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.sendStatus(403); 
        }
        req.user = user; 
        next();
      });
    } else {
      res.sendStatus(401); 
    }
  }


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'uTh7@!kZB*xH4#fg81!D1qL9z7',
  resave: false,
  saveUninitialized: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

app.use((err, req, res, next) => {
    console.error(err.stack); 
    res.status(500).send('Algo deu errado!'); 
});

app.use('/users', userRoutes);
app.use('/posts', postRoutes);


app.get('/', async (req, res) => {
  
    res.render('login'); 
  
});


app.get('/home', async (req, res) => {
    try {
      
      const posts = await pool.query('SELECT p.content, p.created_at, u.username, u.profile_picture FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC');
      res.render('home', { posts: posts.rows, user: req.user }); 
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      res.status(500).send('Erro ao buscar posts');
    }
  });

  app.post('/home', async (req, res) => {
    try {
      
      const posts = await pool.query('SELECT p.content, p.created_at, u.username, u.profile_picture FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC');
      res.render('home', { posts: posts.rows, user: req.user }); 
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      res.status(500).send('Erro ao buscar posts');
    }
  });
  

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
