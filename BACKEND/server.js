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
       FROM usuario u LEFT JOIN login l ON l.usuario_idcadastro = u.idcadastro
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

app.put('/api/me', auth, async (req, res, next) => {
  try {
    const nome = String(req.body.nome || '').trim();

    if (!nome) {
      return fail(res, 400, 'Informe um nome válido.');
    }

    await pool.execute(
      `UPDATE usuario
       SET nome_do_usuario = ?
       WHERE idcadastro = ? AND usuario_idusuario = ?`,
      [
        nome,
        req.auth.cadastroId,
        Number(req.auth.sub)
      ]
    );

    const [rows] = await pool.execute(
      `SELECT idcadastro, usuario_idusuario, nome_do_usuario, email,
              nivel_idnivel, nivel_ranking_idranking
       FROM usuario
       WHERE idcadastro = ? AND usuario_idusuario = ?
       LIMIT 1`,
      [
        req.auth.cadastroId,
        Number(req.auth.sub)
      ]
    );

    if (!rows.length) {
      return fail(res, 404, 'Usuário não encontrado.');
    }

    res.json({
      mensagem: 'Nome atualizado com sucesso!',
      usuario: publicUser(rows[0])
    });

  } catch (error) {
    next(error);
  }
});


app.post('/api/login-diario', auth, async (req, res, next) => {
    let conn;

    try {
        const cadastroId = Number(req.auth.cadastroId);
        const usuarioId = Number(req.auth.sub);

        // Data atual no fuso horário de São Paulo.
        const partesData = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date());

        const valores = Object.fromEntries(
            partesData.map(parte => [parte.type, parte.value])
        );

        const hoje = `${valores.year}-${valores.month}-${valores.day}`;

        // Inicia a transação.
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Registra o acesso do dia, sem duplicar.
        await conn.execute(
            `INSERT IGNORE INTO login_diario
             (usuario_idcadastro, data_login)
             VALUES (?, ?)`,
            [cadastroId, hoje]
        );

        // Busca os dias de acesso do usuário.
        const [registros] = await conn.execute(
            `SELECT DATE_FORMAT(data_login, '%Y-%m-%d') AS data_login
             FROM login_diario
             WHERE usuario_idcadastro = ?
             ORDER BY data_login DESC`,
            [cadastroId]
        );

        const datas = registros.map(registro => registro.data_login);

        // Calcula a sequência atual.
        let sequenciaAtual = 0;

        if (datas.length > 0 && datas[0] === hoje) {
            sequenciaAtual = 1;

            for (let i = 1; i < datas.length; i++) {
                const anterior = new Date(`${datas[i - 1]}T00:00:00Z`);
                const atual = new Date(`${datas[i]}T00:00:00Z`);

                const diferenca =
                    (anterior - atual) / 86400000;

                if (diferenca === 1) {
                    sequenciaAtual++;
                } else {
                    break;
                }
            }
        }

        // Conclui o desafio ao atingir 7 dias consecutivos.
        if (sequenciaAtual >= 7) {
            await concluirDesafio(
                conn,
                cadastroId,
                usuarioId,
                "sequencia",
                hoje,
                200
            );
        }

        // Calcula o recorde de sequência.
        let maiorSequencia = 0;
        let sequencia = 0;

        for (let i = 0; i < datas.length; i++) {
            if (i === 0) {
                sequencia = 1;
            } else {
                const anterior = new Date(`${datas[i - 1]}T00:00:00Z`);
                const atual = new Date(`${datas[i]}T00:00:00Z`);

                const diferenca =
                    (anterior - atual) / 86400000;

                if (diferenca === 1) {
                    sequencia++;
                } else {
                    sequencia = 1;
                }
            }

            maiorSequencia = Math.max(maiorSequencia, sequencia);
        }

        await conn.commit();

        return res.json({
            sequenciaAtual,
            maiorSequencia,
            dataHoje: hoje
        });

    } catch (error) {
        if (conn) {
            await conn.rollback();
        }

        next(error);

    } finally {
        if (conn) {
            conn.release();
        }
    }
});





// ==========================================
// DATA ATUAL DE SÃO PAULO
// ==========================================

function obterDataHoje() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valores = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    return `${valores.year}-${valores.month}-${valores.day}`;
}


// ==========================================
// CONCEDER XP COM PROTEÇÃO CONTRA DUPLICIDADE
// ==========================================

async function adicionarXP(
    conn,
    cadastroId,
    usuarioId,
    pontos,
    tipo,
    chaveEvento
) {
    const xp = Number(pontos);

    if (!Number.isInteger(xp) || xp <= 0) {
        throw new Error("Quantidade de XP inválida.");
    }

    // Busca os IDs de nível e ranking do usuário.
    const [usuarios] = await conn.execute(
        `SELECT nivel_idnivel, nivel_ranking_idranking
         FROM usuario
         WHERE idcadastro = ?
           AND usuario_idusuario = ?
         LIMIT 1
         FOR UPDATE`,
        [cadastroId, usuarioId]
    );

    if (usuarios.length === 0) {
        throw new Error("Usuário não encontrado para conceder XP.");
    }

    const nivelId = usuarios[0].nivel_idnivel;
    const rankingId = usuarios[0].nivel_ranking_idranking;

    // Registra o evento. A chave única impede XP duplicado.
    const [resultado] = await conn.execute(
        `INSERT IGNORE INTO xp_eventos (
            usuario_idcadastro,
            usuario_idusuario,
            usuario_nivel_idnivel,
            usuario_nivel_ranking_idranking,
            chave_evento,
            tipo,
            xp_ganho
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            cadastroId,
            usuarioId,
            nivelId,
            rankingId,
            chaveEvento,
            tipo,
            xp
        ]
    );

    if (resultado.affectedRows === 0) {
        return false;
    }

    // Atualiza a pontuação na tabela nivel.
    const [atualizacao] = await conn.execute(
        `UPDATE nivel
         SET pontuacao = pontuacao + ?
         WHERE idnivel = ?
           AND ranking_idranking = ?`,
        [xp, nivelId, rankingId]
    );

    if (atualizacao.affectedRows !== 1) {
        throw new Error("Não foi possível atualizar a pontuação do usuário.");
    }

    return true;

    
}









async function creditarXPLivrosAntigos() {
    let conn;

    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Localiza a Marianny.
        const [usuarios] = await conn.execute(
            `SELECT idcadastro, usuario_idusuario
             FROM usuario
             WHERE nome_do_usuario = ?
             LIMIT 1
             FOR UPDATE`,
            ['Marianny']
        );

        if (!usuarios.length) {
            throw new Error('Marianny não encontrada.');
        }

        const cadastroId = usuarios[0].idcadastro;
        const usuarioId = usuarios[0].usuario_idusuario;

        // Busca as recompensas cadastradas no banco.
        const [livros] = await conn.execute(
            `SELECT idlivros, xp_recompensa
             FROM livros
             WHERE idlivros IN (1, 11)`
        );

        const recompensas = new Map(
            livros.map(livro => [
                Number(livro.idlivros),
                Number(livro.xp_recompensa)
            ])
        );

        for (const idlivro of [1, 11]) {
            const xp = recompensas.get(idlivro);

            if (!Number.isInteger(xp) || xp <= 0) {
                throw new Error(
                    `Recompensa inválida para o livro ${idlivro}.`
                );
            }

            const creditado = await adicionarXP(
                conn,
                cadastroId,
                usuarioId,
                xp,
                'livro',
                `livro_concluido:${idlivro}`
            );

            console.log(
                `Livro ${idlivro}:`,
                creditado ? `${xp} XP creditados` : 'XP já registrado'
            );
        }

        await conn.commit();
        console.log('Migração de XP dos livros finalizada!');

    } catch (erro) {
        if (conn) await conn.rollback();
        console.error('Erro ao creditar XP retroativo:', erro);

    } finally {
        if (conn) conn.release();
    }
}


// ==========================================
// CONCLUIR DESAFIO E CONCEDER RECOMPENSA
// ==========================================



async function concluirDesafio(
    conn,
    cadastroId,
    usuarioId,
    codigo,
    data,
    xp
) {
    const [registros] = await conn.execute(
        `SELECT id_desafio_diario, concluido
         FROM desafios_diarios
         WHERE usuario_idcadastro = ?
           AND usuario_idusuario = ?
           AND codigo = ?
           AND data_desafio = ?
         LIMIT 1
         FOR UPDATE`,
        [cadastroId, usuarioId, codigo, data]
    );

    // Cria ou atualiza o desafio, se necessário.
    if (registros.length === 0) {
        await conn.execute(
            `INSERT INTO desafios_diarios (
                usuario_idcadastro,
                usuario_idusuario,
                codigo,
                data_desafio,
                progresso,
                concluido,
                xp_ganho,
                data_conclusao
            )
            VALUES (?, ?, ?, ?, 1, 1, ?, NOW())`,
            [cadastroId, usuarioId, codigo, data, xp]
        );
    } else if (Number(registros[0].concluido) !== 1) {
        await conn.execute(
            `UPDATE desafios_diarios
             SET progresso = 1,
                 concluido = 1,
                 xp_ganho = ?,
                 data_conclusao = NOW()
             WHERE id_desafio_diario = ?`,
            [xp, registros[0].id_desafio_diario]
        );
    }

    // Verifica e concede o XP mesmo se o desafio já estava concluído.
    // A chave única de xp_eventos impede duplicidade.
    const concedido = await adicionarXP(
        conn,
        cadastroId,
        usuarioId,
        xp,
        "desafio",
        `desafio:${data}:${codigo}`
    );

    // Verifica se os três desafios principais foram concluídos.
    // Verifica se os três desafios principais foram concluídos.
if (codigo !== "bonus") {
    const [concluidos] = await conn.execute(
        `SELECT COUNT(*) AS total
         FROM desafios_diarios
         WHERE usuario_idcadastro = ?
           AND usuario_idusuario = ?
           AND data_desafio = ?
           AND codigo IN ('leitura', 'sequencia', 'explorador')
           AND concluido = 1`,
        [cadastroId, usuarioId, data]
    );

    if (Number(concluidos[0].total) === 3) {
        await concluirDesafio(
            conn,
            cadastroId,
            usuarioId,
            "bonus",
            data,
            500
        );
    }
}

    return concedido;
}




// ==========================================
// REGISTRAR PROGRESSO DIÁRIO DA LEITURA
// ==========================================


// ==========================================
// REGISTRAR PROGRESSO DIÁRIO DA LEITURA
// ==========================================

async function registrarProgressoLeituraDiaria(
    conn,
    cadastroId,
    usuarioId,
    incremento
) {
    const hoje = obterDataHoje();

    const [registros] = await conn.execute(
        `SELECT id_desafio_diario, progresso, concluido
         FROM desafios_diarios
         WHERE usuario_idcadastro = ?
           AND usuario_idusuario = ?
           AND codigo = 'leitura'
           AND data_desafio = ?
         LIMIT 1
         FOR UPDATE`,
        [cadastroId, usuarioId, hoje]
    );

    // Se já foi concluído, mantém 10/10.
    if (registros.length > 0 && Number(registros[0].concluido) === 1) {
        return 10;
    }

    const progressoAnterior = registros.length > 0
        ? Number(registros[0].progresso) || 0
        : 0;

    const pontosNovos = Math.max(
        0,
        Math.floor(Number(incremento) || 0)
    );

    const novoProgresso = Math.min(
        10,
        progressoAnterior + pontosNovos
    );

    const concluido = novoProgresso >= 10 ? 1 : 0;

    if (registros.length === 0) {
        await conn.execute(
            `INSERT INTO desafios_diarios (
                usuario_idcadastro,
                usuario_idusuario,
                codigo,
                data_desafio,
                progresso,
                concluido,
                xp_ganho
            )
            VALUES (?, ?, 'leitura', ?, ?, ?, 0)`,
            [
                cadastroId,
                usuarioId,
                hoje,
                novoProgresso,
                concluido
            ]
        );
    } else {
        await conn.execute(
            `UPDATE desafios_diarios
             SET progresso = ?,
                 concluido = ?
             WHERE id_desafio_diario = ?`,
            [
                novoProgresso,
                concluido,
                registros[0].id_desafio_diario
            ]
        );
    }

    return novoProgresso;
}

async function registrarAtividade(
    conn,
    cadastroId,
    tipo,
    descricao,
    pontos = 0
) {
    await conn.execute(
        `INSERT INTO atividades_recentes (
            usuario_idcadastro,
            tipo,
            descricao,
            pontos
        )
        VALUES (?, ?, ?, ?)`,
        [
            cadastroId,
            tipo,
            descricao,
            pontos
        ]
    );
}





// ==========================================
// CONSULTAR DESAFIOS DO DIA
// ==========================================

app.get('/api/desafios', auth, async (req, res, next) => {
    try {
        const cadastroId = Number(req.auth.cadastroId);
        const usuarioId = Number(req.auth.sub);
        const hoje = obterDataHoje();

        // Busca o progresso de leitura dos livros do usuário.
        const [progressoLivros] = await pool.execute(
            `SELECT COALESCE(MAX(progresso), 0) AS maiorProgresso
             FROM progresso_leitura
             WHERE usuario_idcadastro = ?`,
            [cadastroId]
        );

        const progressoLeitura = Math.min(
            10,
            Number(progressoLivros[0].maiorProgresso) || 0
        );

        // Busca os desafios registrados no dia atual.
        const [registros] = await pool.execute(
            `SELECT codigo, progresso, concluido, xp_ganho
             FROM desafios_diarios
             WHERE usuario_idcadastro = ?
               AND usuario_idusuario = ?
               AND data_desafio = ?`,
            [cadastroId, usuarioId, hoje]
        );

        // Busca os últimos dias em que o usuário entrou.
        const [diasLogin] = await pool.execute(
            `SELECT DATE_FORMAT(data_login, '%Y-%m-%d') AS data_login
            FROM login_diario
            WHERE usuario_idcadastro = ?
            ORDER BY data_login DESC
            LIMIT 7`,
            [cadastroId]
        );

        // Calcula quantos dias consecutivos, incluindo hoje.
        const diasRegistrados = new Set(
            diasLogin.map(item => item.data_login)
        );

        let sequenciaAtual = 0;

        const dataVerificada = new Date(`${hoje}T00:00:00Z`);

        while (sequenciaAtual < 7) {
            const dataFormatada = dataVerificada.toISOString().slice(0, 10);

            if (!diasRegistrados.has(dataFormatada)) {
                break;
            }

            sequenciaAtual++;
            dataVerificada.setUTCDate(dataVerificada.getUTCDate() - 1);
        }

        // Primeiro declara o objeto de desafios.
        const desafios = {
            leitura: {
                progresso: 0,
                concluido: false,
                xp: 100
            },
            sequencia: {
                progresso: 0,
                concluido: false,
                xp: 200
            },
            explorador: {
                progresso: 0,
                concluido: false,
                xp: 120
            },
            bonus: {
                progresso: 0,
                concluido: false,
                xp: 500
            }
        };

        // Atualiza os dados dos desafios registrados.
        registros.forEach(registro => {
            const desafio = desafios[registro.codigo];

            if (!desafio) return;

            desafio.concluido = Number(registro.concluido) === 1;
            desafio.progresso = Number(registro.progresso) || 0;
        });

        // Se a leitura foi concluída, garante 10/10.
        if (desafios.explorador.concluido) {
            desafios.explorador.progresso = 1;
        }

        // Calcula o bônus com base nos três desafios principais.
        const totalConcluidos = [
            "leitura",
            "sequencia",
            "explorador"
        ].filter(codigo => desafios[codigo].concluido).length;

        desafios.bonus.progresso = totalConcluidos;

        desafios.sequencia.progresso = Math.min(7, sequenciaAtual);

        return res.json({
            data: hoje,
            desafios
        });

    } catch (erro) {
        next(erro);
    }
});



app.get('/api/atividades-recentes', auth, async (req, res, next) => {
    try {
        const [atividades] = await pool.execute(
            `SELECT
                idatividade,
                tipo,
                descricao,
                pontos,
                data_atividade
             FROM atividades_recentes
             WHERE usuario_idcadastro = ?
             ORDER BY data_atividade DESC, idatividade DESC
             LIMIT 20`,
            [req.auth.cadastroId]
        );

        res.json({ atividades });

    } catch (erro) {
        next(erro);
    }
});



// ==========================================
// SALVAR PROGRESSO E CONCEDER XP DOS DESAFIOS
// ==========================================

// ==========================================
// SALVAR PROGRESSO E CONCEDER XP DOS DESAFIOS
// ==========================================

app.put('/api/progresso-leitura/reiniciar', auth, async (req, res, next) => {
    let conn;

    try {
        const cadastroId = Number(req.auth.cadastroId);
        const idlivros = Number(req.body.idlivros);

        if (
            !cadastroId ||
            !Number.isInteger(idlivros) ||
            idlivros <= 0
        ) {
            return fail(res, 400, 'Dados inválidos para reiniciar a leitura.');
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [resultado] = await conn.execute(
            `UPDATE progresso_leitura
             SET progresso_atual = 0
             WHERE usuario_idcadastro = ?
               AND idlivros = ?`,
            [cadastroId, idlivros]
        );

        if (resultado.affectedRows === 0) {
            await conn.rollback();
            return fail(res, 404, 'Progresso do livro não encontrado.');
        }

        await conn.commit();

        return res.json({
            mensagem: 'Leitura reiniciada com sucesso!',
            progresso: 0,
            maiorProgresso: 100
        });

    } catch (erro) {
        if (conn) {
            try {
                await conn.rollback();
            } catch {}
        }

        next(erro);

    } finally {
        if (conn) {
            conn.release();
        }
    }
});




app.put('/api/progresso-leitura', auth, async (req, res, next) => {
    let conn;

    try {
        const cadastroId = Number(req.auth.cadastroId);
        const usuarioId = Number(req.auth.sub);
        const idlivros = Number(req.body.idlivros);
        const progresso = Number(req.body.progresso);

        if (
            !cadastroId ||
            !usuarioId ||
            !Number.isInteger(idlivros) ||
            idlivros <= 0 ||
            !Number.isFinite(progresso) ||
            progresso < 0 ||
            progresso > 100
        ) {
            return fail(res, 400, 'Dados de progresso inválidos.');
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const hoje = obterDataHoje();

        // 1. Busca o maior progresso histórico do livro.
        const [anteriores] = await conn.execute(
            `SELECT progresso, progresso_atual
            FROM progresso_leitura
            WHERE usuario_idcadastro = ?
              AND idlivros = ?
            LIMIT 1
            FOR UPDATE`,
            [cadastroId, idlivros]
        );

        const progressoAtualAnterior = anteriores.length > 0
          ? Number(anteriores[0].progresso_atual) || 0
          : 0;

        const progressoAnterior = anteriores.length > 0
            ? Number(anteriores[0].progresso) || 0
            : 0;

            console.log("DEBUG CONCLUSÃO:", {
                progressoRecebido: progresso,
                progressoAtualAnterior,
                deveConcluir: progressoAtualAnterior < 100 && progresso >= 100
            });

        // O progresso histórico nunca diminui.
        const novoProgresso = Math.max(
            progressoAnterior,
            progresso
        );



        // 2. Salva o progresso histórico e a posição atual.
        await conn.execute(
            `INSERT INTO progresso_leitura
                (usuario_idcadastro, idlivros, progresso, progresso_atual)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                progresso = GREATEST(progresso, VALUES(progresso)),
                progresso_atual = VALUES(progresso_atual)`,
            [cadastroId, idlivros, novoProgresso, progresso]
        );

        // 3. Cria o registro diário do livro, se ainda não existir.
        await conn.execute(
            `INSERT IGNORE INTO progresso_leitura_diaria (
                usuario_idcadastro,
                idlivros,
                data_leitura,
                progresso_maximo
            )
            VALUES (?, ?, ?, 0)`,
            [cadastroId, idlivros, hoje]
        );

        // 4. Bloqueia o registro diário para evitar contagem duplicada.
        const [registrosDiarios] = await conn.execute(
            `SELECT progresso_maximo
             FROM progresso_leitura_diaria
             WHERE usuario_idcadastro = ?
               AND idlivros = ?
               AND data_leitura = ?
             LIMIT 1
             FOR UPDATE`,
            [cadastroId, idlivros, hoje]
        );

        const progressoMaximoDiario = Number(
            registrosDiarios[0].progresso_maximo
        ) || 0;

        // O progresso diário também nunca diminui.
        const novoMaximoDiario = Math.max(
            progressoMaximoDiario,
            progresso
        );

        // Conta somente pontos percentuais inteiros ainda não contabilizados.
        const incrementoDiario = Math.max(
            0,
            Math.floor(novoMaximoDiario) -
            Math.floor(progressoMaximoDiario)
        );

        // 5. Atualiza o maior progresso alcançado hoje.
        await conn.execute(
            `UPDATE progresso_leitura_diaria
             SET progresso_maximo = ?
             WHERE usuario_idcadastro = ?
               AND idlivros = ?
               AND data_leitura = ?`,
            [
                novoMaximoDiario,
                cadastroId,
                idlivros,
                hoje
            ]
        );

        // 6. Atualiza o desafio diário de leitura.
        const progressoDiario = await registrarProgressoLeituraDiaria(
            conn,
            cadastroId,
            usuarioId,
            incrementoDiario
        );

        let xpLeitura = false;
        let xpExplorador = false;
        let xpLivro = false;

        // 7. Conclui o desafio ao atingir 10 pontos no dia.
        if (progressoDiario >= 10) {
            xpLeitura = await concluirDesafio(
                conn,
                cadastroId,
                usuarioId,
                'leitura',
                hoje,
                100
            );
        }

        // 8. Registra a primeira vez que o usuário inicia este livro.
        if (progressoAnterior === 0 && progresso >= 1) {

            const concedido = await concluirDesafio(
                conn,
                cadastroId,
                usuarioId,
                'explorador',
                hoje,
                120
            );

            xpExplorador = concedido;

            const [livros] = await conn.execute(
                `SELECT titulo
                FROM livros
                WHERE idlivros = ?
                LIMIT 1`,
                [idlivros]
            );

            if (livros.length > 0) {
                await registrarAtividade(
                    conn,
                    cadastroId,
                    'inicio',
                    `Iniciou "${livros[0].titulo}"`,
                    concedido ? 120 : 0
                );
            }
        }

        // 9. Registra a conclusão de cada leitura ou releitura.
        if (progressoAtualAnterior < 100 && progresso >= 100) {

            const [livros] = await conn.execute(
                `SELECT titulo, xp_recompensa
                FROM livros
                WHERE idlivros = ?
                LIMIT 1`,
                [idlivros]
            );

            if (livros.length === 0) {
                throw new Error("Livro não encontrado.");
            }

            const titulo = livros[0].titulo;
            const xp = Number(livros[0].xp_recompensa);

            if (!Number.isInteger(xp) || xp <= 0) {
                throw new Error("XP do livro inválido.");
            }

            // Registra uma nova conclusão.
            const [resultado] = await conn.execute(
                `INSERT INTO livros_concluidos (
                    usuario_idcadastro,
                    idlivros,
                    xp_recebido
                )
                VALUES (?, ?, ?)`,
                [cadastroId, idlivros, xp]
            );

            // Concede o XP desta conclusão.
            xpLivro = await adicionarXP(
                conn,
                cadastroId,
                usuarioId,
                xp,
                'livro',
                `livro_concluido:${resultado.insertId}`
            );

            // Registra a atividade no perfil.
            await registrarAtividade(
                conn,
                cadastroId,
                'conclusao',
                `Concluiu "${titulo}"`,
                xpLivro ? xp : 0
            );
        }

        await conn.commit();

        return res.json({
            mensagem: 'Progresso salvo com sucesso!',
            progresso: novoProgresso,
            progressoAtual: progresso,
            progressoDiario,
            incrementoDiario,
            xpLeitura,
            xpExplorador,
            xpLivro
        });

    } catch (erro) {
    if (conn) {
        try {
            await conn.rollback();
        } catch (erroRollback) {
            console.error("Erro no rollback:", erroRollback);
        }
    }

    console.error("ERRO AO SALVAR PROGRESSO:", erro);
    next(erro);
    } finally {
        if (conn) {
            conn.release();
        }
    }
});

app.get('/api/livros-lidos', auth, async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT COUNT(DISTINCT idlivros) AS livrosLidos
             FROM progresso_leitura
             WHERE usuario_idcadastro = ?
             AND progresso >= 100`,
            [req.auth.cadastroId]
        );

        res.json({
            livrosLidos: Number(rows[0].livrosLidos) || 0
        });

    } catch (error) {
        next(error);
    }
});



// ==========================================
// BUSCAR PROGRESSO DE LEITURA
// ==========================================

app.get('/api/progresso-leitura/:idlivros', auth, async (req, res, next) => {
    try {
        const cadastroId = Number(req.auth.cadastroId);
        const idlivros = Number(req.params.idlivros);

        if (!Number.isInteger(idlivros) || idlivros <= 0) {
            return fail(res, 400, 'ID do livro inválido.');
        }

        const [rows] = await pool.execute(
            `SELECT progresso, progresso_atual
             FROM progresso_leitura
             WHERE usuario_idcadastro = ?
             AND idlivros = ?
             LIMIT 1`,
            [cadastroId, idlivros]
        );

        const progresso = rows.length
            ? Number(rows[0].progresso_atual)
            : 0;

        const maiorProgresso = rows.length
            ? Number(rows[0].progresso)
            : 0;

        return res.json({
            progresso,
            maiorProgresso
        });

    } catch (error) {
        next(error);
    }
});


// ==========================================
// SALVAR REDAÇÃO CORRIGIDA
// ==========================================

app.post('/api/redacoes', auth, async (req, res, next) => {
    try {
        const {
            tema,
            categoria,
            nivel,
            texto,
            nota_final,
            status_nota,
            comentario_geral,
            xp_ganhos
        } = req.body;

        // Verifica os dados obrigatórios
        if (
            typeof tema !== 'string' ||
            typeof texto !== 'string' ||
            !tema.trim() ||
            !texto.trim()
        ) {
            return fail(res, 400, 'Tema e texto são obrigatórios.');
        }

        if (
            !Number.isInteger(Number(nota_final)) ||
            Number(nota_final) < 0 ||
            Number(nota_final) > 1000
        ) {
            return fail(res, 400, 'Nota inválida.');
        }

        const cadastroId = req.auth.cadastroId;

        if (!cadastroId) {
            return fail(res, 401, 'Usuário não identificado.');
        }

        const [resultado] = await pool.execute(
            `INSERT INTO redacao
            (
                tema,
                categoria,
                nivel,
                texto,
                nota_final,
                status_nota,
                comentario_geral,
                xp_ganhos,
                usuario_idcadastro
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tema.trim(),
                categoria || null,
                nivel || null,
                texto.trim(),
                Number(nota_final),
                status_nota || null,
                comentario_geral || null,
                Number(xp_ganhos) || 0,
                cadastroId
            ]
        );

        return res.status(201).json({
            mensagem: 'Redação salva com sucesso!',
            idredacao: resultado.insertId
        });

    } catch (error) {
        next(error);
    }
});

// ==========================================
// BUSCAR REDAÇÕES DO USUÁRIO
// ==========================================

app.get('/api/redacoes', auth, async (req, res, next) => {
    try {
        const cadastroId = req.auth.cadastroId;

        const [redacoes] = await pool.execute(
            `SELECT
                idredacao,
                tema,
                categoria,
                nivel,
                texto,
                nota_final,
                status_nota,
                comentario_geral,
                xp_ganhos,
                data_envio
            FROM redacao
            WHERE usuario_idcadastro = ?
            ORDER BY data_envio DESC`,
            [cadastroId]
        );

        return res.json({ redacoes });

    } catch (error) {
        next(error);
    }
});

app.get('/api/books', auth, async (req, res, next) => {

    try {

        const idUsuario = Number(req.auth.cadastroId);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            return res.status(401).json({
                erro: "Usuário não autenticado."
            });
        }

        const [rows] = await pool.execute(

            `SELECT
                l.idlivros AS id,
                l.titulo,
                l.genero,
                l.autor,
                COALESCE(p.progresso, 0) AS progresso

            FROM buscar_livro bl

            INNER JOIN livros l
                ON l.idlivros = bl.livros_idlivros

            LEFT JOIN progresso_leitura p
                ON p.idlivros = l.idlivros
                AND p.usuario_idcadastro = ?

            ORDER BY l.titulo`,

            [idUsuario]

        );
        res.json({
            livros: rows
        });
    } catch (error) {
        console.error("ERRO AO BUSCAR LIVROS:", error);
        next(error);
    }
});

app.get('/api/xp', auth, async (req, res, next) => {
    try {
        const cadastroId = Number(req.auth.cadastroId);
        const usuarioId = Number(req.auth.sub);

        const [resultado] = await pool.execute(
            `SELECT n.pontuacao AS xp
             FROM usuario u
             INNER JOIN nivel n
                ON n.idnivel = u.nivel_idnivel
                AND n.ranking_idranking = u.nivel_ranking_idranking
             WHERE u.idcadastro = ?
               AND u.usuario_idusuario = ?`,
            [cadastroId, usuarioId]
        );

        if (!resultado.length) {
            return res.status(404).json({
                erro: "Nível do usuário não encontrado."
            });
        }

        return res.json({
            xp: Number(resultado[0].xp) || 0
        });

    } catch (erro) {
        next(erro);
    }
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
    ['/', '/FRONTEND/PAGES/paginaPrincipal.html'],

    ['/cadastro.html', '/FRONTEND/PAGES/Cadastro.html'],
    ['/login.html', '/FRONTEND/PAGES/Login.html'],

    ['/Pesquisa.html', '/FRONTEND/PAGES/Pesquisa.html'],
    ['/Redacao.html', '/FRONTEND/PAGES/Redacao.html'],
    ['/Nivel.html', '/FRONTEND/PAGES/Nivel.html'],
    ['/Perfil.html', '/FRONTEND/PAGES/Perfil.html'],

    ['/PAGES/PaginaInicial.html', '/FRONTEND/PAGES/PaginaInicial.html'],
    ['/PAGES/Login.html', '/FRONTEND/PAGES/Login.html'],
    ['/PAGES/Cadastro.html', '/FRONTEND/PAGES/Cadastro.html']
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
app.use(express.static(path.resolve(__dirname, '..'), { 
  index: false, dotfiles: 'ignore' }
));

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
