const express = require('express');
const router = express.Router();
const pool = require('../db');
const passport = require('passport');


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}


router.post('/new', async (req, res) => {
  const { content, nomeusuario } = req.body;
  console.log('linha 17 postRoutes')

  try {

    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [nomeusuario]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado' });
    }

    const userId = userResult.rows[0].id;


    await pool.query('INSERT INTO posts (content, user_id) VALUES ($1, $2)', [content, userId]);

    res.redirect('/home');
  } catch (error) {
    console.error('Erro ao criar postagem:', error);
    res.status(500).send('Erro ao criar postagem');
  }
});


router.get('/', async (req, res) => {
  try {
    const postsResult  = await pool.query(`
        SELECT p.*, u.username, u.profile_picture,
             COALESCE(l.like_count, 0) AS like_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS like_count
        FROM likes
        GROUP BY post_id
      ) l ON p.id = l.post_id
      ORDER BY p.created_at DESC
      `);
      const posts = postsResult.rows.map(post => ({
        id: post.id,
        content: post.content,
        username: post.username,
        profile_picture: post.profile_picture,
        like_count: post.like_count,
        // Adicione outros campos que você deseja retornar
      }));
    res.json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    res.status(500).json({ message: 'Erro ao buscar posts' });
  }
});

router.post('/like/:postId', async (req, res) => {
  const { postId } = req.params;
  const { nomeusuario } = req.body; // Extraindo o nome de usuário do corpo da requisição
  try {
      const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [nomeusuario]);

      if (userResult.rows.length === 0) {
          return res.status(400).json({ message: 'Usuário não encontrado!' });
      }

      const userId = userResult.rows[0].id;

      const existingLike = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

      if (existingLike.rows.length > 0) {
          return res.status(400).json({ message: 'Você já curtiu este post!' });
      }

      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);

      res.status(200).json({ message: 'Like adicionado com sucesso!' });
  } catch (error) {
      console.error('Erro ao adicionar like:', error);
      res.status(500).json({ message: 'Erro ao curtir o post' });
  }
});

// Verifica se o usuário já curtiu o post
router.get('/liked/:postId/:username', async (req, res) => {
  const { postId, username } = req.params;

  try {
    // Verifica se o usuário existe
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado!' });
    }

    const userId = userResult.rows[0].id;

    // Verifica se o usuário já curtiu o post
    const existingLike = await pool.query('SELECT * FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    if (existingLike.rows.length > 0) {
      return res.status(200).json({ liked: true });
    } else {
      return res.status(200).json({ liked: false });
    }
  } catch (error) {
    console.error('Erro ao verificar curtida:', error);
    res.status(500).json({ message: 'Erro ao verificar curtida' });
  }
});

// Remover like
router.delete('/unlike/:postId/:username', async (req, res) => {
  const { postId, username } = req.params;

  try {
    // Verifica se o usuário existe
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Usuário não encontrado!' });
    }

    const userId = userResult.rows[0].id;

    // Deleta a curtida do banco de dados
    await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);

    res.status(200).json({ message: 'Like removido com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover like:', error);
    res.status(500).json({ message: 'Erro ao remover curtida' });
  }
});



router.post('/:postId/comments', async (req, res) => {
  const { postId } = req.params;
  const userId = req.session.userId; // Assumindo que o userId esteja na sessão
  const { comment } = req.body; // O comentário enviado no corpo da requisição

  try {
    // Inserir o comentário no banco de dados
    await queryDB(
      'INSERT INTO comments (post_id, user_id, comment, created_at) VALUES ($1, $2, $3, NOW())',
      [postId, userId, comment]
    );

    res.status(200).json({ message: 'Comentário adicionado com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    res.status(500).json({ message: 'Erro ao adicionar o comentário' });
  }
});

router.get('/:postId/comments', async (req, res) => {
  const { postId } = req.params;

  try {
    const comments = await queryDB('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at ASC', [postId]);
    res.status(200).json(comments);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    res.status(500).json({ message: 'Erro ao buscar comentários' });
  }
});

router.get('/likes/:postId', async (req, res) => {
  const { postId } = req.params;

  try {
    const likeCount = await pool.query('SELECT COUNT(*) FROM likes WHERE post_id = $1', [postId]);
    console.log("linha 179 postRoutes")
    res.status(200).json({ count: likeCount.rows[0].count });
  } catch (error) {
    console.error('Erro ao contar curtidas:', error);
    res.status(500).json({ message: 'Erro ao contar curtidas' });
  }
});

// Rota para adicionar um novo comentário
router.post('/comments/new', async (req, res) => {
  const { content, user_id, post_id } = req.body;

  // Certifique-se de que as entradas sejam válidas
  if (!content || !user_id || !post_id) {
      return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
      const result = await db.query(
          'INSERT INTO comments (user_id, content, created_at, post_id) VALUES ($1, $2, NOW(), $3) RETURNING *',
          [user_id, content, post_id]
      );

      res.status(201).json(result.rows[0]); // Retorna o comentário recém-adicionado
  } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      res.status(500).json({ error: 'Erro ao adicionar o comentário.' });
  }
});



router.get('/comments/:postId', async (req, res) => {
  const { postId } = req.params;
  try {
      const result = await db.query('SELECT * FROM comments WHERE post_id = $1 ORDER BY created_at DESC', [postId]);
      res.json(result.rows);
  } catch (error) {
      console.error('Erro ao obter comentários:', error);
      res.status(500).json({ message: 'Erro ao obter comentários' });
  }
});

// Excluir um comentário
router.delete('/comments/:commentId', async (req, res) => {
  const { commentId } = req.params;
  const user_id = req.user.id; // Supondo que você tenha um middleware que autentique o usuário

  try {
      const result = await db.query('DELETE FROM comments WHERE id = $1 AND user_id = $2', [commentId, user_id]);
      if (result.rowCount > 0) {
          res.status(204).send();
      } else {
          res.status(404).json({ message: 'Comentário não encontrado ou não autorizado' });
      }
  } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      res.status(500).json({ message: 'Erro ao excluir comentário' });
  }
});
module.exports = router;
