import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

// ─── MOTOBOYS ─────────────────────────────────────────────────────────────────

function mapMotoboy(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatar: row.avatar,
    phone: row.phone,
    vehicle: row.vehicle,
    licensePlate: row.license_plate,
    status: row.status,
    blockInfo: row.block_info,
    joinedAt: row.joined_at,
    rating: Number(row.rating),
    completedTotal: row.completed_total,
    rejectedTotal: row.rejected_total,
    isActiveSession: row.is_active_session,
  };
}

router.get('/motoboys', requireRole('seller', 'admin', 'motoboy'), async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM motoboys ORDER BY name');
    res.json(r.rows.map(mapMotoboy));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ensure a motoboy profile exists for the given userId (creates one if missing)
router.post('/motoboys/ensure', requireRole('motoboy', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    // Non-admins can only create/fetch their own motoboy profile
    const userId = isAdmin ? (req.body.userId ?? jwtUser.id) : jwtUser.id;
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

    // Check if motoboy already exists by id or user_id
    let r = await pool.query(
      'SELECT * FROM motoboys WHERE id = $1 OR user_id = $1 LIMIT 1',
      [userId]
    );

    if (r.rows.length > 0) {
      return res.json(mapMotoboy(r.rows[0]));
    }

    // Fetch user data to seed the profile
    const userRow = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRow.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = userRow.rows[0];

    // Create motoboy profile using user's data
    await pool.query(`
      INSERT INTO motoboys (id, user_id, name, avatar, phone, vehicle, license_plate, status, joined_at, rating, completed_total, rejected_total)
      VALUES ($1,$2,$3,$4,$5,'','','unavailable',$6,0,0,0)
      ON CONFLICT (id) DO NOTHING
    `, [userId, userId, user.name, '🏍️', user.whatsapp || '', new Date().toISOString()]);

    r = await pool.query('SELECT * FROM motoboys WHERE id = $1', [userId]);
    return res.json(mapMotoboy(r.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/motoboys/bulk', requireRole('admin'), async (req, res) => {
  try {
    const motoboys: unknown[] = req.body;
    for (const mb of motoboys as Array<Record<string, unknown>>) {
      await pool.query(`
        INSERT INTO motoboys (id, name, avatar, phone, vehicle, license_plate, status, block_info, joined_at, rating, completed_total, rejected_total)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `, [mb.id, mb.name, mb.avatar, mb.phone, mb.vehicle, mb.licensePlate, mb.status,
          mb.blockInfo ? JSON.stringify(mb.blockInfo) : null,
          mb.joinedAt, mb.rating, mb.completedTotal, mb.rejectedTotal]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/motoboys/:id', requireRole('motoboy', 'admin'), async (req, res) => {
  try {
    const mb = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const mbRow = await pool.query('SELECT user_id FROM motoboys WHERE id = $1', [req.params.id]);
      if (mbRow.rows.length === 0) return res.status(404).json({ error: 'Motoboy não encontrado' });
      const ownerId = mbRow.rows[0].user_id ?? req.params.id;
      if (ownerId !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    await pool.query(`
      UPDATE motoboys SET
        status=$1, block_info=$2, completed_total=$3, rejected_total=$4, is_active_session=$5
      WHERE id=$6
    `, [mb.status, mb.blockInfo ? JSON.stringify(mb.blockInfo) : null,
        mb.completedTotal, mb.rejectedTotal, mb.isActiveSession ?? false, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/motoboys/:id/active-session', requireRole('motoboy', 'admin'), async (req, res) => {
  try {
    const { isActive } = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    if (!isAdmin) {
      const mbRow = await pool.query('SELECT user_id FROM motoboys WHERE id = $1', [req.params.id]);
      if (mbRow.rows.length === 0) return res.status(404).json({ error: 'Motoboy não encontrado' });
      const ownerId = mbRow.rows[0].user_id ?? req.params.id;
      if (ownerId !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    await pool.query('UPDATE motoboys SET is_active_session=$1 WHERE id=$2', [isActive, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── MOTOBOY ROUTES HISTORY ───────────────────────────────────────────────────

router.get('/motoboy/routes', requireRole('motoboy', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const r = await pool.query(
      'SELECT * FROM motoboy_routes WHERE motoboy_user_id = $1 ORDER BY completed_at DESC',
      [jwtUser.id]
    );
    res.json(r.rows.map(row => ({
      id: row.id,
      completedAt: row.completed_at,
      value: Number(row.value),
      from: row.from_label,
      to: row.to_label,
      storeAddress: row.store_address ?? undefined,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/motoboy/routes', requireRole('motoboy', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const { id, completedAt, value, from, to, storeAddress } = req.body;
    if (!id || !completedAt || value == null || !from || !to) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await pool.query(
      `INSERT INTO motoboy_routes (id, motoboy_user_id, completed_at, value, from_label, to_label, store_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [id, jwtUser.id, new Date(completedAt), value, from, to, storeAddress ?? null]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DISPATCH QUEUE ───────────────────────────────────────────────────────────

router.get('/dispatch-queue', requireRole('seller', 'admin', 'motoboy'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;

    let r;
    if (isSeller) {
      // Sellers only see their own store's queue
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.json([]);
      const sellerStoreId = profileRow.rows[0].store_id;
      r = await pool.query('SELECT * FROM dispatch_queue WHERE store_id = $1 ORDER BY created_at ASC', [sellerStoreId]);
    } else {
      // Admin and motoboy see the full queue
      r = await pool.query('SELECT * FROM dispatch_queue ORDER BY created_at ASC');
    }

    res.json(r.rows.map(row => ({
      routeId: row.route_id,
      storeId: row.store_id,
      orderIds: row.order_ids,
      routeType: row.route_type,
      rejectionCount: Number(row.rejection_count),
      lastRejectedAt: row.last_rejected_at ? Number(row.last_rejected_at) : null,
      rejectedByMotoboyIds: row.rejected_by_motoboy_ids,
      cooldownByMotoboyId: row.cooldown_by_motoboy_id,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/dispatch-queue/:routeId', requireRole('seller', 'admin', 'motoboy'), async (req, res) => {
  try {
    const e = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;
    const isMotoboy = jwtUser.roles.includes('motoboy') && !isAdmin;

    // Fetch the existing route entry (if any) to verify ownership
    const existing = await pool.query('SELECT store_id FROM dispatch_queue WHERE route_id = $1', [req.params.routeId]);

    if (isSeller) {
      // Seller: resolve their own store_id and enforce ownership
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.status(403).json({ error: 'Perfil de vendedor não encontrado' });
      const sellerStoreId = profileRow.rows[0].store_id;

      if (existing.rows.length > 0 && existing.rows[0].store_id !== sellerStoreId) {
        return res.status(403).json({ error: 'Acesso não autorizado: rota não pertence à sua loja' });
      }

      await pool.query(`
        INSERT INTO dispatch_queue (route_id, store_id, order_ids, route_type, rejection_count, last_rejected_at, rejected_by_motoboy_ids, cooldown_by_motoboy_id, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (route_id) DO UPDATE SET
          rejection_count = EXCLUDED.rejection_count,
          last_rejected_at = EXCLUDED.last_rejected_at,
          rejected_by_motoboy_ids = EXCLUDED.rejected_by_motoboy_ids,
          cooldown_by_motoboy_id = EXCLUDED.cooldown_by_motoboy_id
      `, [
        req.params.routeId, sellerStoreId,
        JSON.stringify(e.orderIds ?? []), e.routeType ?? 'single',
        e.rejectionCount ?? 0, e.lastRejectedAt ?? null,
        JSON.stringify(e.rejectedByMotoboyIds ?? []),
        JSON.stringify(e.cooldownByMotoboyId ?? {}),
        e.createdAt ?? Date.now(),
      ]);
    } else if (isMotoboy) {
      // Motoboys may only update rejection state on existing routes, not create or change store ownership
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Rota não encontrada' });

      await pool.query(`
        UPDATE dispatch_queue SET
          rejection_count = $1,
          last_rejected_at = $2,
          rejected_by_motoboy_ids = $3,
          cooldown_by_motoboy_id = $4
        WHERE route_id = $5
      `, [
        e.rejectionCount ?? 0, e.lastRejectedAt ?? null,
        JSON.stringify(e.rejectedByMotoboyIds ?? []),
        JSON.stringify(e.cooldownByMotoboyId ?? {}),
        req.params.routeId,
      ]);
    } else {
      // Admin: full upsert
      await pool.query(`
        INSERT INTO dispatch_queue (route_id, store_id, order_ids, route_type, rejection_count, last_rejected_at, rejected_by_motoboy_ids, cooldown_by_motoboy_id, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (route_id) DO UPDATE SET
          rejection_count = EXCLUDED.rejection_count,
          last_rejected_at = EXCLUDED.last_rejected_at,
          rejected_by_motoboy_ids = EXCLUDED.rejected_by_motoboy_ids,
          cooldown_by_motoboy_id = EXCLUDED.cooldown_by_motoboy_id
      `, [
        req.params.routeId, e.storeId ?? '',
        JSON.stringify(e.orderIds ?? []), e.routeType ?? 'single',
        e.rejectionCount ?? 0, e.lastRejectedAt ?? null,
        JSON.stringify(e.rejectedByMotoboyIds ?? []),
        JSON.stringify(e.cooldownByMotoboyId ?? {}),
        e.createdAt ?? Date.now(),
      ]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/dispatch-queue/:routeId', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !isAdmin;

    if (isSeller) {
      // Verify the route belongs to the seller's own store before deleting
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.status(403).json({ error: 'Perfil de vendedor não encontrado' });
      const sellerStoreId = profileRow.rows[0].store_id;

      const routeRow = await pool.query('SELECT store_id FROM dispatch_queue WHERE route_id = $1', [req.params.routeId]);
      if (routeRow.rows.length === 0) return res.status(404).json({ error: 'Rota não encontrada' });
      if (routeRow.rows[0].store_id !== sellerStoreId) {
        return res.status(403).json({ error: 'Acesso não autorizado: rota não pertence à sua loja' });
      }
    }

    await pool.query('DELETE FROM dispatch_queue WHERE route_id = $1', [req.params.routeId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
