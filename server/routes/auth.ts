import { Router } from 'express';
import { compare, hash } from 'bcryptjs';
import { nanoid } from 'nanoid';
import { pool } from '../db.js';
import { requireAuth, signToken, revokeToken } from '../auth.js';

const router = Router();

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function formatUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp,
    cpf: row.cpf,
    roles: row.roles,
    address: {
      cep: row.cep,
      logradouro: row.logradouro,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      cidade: row.cidade,
      uf: row.uf,
    },
  };
}

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  return digit === parseInt(clean[10]);
}

router.post('/auth/register', async (req, res) => {
  try {
    const { cpf, name, email, whatsapp, password, cep, logradouro, numero, complemento, bairro, cidade, uf } = req.body;
    if (!cpf || !name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) return res.status(400).json({ error: 'CPF inválido' });
    const dupCpf = await pool.query('SELECT id FROM users WHERE cpf = $1', [cleanCpf]);
    if (dupCpf.rows.length > 0) return res.status(400).json({ error: 'CPF já cadastrado' });
    const dupEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (dupEmail.rows.length > 0) return res.status(400).json({ error: 'E-mail já cadastrado' });
    const passwordHash = await hash(password, 10);
    const id = nanoid();
    await pool.query(`
      INSERT INTO users (id, cpf, name, email, whatsapp, password_hash, roles, cep, logradouro, numero, complemento, bairro, cidade, uf)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [id, cleanCpf, name.trim(), email.toLowerCase().trim(), whatsapp || '', passwordHash, ['client'],
        cep || '', logradouro || '', numero || '', complemento || '', bairro || '', cidade || '', uf || '']);
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const formatted = formatUser(r.rows[0]);
    const token = signToken({ id: formatted.id, email: formatted.email, roles: formatted.roles });
    res.json({ user: formatted, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    const { jti } = req.jwtUser!;
    if (jti) await revokeToken(jti);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    const r = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (r.rows.length === 0) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const user = r.rows[0];
    const valid = await compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    const formatted = formatUser(user);
    const token = signToken({ id: formatted.id, email: formatted.email, roles: formatted.roles });
    res.json({ user: formatted, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/auth/user/:id', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    if (!isAdmin && req.params.id !== jwtUser.id) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ user: formatUser(r.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/auth/add-role', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const { userId, role, storeData, motoboyData } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId e role são obrigatórios' });

    // Non-admins can only assign seller/motoboy to themselves
    if (!isAdmin) {
      if (userId !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado: não é possível alterar outros usuários' });
      }
      if (!['seller', 'motoboy'].includes(role)) {
        return res.status(403).json({ error: 'Acesso não autorizado: permissão inválida' });
      }
    }

    const r = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = r.rows[0];
    const roles: string[] = user.roles || ['client'];
    if (!roles.includes(role)) {
      roles.push(role);
      await pool.query('UPDATE users SET roles = $1 WHERE id = $2', [roles, userId]);
    }
    if (role === 'seller' && storeData) {
      const { storeName, storeDescription, storeCategory, address } = storeData;
      await pool.query(`
        INSERT INTO seller_profile (id, store_id, store_name, store_description, store_category, store_logo, store_phone, store_email, address)
        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          store_id = EXCLUDED.store_id, store_name = EXCLUDED.store_name,
          store_description = EXCLUDED.store_description, store_category = EXCLUDED.store_category,
          address = EXCLUDED.address
      `, [userId, storeName, storeDescription || '', storeCategory || '', '🏪', '', user.email, JSON.stringify(address)]);
    }
    if (role === 'motoboy' && motoboyData) {
      await pool.query(`
        INSERT INTO motoboys (id, user_id, name, avatar, phone, vehicle, license_plate, status, joined_at, rating, completed_total, rejected_total)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'unavailable',$8,0,0,0)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          vehicle = EXCLUDED.vehicle,
          license_plate = EXCLUDED.license_plate
      `, [userId, userId, user.name, '🏍️', user.whatsapp, motoboyData.vehicle || '', motoboyData.licensePlate || '', new Date().toISOString()]);
    }
    const updated = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const formatted = formatUser(updated.rows[0]);
    const token = signToken({ id: formatted.id, email: formatted.email, roles: formatted.roles });
    res.json({ user: formatted, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
    const r = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'E-mail não encontrado' });
    const userId = r.rows[0].id;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1', [userId]);
    await pool.query(`INSERT INTO password_reset_tokens (id, user_id, code, expires_at) VALUES ($1,$2,$3,$4)`,
      [nanoid(), userId, code, expiresAt]);
    res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, o código de recuperação será enviado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    const userR = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userR.rows.length === 0) return res.status(404).json({ error: 'E-mail não encontrado' });
    const userId = userR.rows[0].id;
    const tokenR = await pool.query(
      `SELECT * FROM password_reset_tokens WHERE user_id=$1 AND code=$2 AND used=FALSE AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`,
      [userId, code]
    );
    if (tokenR.rows.length === 0) return res.status(400).json({ error: 'Código inválido ou expirado' });
    const passwordHash = await hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenR.rows[0].id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
