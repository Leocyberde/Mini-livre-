import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// ─── REVIEWS ──────────────────────────────────────────────────────────────────

router.get('/reviews/products', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM product_reviews ORDER BY created_at DESC');
    res.json(r.rows.map(row => ({
      id: row.id, productId: row.product_id, productName: row.product_name,
      storeId: row.store_id, rating: row.rating, message: row.message,
      clientName: row.client_name, createdAt: row.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reviews/products', requireAuth, async (req, res) => {
  try {
    const r = req.body;
    const jwtUser = req.jwtUser!;

    // Enforce clientName from the authenticated user's record — never trust body
    const userRow = await pool.query('SELECT name FROM users WHERE id = $1', [jwtUser.id]);
    if (userRow.rows.length === 0) return res.status(403).json({ error: 'Usuário não encontrado' });
    const clientName = userRow.rows[0].name;

    // Verify the reviewer has at least one delivered order at this store
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE store_id = $1 AND client_id = $2 AND status = 'delivered' LIMIT 1`,
      [r.storeId, jwtUser.id]
    );
    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Você precisa ter um pedido entregue nesta loja para avaliar um produto' });
    }

    // Prevent duplicate review for the same product by the same client
    const dupCheck = await pool.query(
      `SELECT id FROM product_reviews WHERE product_id = $1 AND client_name = $2`,
      [r.productId, clientName]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Você já avaliou este produto' });
    }

    await pool.query(`
      INSERT INTO product_reviews (id, product_id, product_name, store_id, rating, message, client_name, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [r.id, r.productId, r.productName, r.storeId, r.rating, r.message, clientName, r.createdAt]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/reviews/stores', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM store_reviews ORDER BY created_at DESC');
    res.json(r.rows.map(row => ({
      id: row.id, storeId: row.store_id, storeName: row.store_name,
      orderId: row.order_id, rating: row.rating, message: row.message,
      clientName: row.client_name, createdAt: row.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reviews/stores', requireAuth, async (req, res) => {
  try {
    const r = req.body;
    const jwtUser = req.jwtUser!;

    // Enforce clientName from the authenticated user's record — never trust body
    const userRow = await pool.query('SELECT name FROM users WHERE id = $1', [jwtUser.id]);
    if (userRow.rows.length === 0) return res.status(403).json({ error: 'Usuário não encontrado' });
    const clientName = userRow.rows[0].name;

    // Verify the order belongs to this client and was delivered
    const orderRow = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND client_id = $2 AND status = 'delivered' LIMIT 1`,
      [r.orderId, jwtUser.id]
    );
    if (orderRow.rows.length === 0) {
      return res.status(403).json({ error: 'Pedido não encontrado ou ainda não entregue' });
    }

    // Prevent duplicate review for the same order
    const dupCheck = await pool.query(
      `SELECT id FROM store_reviews WHERE order_id = $1`,
      [r.orderId]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Este pedido já foi avaliado' });
    }

    await pool.query(`
      INSERT INTO store_reviews (id, store_id, store_name, order_id, rating, message, client_name, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [r.id, r.storeId, r.storeName, r.orderId, r.rating, r.message, clientName, r.createdAt]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
