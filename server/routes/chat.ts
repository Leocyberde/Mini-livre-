import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// ─── CHAT ─────────────────────────────────────────────────────────────────────

// Helper: verify the authenticated user is a party to the given order
async function assertOrderAccess(
  orderId: string,
  jwtUser: { id: string; roles: string[] }
): Promise<{ allowed: boolean; status?: number; error?: string }> {
  if (jwtUser.roles.includes('admin')) return { allowed: true };
  const orderRow = await pool.query('SELECT client_id, store_id, motoboy_id FROM orders WHERE id=$1', [orderId]);
  if (orderRow.rows.length === 0) return { allowed: false, status: 404, error: 'Pedido não encontrado' };
  const order = orderRow.rows[0];
  if (jwtUser.roles.includes('client') && order.client_id === jwtUser.id) return { allowed: true };
  if (jwtUser.roles.includes('seller') && order.store_id === jwtUser.id) return { allowed: true };
  if (jwtUser.roles.includes('motoboy') && order.motoboy_id === jwtUser.id) return { allowed: true };
  return { allowed: false, status: 403, error: 'Acesso não autorizado' };
}

router.get('/chat/:orderId', requireAuth, async (req, res) => {
  try {
    const access = await assertOrderAccess(req.params.orderId, req.jwtUser!);
    if (!access.allowed) return res.status(access.status!).json({ error: access.error });
    const r = await pool.query('SELECT * FROM chat_messages WHERE order_id=$1 ORDER BY timestamp', [req.params.orderId]);
    res.json(r.rows.map(row => ({
      id: row.id, orderId: row.order_id, sender: row.sender,
      text: row.text, timestamp: row.timestamp, read: row.read,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat/:orderId', requireAuth, async (req, res) => {
  try {
    const access = await assertOrderAccess(req.params.orderId, req.jwtUser!);
    if (!access.allowed) return res.status(access.status!).json({ error: access.error });
    const m = req.body;
    await pool.query(`
      INSERT INTO chat_messages (id, order_id, sender, text, timestamp, read)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [m.id, req.params.orderId, m.sender, m.text, m.timestamp, false]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/chat/:orderId/read', requireAuth, async (req, res) => {
  try {
    const access = await assertOrderAccess(req.params.orderId, req.jwtUser!);
    if (!access.allowed) return res.status(access.status!).json({ error: access.error });
    const { reader } = req.body;
    const other = reader === 'motoboy' ? 'client' : 'motoboy';
    await pool.query(
      `UPDATE chat_messages SET read=TRUE WHERE order_id=$1 AND sender=$2`,
      [req.params.orderId, other]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/chat/:orderId', requireRole('seller', 'admin', 'motoboy'), async (req, res) => {
  try {
    const access = await assertOrderAccess(req.params.orderId, req.jwtUser!);
    if (!access.allowed) return res.status(access.status!).json({ error: access.error });
    await pool.query('DELETE FROM chat_messages WHERE order_id=$1', [req.params.orderId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
