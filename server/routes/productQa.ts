import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// ─── PRODUCT Q&A ──────────────────────────────────────────────────────────────

router.get('/product-qa', requireAuth, async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM product_qa ORDER BY created_at DESC');
    res.json(r.rows.map(row => ({
      id: row.id, productId: row.product_id, productName: row.product_name,
      productImage: row.product_image, storeId: row.store_id, storeName: row.store_name,
      question: row.question, answer: row.answer, status: row.status,
      clientName: row.client_name, createdAt: row.created_at, answeredAt: row.answered_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/product-qa', requireAuth, async (req, res) => {
  try {
    const q = req.body;
    await pool.query(`
      INSERT INTO product_qa (id, product_id, product_name, product_image, store_id, store_name, question, status, client_name, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9)
    `, [q.id, q.productId, q.productName, q.productImage ?? null, q.storeId, q.storeName,
        q.question, q.clientName, q.createdAt]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/product-qa/:id/answer', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      const storeId = profileRow.rows[0]?.store_id ?? null;
      const qaRow = await pool.query('SELECT store_id FROM product_qa WHERE id = $1', [req.params.id]);
      if (qaRow.rows.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });
      if (qaRow.rows[0].store_id !== storeId) {
        return res.status(403).json({ error: 'Acesso não autorizado: pergunta não pertence à sua loja' });
      }
    }

    const { answer } = req.body;
    await pool.query(
      `UPDATE product_qa SET answer=$1, status='answered', answered_at=$2 WHERE id=$3`,
      [answer, new Date().toISOString(), req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/product-qa/:id/close', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      const storeId = profileRow.rows[0]?.store_id ?? null;
      const qaRow = await pool.query('SELECT store_id FROM product_qa WHERE id = $1', [req.params.id]);
      if (qaRow.rows.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });
      if (qaRow.rows[0].store_id !== storeId) {
        return res.status(403).json({ error: 'Acesso não autorizado: pergunta não pertence à sua loja' });
      }
    }

    await pool.query(`UPDATE product_qa SET status='closed' WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
