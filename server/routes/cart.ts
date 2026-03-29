import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// ─── CART ─────────────────────────────────────────────────────────────────────

router.get('/cart', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    // Para clientes, sempre usa o próprio userId — nunca aceita clientId de fora
    // Para admin, permite clientId via query para gerenciar qualquer carrinho
    const { clientId: qClientId } = req.query;
    const clientId = isAdmin
      ? (typeof qClientId === 'string' && qClientId !== 'undefined' ? qClientId : null)
      : jwtUser.id;

    if (!clientId) {
      return res.json([]);
    }

    const r = await pool.query('SELECT * FROM cart_items WHERE client_id = $1 ORDER BY id', [clientId]);
    res.json(r.rows.map(row => ({
      productId: row.product_id,
      storeId: row.store_id,
      quantity: row.quantity,
      price: Number(row.price),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/cart', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const { clientId: qClientId } = req.query;
    const clientId = isAdmin
      ? (typeof qClientId === 'string' && qClientId !== 'undefined' ? qClientId : null)
      : jwtUser.id;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }

    const items: Array<{ productId: string; storeId: string; quantity: number; price: number }> = req.body;
    await pool.query('DELETE FROM cart_items WHERE client_id = $1', [clientId]);
    for (const item of items) {
      await pool.query(`
        INSERT INTO cart_items (product_id, store_id, quantity, price, client_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [item.productId, item.storeId, item.quantity, item.price, clientId]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
