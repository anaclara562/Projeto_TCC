require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.startsWith('SUBSTITUA_')) {
  console.error('Configuração inválida: defina JWT_SECRET no arquivo .env com pelo menos 32 caracteres.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(v => v.trim()) : false
}));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
  next();
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

function fail(res, status, message) {
  return res.status(status).json({ erro: message });
}

function tokenFor(user) {
  return jwt.sign({ sub: String(user.usuario_idusuario), cadastroId: user.idcadastro }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

function auth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return fail(res, 401, 'Autenticação necessária.');
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return fail(res, 401, 'Token inválido ou expirado.');
  }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 150 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validCpf(value) {
  return typeof value === 'string' && value.replace(/\D/g, '').length === 11;
}

function publicUser(row) {
  return {
    id: row.idcadastro,
    usuarioId: row.usuario_idusuario,
    nome: row.nome_do_usuario,
    email: row.email,
    nivelId: row.nivel_idnivel,
    rankingId: row.nivel_ranking_idranking
  };
}

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', api: 'leBrasil', banco: 'conectado' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/register', registerLimiter, async (req, res, next) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const cpf = typeof req.body.cpf === 'string' ? req.body.cpf.replace(/\D/g, '') : '';
  const senha = req.body.senha;
  const confirmarSenha = req.body.confirmarSenha;

  if (nome.length < 2 || nome.length > 150) return fail(res, 400, 'Informe um nome entre 2 e 150 caracteres.');
  if (!validEmail(email)) return fail(res, 400, 'Informe um e-mail válido.');
  if (!validCpf(cpf)) return fail(res, 400, 'Informe um CPF com 11 dígitos.');
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 200) {
    return fail(res, 400, 'A senha deve ter entre 8 e 200 caracteres.');
  }
  if (typeof confirmarSenha !== 'string' || senha !== confirmarSenha) return fail(res, 400, 'As senhas não coincidem.');

  let conn;
  let lockAcquired = false;
  try {
    conn = await pool.getConnection();
    const [lockRows] = await conn.query("SELECT GET_LOCK('lebrasil_register_user', 10) AS acquired");
    lockAcquired = lockRows[0].acquired === 1;
    if (!lockAcquired) return fail(res, 503, 'Não foi possível iniciar o cadastro agora. Tente novamente.');

    await conn.beginTransaction();
    const [existing] = await conn.execute(
      'SELECT idcadastro FROM usuario WHERE email = ? OR cpf = ? OR nome_do_usuario = ? LIMIT 1',
      [email, cpf, nome]
    );
    if (existing.length) {
      await conn.rollback();
      return fail(res, 409, 'Já existe uma conta com esse e-mail, CPF ou nome de usuário.');
    }

    const [[uMax]] = await conn.query('SELECT COALESCE(MAX(idcadastro), 0) + 1 AS nextId FROM usuario');
    const [[uidMax]] = await conn.query('SELECT COALESCE(MAX(usuario_idusuario), 0) + 1 AS nextId FROM usuario');
    const [[nivelMax]] = await conn.query('SELECT COALESCE(MAX(idnivel), 0) + 1 AS nextId FROM nivel');
    const [[rankingMax]] = await conn.query('SELECT COALESCE(MAX(idranking), 0) + 1 AS nextId FROM ranking');
    const [[loginMax]] = await conn.query('SELECT COALESCE(MAX(idLogin), 0) + 1 AS nextId FROM login');

    const idcadastro = Number(uMax.nextId);
    const usuarioId = Number(uidMax.nextId);
    const nivelId = Number(nivelMax.nextId);
    const rankingId = Number(rankingMax.nextId);
    const loginId = Number(loginMax.nextId);
    const passwordHash = await bcrypt.hash(senha, 12);

    await conn.execute('INSERT INTO ranking (idranking) VALUES (?)', [rankingId]);
    await conn.execute(
      'INSERT INTO nivel (idnivel, pontuacao, progresso_de_evolucao, ranking_idranking) VALUES (?, 0, 0, ?)',
      [nivelId, rankingId]
    );
    await conn.execute(
      `INSERT INTO usuario
       (idcadastro, nome_do_usuario, email, cpf, senha1, senha2, usuario_idusuario, nivel_idnivel, nivel_ranking_idranking)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idcadastro, nome, email, cpf, passwordHash, passwordHash, usuarioId, nivelId, rankingId]
    );
    await conn.execute(
      `INSERT INTO login (idLogin, email, senha, usuario_idusuario, usuario_idcadastro, usuario_usuario_idusuario)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [loginId, email, passwordHash, usuarioId, idcadastro, usuarioId]
    );

    await conn.commit();
    const user = { idcadastro, usuario_idusuario: usuarioId, nome_do_usuario: nome, email, nivel_idnivel: nivelId, nivel_ranking_idranking: rankingId };
    return res.status(201).json({ mensagem: 'Conta criada com sucesso.', usuario: publicUser(user), token: tokenFor(user) });
  } catch (error) {
    try { await conn.rollback(); } catch {}
    next(error);
  } finally {
    if (lockAcquired) {
      try { await conn.query("SELECT RELEASE_LOCK('lebrasil_register_user')"); } catch {}
    }
    if (conn) conn.release();
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const senha = req.body.senha;
  if (!validEmail(email) || typeof senha !== 'string' || !senha) return fail(res, 400, 'Informe e-mail e senha válidos.');

  try {
    const [rows] = await pool.execute(
      `SELECT u.idcadastro, u.usuario_idusuario, u.nome_do_usuario, u.email,
              u.senha1, u.nivel_idnivel, u.nivel_ranking_idranking, l.senha AS login_senha
       FROM usuario u JOIN login l ON l.usuario_idcadastro = u.idcadastro
       WHERE u.email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) return fail(res, 401, 'E-mail ou senha incorretos.');

    const user = rows[0];
    const stored = user.login_senha || user.senha1;
    let passwordMatches = false;
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      passwordMatches = await bcrypt.compare(senha, stored);
    } else {
      // Compatibilidade temporária com contas antigas que possam conter senha em texto puro.
      passwordMatches = stored === senha;
      if (passwordMatches) {
        const upgraded = await bcrypt.hash(senha, 12);
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute('UPDATE usuario SET senha1 = ?, senha2 = ? WHERE idcadastro = ?', [upgraded, upgraded, user.idcadastro]);
          await conn.execute('UPDATE login SET senha = ? WHERE usuario_idcadastro = ?', [upgraded, user.idcadastro]);
          await conn.commit();
        } catch (e) { await conn.rollback(); throw e; }
        finally { conn.release(); }
      }
    }
    if (!passwordMatches) return fail(res, 401, 'E-mail ou senha incorretos.');

    const safeUser = publicUser(user);
    return res.json({ mensagem: 'Login realizado com sucesso.', usuario: safeUser, token: tokenFor(user) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT idcadastro, usuario_idusuario, nome_do_usuario, email, nivel_idnivel, nivel_ranking_idranking
       FROM usuario WHERE idcadastro = ? AND usuario_idusuario = ? LIMIT 1`,
      [req.auth.cadastroId, Number(req.auth.sub)]
    );
    if (!rows.length) return fail(res, 404, 'Usuário não encontrado.');
    res.json({ usuario: publicUser(rows[0]) });
  } catch (error) { next(error); }
});

app.get('/api/books', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT idlivros AS id, titulo, genero, autor, progresso_do_livro AS progresso
       FROM livros WHERE usuario_idusuario = ? ORDER BY titulo`,
      [Number(req.auth.sub)]
    );
    res.json({ livros: rows });
  } catch (error) { next(error); }
});

app.post('/api/books', auth, async (req, res, next) => {
  const titulo = typeof req.body.titulo === 'string' ? req.body.titulo.trim() : '';
  const autor = typeof req.body.autor === 'string' ? req.body.autor.trim() : '';
  const genero = typeof req.body.genero === 'string' ? req.body.genero.trim() : null;
  if (!titulo || titulo.length > 45) return fail(res, 400, 'O título é obrigatório e deve ter até 45 caracteres.');
  if (!autor || autor.length > 45) return fail(res, 400, 'O autor é obrigatório e deve ter até 45 caracteres.');
  if (genero && genero.length > 45) return fail(res, 400, 'O gênero deve ter até 45 caracteres.');
  try {
    const userId = Number(req.auth.sub);
    const [existing] = await pool.execute(
      'SELECT idlivros FROM livros WHERE usuario_idusuario = ? AND titulo = ? LIMIT 1', [userId, titulo]
    );
    if (existing.length) return fail(res, 409, 'Esse livro já está cadastrado para este usuário.');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[next]] = await conn.query('SELECT COALESCE(MAX(idlivros), 0) + 1 AS id FROM livros');
      const id = Number(next.id);
      await conn.execute(
        'INSERT INTO livros (idlivros, titulo, genero, autor, progresso_do_livro, usuario_idusuario) VALUES (?, ?, ?, ?, 0, ?)',
        [id, titulo, genero, autor, userId]
      );
      await conn.commit();
      return res.status(201).json({ mensagem: 'Livro adicionado.', livro: { id, titulo, genero, autor, progresso: 0 } });
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  } catch (error) { next(error); }
});

app.patch('/api/books/:id/progress', auth, async (req, res, next) => {
  const id = Number(req.params.id);
  const progress = Number(req.body.progresso);
  if (!Number.isInteger(id) || id < 1) return fail(res, 400, 'Identificador de livro inválido.');
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) return fail(res, 400, 'O progresso deve estar entre 0 e 100.');
  try {
    const [result] = await pool.execute(
      'UPDATE livros SET progresso_do_livro = ? WHERE idlivros = ? AND usuario_idusuario = ?',
      [Math.round(progress), id, Number(req.auth.sub)]
    );
    if (!result.affectedRows) return fail(res, 404, 'Livro não encontrado para este usuário.');
    res.json({ mensagem: 'Progresso atualizado.', id, progresso: Math.round(progress) });
  } catch (error) { next(error); }
});

app.get('/api/ranking', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.nome_do_usuario AS nome, n.idnivel AS nivel, n.pontuacao AS pontuacao
       FROM usuario u JOIN nivel n
         ON n.idnivel = u.nivel_idnivel AND n.ranking_idranking = u.nivel_ranking_idranking
       ORDER BY n.pontuacao DESC, n.idnivel DESC LIMIT 50`
    );
    res.json({ ranking: rows });
  } catch (error) { next(error); }
});

// Compatibiliza links legados que apontam para subpastas não incluídas no ZIP:
 // os HTML enviados estão na raiz deste pacote.
const pageAliases = new Map([
  ['/', '/PaginaInicial.html'],
  ['/cadastro.html', '/Cadastro.html'],
  ['/login.html', '/Login.html'],
  ['/pesquisa.html', '/Pesquisa.html'],
  ['/redacao.html', '/Redacao.html'],
  ['/nivel.html', '/Nivel.html'],
  ['/perfil.html', '/Perfil.html'],
  ['/PAGES/PaginaInicial.html', '/PaginaInicial.html'],
  ['/PAGES/Login.html', '/Login.html'],
  ['/PAGES/Cadastro.html', '/Cadastro.html'],
  ['/FRONTEND/PAGES/paginaPrincipal.html', '/paginaPrincipal.html'],
  ['/FRONTEND/PAGES/Pesquisa.html', '/Pesquisa.html'],
  ['/FRONTEND/PAGES/Redacao.html', '/Redacao.html'],
  ['/FRONTEND/PAGES/Nivel.html', '/Nivel.html'],
  ['/FRONTEND/PAGES/Perfil.html', '/Perfil.html'],
  ['/PAGES/Livros/Dom_Casmurro/Dom_Casmurro.html', '/Dom_Casmurro.html'],
  ['/PAGES/Livros/Iracema/Iracema.html', '/Iracema.html'],
  ['/PAGES/Livros/O_Cortiço/O_Cortiço.html', '/O_Cortiço.html'],
  ['/PAGES/Livros/O_Guarani/O_Guarani.html', '/O_Guarani.html'],
  ['/PAGES/Livros/O_Primo_Basílio/O_Primo_Basílio.html', '/O_Primo_Basílio.html'],
  ['/PAGES/Livros/Vidas_Secas/Vidas_Secas.html', '/Vidas_Secas.html']
]);
app.use((req, res, next) => {
  const alias = pageAliases.get(decodeURI(req.path));
  if (alias) req.url = alias + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  next();
});

// Não exponha arquivos-fonte, dumps SQL, coleções de teste ou configurações via HTTP.
app.use((req, res, next) => {
  const pathname = decodeURI(req.path).replace(/\\/g, '/');
  if (
    /^\/(?:backend|database|insomnia)(?:\/|$)/i.test(pathname) ||
    /^\/(?:package(?:-lock)?\.json|README-INTEGRACAO\.md|\.env(?:\.example)?)$/i.test(pathname) ||
    /(?:^|\/)\.env(?:\.example)?$/i.test(pathname)
  ) {
    return fail(res, 404, 'Rota não encontrada.');
  }
  next();
});

// Serve as páginas e os recursos públicos do projeto.
app.use(express.static(path.resolve(__dirname, '..'), { index: false, dotfiles: 'ignore' }));

app.use((req, res) => fail(res, 404, 'Rota não encontrada.'));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && Object.prototype.hasOwnProperty.call(error, 'body')) {
    return fail(res, 400, 'O corpo da requisição deve conter JSON válido.');
  }
  if (error && error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'Já existe um registro com esses dados.');
  if (error && error.code === 'ER_NO_SUCH_TABLE') return fail(res, 503, 'A estrutura do banco não está pronta. Execute a migração SQL documentada.');
  console.error('Erro interno:', error.code || error.name || 'UNKNOWN');
  return fail(res, 500, 'Erro interno do servidor.');
});

app.listen(PORT, HOST, () => {
  console.log(`lêBrasil disponível em http://${HOST}:${PORT}`);
});
