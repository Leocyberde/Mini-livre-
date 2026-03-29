import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;

    let r;
    if (isAdmin) {
      r = await pool.query('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 200');
    } else if (isSeller) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      const storeId = profileRow.rows[0]?.store_id ?? null;
      r = await pool.query(
        `SELECT * FROM notifications WHERE target = 'seller' AND (store_id = $1 OR store_id IS NULL) ORDER BY timestamp DESC LIMIT 100`,
        [storeId]
      );
    } else {
      r = await pool.query(
        `SELECT * FROM notifications WHERE target = 'client' AND (client_id = $1 OR client_id IS NULL) ORDER BY timestamp DESC LIMIT 100`,
        [jwtUser.id]
      );
    }

    res.json(r.rows.map(row => ({
      id: row.id, title: row.title, body: row.body, icon: row.icon,
      timestamp: row.timestamp, read: row.read, target: row.target,
      type: row.type, metadata: row.metadata,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/notifications', requireAuth, async (req, res) => {
  try {
    const n = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;
    const isMotoboy = jwtUser.roles.includes('motoboy') && !isAdmin;

    let storeId: string | null;
    let clientId: string | null;

    if (isAdmin) {
      // Admin: full access — accept storeId and clientId from body
      storeId = n.storeId ?? null;
      clientId = n.clientId ?? null;
    } else if (isSeller) {
      // Seller: storeId is always forced to their own store; clientId from body (for notifying their customers)
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      storeId = profileRow.rows[0]?.store_id ?? null;
      clientId = n.clientId ?? null;
    } else if (isMotoboy) {
      // Motoboy: cannot create store-targeted notifications; clientId from body (delivery updates to a specific client)
      storeId = null;
      clientId = n.clientId ?? null;
    } else {
      // Client: clientId is always their own; storeId is ignored (clients don't create store notifications)
      storeId = null;
      clientId = jwtUser.id;
    }

    await pool.query(`
      INSERT INTO notifications (id, title, body, icon, timestamp, read, target, type, metadata, store_id, client_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [n.id, n.title, n.body, n.icon, n.timestamp, n.read ?? false,
        n.target, n.type ?? 'general', JSON.stringify(n.metadata ?? {}),
        storeId, clientId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;
    const { target } = req.body;

    if (isAdmin) {
      if (target) {
        await pool.query(`UPDATE notifications SET read=TRUE WHERE target=$1`, [target]);
      }
    } else if (isSeller) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      const storeId = profileRow.rows[0]?.store_id ?? null;
      await pool.query(
        `UPDATE notifications SET read=TRUE WHERE target='seller' AND (store_id=$1 OR store_id IS NULL)`,
        [storeId]
      );
    } else {
      await pool.query(
        `UPDATE notifications SET read=TRUE WHERE target='client' AND (client_id=$1 OR client_id IS NULL)`,
        [jwtUser.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;

    const notifRow = await pool.query('SELECT target, store_id, client_id FROM notifications WHERE id=$1', [req.params.id]);
    if (notifRow.rows.length === 0) return res.status(404).json({ error: 'Notificação não encontrada' });
    const notif = notifRow.rows[0];

    if (!isAdmin) {
      if (isSeller) {
        const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
        const storeId = profileRow.rows[0]?.store_id ?? null;
        if (notif.target !== 'seller' || (notif.store_id !== null && notif.store_id !== storeId)) {
          return res.status(403).json({ error: 'Acesso não autorizado' });
        }
      } else {
        if (notif.target !== 'client' || (notif.client_id !== null && notif.client_id !== jwtUser.id)) {
          return res.status(403).json({ error: 'Acesso não autorizado' });
        }
      }
    }

    await pool.query(`UPDATE notifications SET read=TRUE WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
