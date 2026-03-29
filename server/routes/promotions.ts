import { Router } from 'express';
import { nanoid } from 'nanoid';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

// ─── PROMOÇÕES ─────────────────────────────────────────────────────────────────

router.get('/promotions', async (req, res) => {
  try {
    const { storeId } = req.query;
    const r = storeId
      ? await pool.query('SELECT * FROM promotions WHERE store_id = $1 ORDER BY created_at DESC', [storeId])
      : await pool.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json(r.rows.map(row => ({
      id: row.id,
      storeId: row.store_id,
      title: row.title,
      description: row.description,
      type: row.type,
      value: Number(row.value),
      minOrderValue: Number(row.min_order_value),
      applyTo: row.apply_to,
      productIds: row.product_ids || [],
      category: row.category,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isActive: row.is_active,
      buyQuantity: Number(row.buy_quantity),
      getQuantity: Number(row.get_quantity),
      createdAt: row.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/promotions', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const {
      storeId, title, description, type, value, minOrderValue,
      applyTo, productIds, category, startsAt, endsAt, isActive,
      buyQuantity, getQuantity,
    } = req.body;
    // Sellers can only create promotions for their own store
    const effectiveStoreId = isAdmin ? storeId : jwtUser.id;
    const id = nanoid();
    const createdAt = new Date().toISOString();
    await pool.query(`
      INSERT INTO promotions
        (id, store_id, title, description, type, value, min_order_value, apply_to, product_ids, category, starts_at, ends_at, is_active, buy_quantity, get_quantity, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [id, effectiveStoreId, title, description || '', type, value || 0, minOrderValue || 0,
        applyTo || 'all', JSON.stringify(productIds || []), category || '',
        startsAt, endsAt, isActive !== false, buyQuantity || 1, getQuantity || 1, createdAt]);
    res.json({ id, createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/promotions/:id', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const check = await pool.query('SELECT store_id FROM promotions WHERE id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Promoção não encontrada' });
      if (check.rows[0].store_id !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado: promoção não pertence à sua loja' });
      }
    }

    const {
      title, description, type, value, minOrderValue,
      applyTo, productIds, category, startsAt, endsAt, isActive,
      buyQuantity, getQuantity,
    } = req.body;
    await pool.query(`
      UPDATE promotions SET
        title=$1, description=$2, type=$3, value=$4, min_order_value=$5,
        apply_to=$6, product_ids=$7, category=$8, starts_at=$9, ends_at=$10,
        is_active=$11, buy_quantity=$12, get_quantity=$13
      WHERE id=$14
    `, [title, description || '', type, value || 0, minOrderValue || 0,
        applyTo || 'all', JSON.stringify(productIds || []), category || '',
        startsAt, endsAt, isActive !== false, buyQuantity || 1, getQuantity || 1, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/promotions/:id', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const check = await pool.query('SELECT store_id FROM promotions WHERE id = $1', [req.params.id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Promoção não encontrada' });
      if (check.rows[0].store_id !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado: promoção não pertence à sua loja' });
      }
    }

    await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
