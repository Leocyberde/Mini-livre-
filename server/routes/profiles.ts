import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole, verifyToken } from '../auth.js';

const router = Router();

// ─── SELLER PROFILE ───────────────────────────────────────────────────────────

router.get('/profiles/seller', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.json(null);
    const r = await pool.query('SELECT * FROM seller_profile WHERE id = $1', [userId]);
    if (r.rows.length === 0) return res.json(null);
    const row = r.rows[0];

    // Determine whether the requester is authenticated (optional auth)
    const authHeader = req.headers.authorization;
    const payload = authHeader?.startsWith('Bearer ')
      ? verifyToken(authHeader.slice(7))
      : null;
    const isAuthenticated = payload !== null;

    res.json({
      storeId: row.store_id,
      storeName: row.store_name,
      storeDescription: row.store_description,
      storeCategory: row.store_category,
      storeLogo: row.store_logo,
      // Contact details only returned for authenticated users
      ...(isAuthenticated && {
        storePhone: row.store_phone,
        storeEmail: row.store_email,
      }),
      address: row.address,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profiles/seller', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const userId = req.jwtUser!.id;
    const { storeId, storeName, storeDescription, storeCategory, storeLogo, storePhone, storeEmail, address } = req.body;
    await pool.query(`
      INSERT INTO seller_profile (id, store_id, store_name, store_description, store_category, store_logo, store_phone, store_email, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        store_id = EXCLUDED.store_id,
        store_name = EXCLUDED.store_name,
        store_description = EXCLUDED.store_description,
        store_category = EXCLUDED.store_category,
        store_logo = EXCLUDED.store_logo,
        store_phone = EXCLUDED.store_phone,
        store_email = EXCLUDED.store_email,
        address = EXCLUDED.address
    `, [userId, storeId, storeName, storeDescription, storeCategory, storeLogo, storePhone, storeEmail, JSON.stringify(address)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUBLIC STORES CATALOG ────────────────────────────────────────────────────

router.get('/stores', async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM seller_profile WHERE store_name IS NOT NULL AND store_name != '' AND is_deleted = FALSE"
    );
    res.json(r.rows.map(row => ({
      id: row.id,
      name: row.store_name,
      category: row.store_category,
      description: row.store_description,
      logo: row.store_logo,
      phone: row.store_phone,
      email: row.store_email,
      address: row.address,
      isBlocked: row.is_blocked ?? false,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── ADMIN STORE MANAGEMENT ──────────────────────────────────────────────────

router.patch('/admin/stores/:storeId/block', requireRole('admin'), async (req, res) => {
  try {
    const { storeId } = req.params;
    const r = await pool.query('SELECT is_blocked FROM seller_profile WHERE id = $1', [storeId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    const newBlocked = !r.rows[0].is_blocked;
    await pool.query('UPDATE seller_profile SET is_blocked = $1 WHERE id = $2', [newBlocked, storeId]);
    res.json({ ok: true, isBlocked: newBlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/admin/stores/:storeId', requireRole('admin'), async (req, res) => {
  try {
    const { storeId } = req.params;
    const r = await pool.query('SELECT id FROM seller_profile WHERE id = $1', [storeId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Store not found' });
    await pool.query('UPDATE seller_profile SET is_deleted = TRUE WHERE id = $1', [storeId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CLIENT PROFILES ──────────────────────────────────────────────────────────

router.get('/profiles/clients', requireAuth, async (req, res) => {
  try {
    const userId = req.jwtUser!.id;
    const isAdmin = req.jwtUser!.roles.includes('admin');
    let r;
    if (isAdmin) {
      r = await pool.query('SELECT * FROM client_profiles ORDER BY id');
    } else {
      r = await pool.query('SELECT * FROM client_profiles WHERE id = $1', [userId]);
    }
    res.json(r.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      addresses: row.addresses,
      isActive: row.is_active,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profiles/clients', requireAuth, async (req, res) => {
  try {
    const userId = req.jwtUser!.id;
    const isAdmin = req.jwtUser!.roles.includes('admin');
    const clients: Array<{ id: string; name: string; email: string; phone: string; addresses: unknown[]; isActive: boolean }> = req.body;

    if (isAdmin) {
      // Admin pode atualizar múltiplos perfis de uma vez (upsert por id, sem apagar outros)
      for (const c of clients) {
        await pool.query(`
          INSERT INTO client_profiles (id, name, email, phone, addresses, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            addresses = EXCLUDED.addresses,
            is_active = EXCLUDED.is_active
        `, [c.id, c.name, c.email, c.phone, JSON.stringify(c.addresses), c.isActive ?? false]);
      }
    } else {
      // Usuário comum só pode salvar/atualizar o próprio perfil
      const own = clients.find(c => c.id === userId) ?? clients[0];
      if (!own) return res.status(400).json({ error: 'Nenhum perfil fornecido' });
      await pool.query(`
        INSERT INTO client_profiles (id, name, email, phone, addresses, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          addresses = EXCLUDED.addresses,
          is_active = EXCLUDED.is_active
      `, [userId, own.name, own.email, own.phone, JSON.stringify(own.addresses), own.isActive ?? false]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
