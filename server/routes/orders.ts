import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// ─── ORDERS ───────────────────────────────────────────────────────────────────

function mapOrder(row: Record<string, unknown>) {
  return {
    id: row.id,
    storeId: row.store_id,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    deliveryCode: row.delivery_code,
    isPickup: row.is_pickup,
    paymentStatus: row.payment_status,
    deliveryAddress: row.delivery_address,
    deliveryCoords: row.delivery_coords,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : undefined,
    motoRideValue: row.moto_ride_value != null ? Number(row.moto_ride_value) : undefined,
    storeName: row.store_name,
    storeAddress: row.store_address,
    storeCoords: row.store_coords,
    statusHistory: row.status_history,
    deliveredAt: row.delivered_at,
    seenBySeller: row.seen_by_seller,
    motoboyId: row.motoboy_id ?? undefined,
  };
}

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.query;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller');
    let r;

    const isMotoboy = jwtUser.roles.includes('motoboy');

    if (clientId && clientId !== 'undefined' && clientId !== 'null' && clientId !== '') {
      // Não-admin só pode ver os próprios pedidos; ignora clientId externo
      if (!isAdmin && clientId !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
      r = await pool.query('SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC', [clientId]);
    } else if (isAdmin) {
      // Admin vê todos os pedidos
      r = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    } else if (isSeller) {
      // Vendedor vê somente os pedidos da própria loja (store_id = userId)
      r = await pool.query('SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC', [jwtUser.id]);
    } else if (isMotoboy) {
      // Motoboy vê: pedidos aguardando entrega sem motoboy atribuído OU pedidos atribuídos a ele
      r = await pool.query(
        `SELECT * FROM orders WHERE
          (status = 'waiting_motoboy' AND (motoboy_id IS NULL OR motoboy_id = $1))
          OR motoboy_id = $1
        ORDER BY created_at DESC`,
        [jwtUser.id]
      );
    } else {
      // Fallback: retorna somente pedidos do próprio usuário como cliente
      r = await pool.query('SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC', [jwtUser.id]);
    }
    res.json(r.rows.map(mapOrder));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/orders', requireAuth, async (req, res) => {
  try {
    const o = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    // Non-admins must always use their own id as clientId
    const clientId = isAdmin ? (o.clientId ?? jwtUser.id) : jwtUser.id;
    await pool.query(`
      INSERT INTO orders (id, store_id, items, total, status, created_at, updated_at,
        customer_name, customer_email, customer_phone, delivery_code, is_pickup, payment_status,
        delivery_address, delivery_coords, distance_km, moto_ride_value, store_name, store_address,
        store_coords, status_history, delivered_at, seen_by_seller, client_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (id) DO NOTHING
    `, [o.id, o.storeId, JSON.stringify(o.items), o.total, o.status,
        o.createdAt, o.updatedAt, o.customerName, o.customerEmail,
        o.customerPhone ?? null, o.deliveryCode ?? null, o.isPickup ?? false,
        o.paymentStatus ?? 'pending_payment',
        o.deliveryAddress ? JSON.stringify(o.deliveryAddress) : null,
        o.deliveryCoords ? JSON.stringify(o.deliveryCoords) : null,
        o.distanceKm ?? null, o.motoRideValue ?? null,
        o.storeName ?? null, o.storeAddress ?? null,
        o.storeCoords ? JSON.stringify(o.storeCoords) : null,
        JSON.stringify(o.statusHistory ?? []),
        o.deliveredAt ?? null, false, clientId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/status', requireRole('seller', 'admin', 'motoboy'), async (req, res) => {
  try {
    const { status, statusHistory, deliveredAt, motoRideValue } = req.body;
    const jwtUser = req.jwtUser!;
    const isMotoboy = jwtUser.roles.includes('motoboy') && !jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller') && !jwtUser.roles.includes('admin');

    if (isSeller) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.status(403).json({ error: 'Perfil de vendedor não encontrado' });
      const orderRow = await pool.query('SELECT store_id FROM orders WHERE id = $1', [req.params.id]);
      if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      if (orderRow.rows[0].store_id !== profileRow.rows[0].store_id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    const motoboyStatuses = ['motoboy_accepted', 'picked_up', 'motoboy_at_store', 'on_the_way', 'motoboy_arrived', 'delivered'];

    if (isMotoboy && motoboyStatuses.includes(status)) {
      // Fetch the current order state before allowing any motoboy status update
      const orderRow = await pool.query('SELECT status, motoboy_id FROM orders WHERE id = $1', [req.params.id]);
      if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' });

      const order = orderRow.rows[0];

      if (status === 'motoboy_accepted') {
        // Guard: only allow claiming if the order is waiting and not yet assigned
        if (order.status !== 'waiting_motoboy') {
          return res.status(409).json({ error: 'Pedido não está aguardando motoboy' });
        }
        if (order.motoboy_id !== null && order.motoboy_id !== jwtUser.id) {
          return res.status(409).json({ error: 'Pedido já foi atribuído a outro motoboy' });
        }
      } else {
        // For subsequent statuses, the motoboy must be the one already assigned
        if (order.motoboy_id !== jwtUser.id) {
          return res.status(403).json({ error: 'Acesso não autorizado: pedido não é seu' });
        }
      }

      await pool.query(
        `UPDATE orders SET status=$1, updated_at=$2, status_history=$3, delivered_at=$4, motoboy_id=$5${motoRideValue != null ? ', moto_ride_value=$7' : ''} WHERE id=$6`,
        motoRideValue != null
          ? [status, new Date().toISOString(), JSON.stringify(statusHistory ?? []), deliveredAt ?? null, jwtUser.id, req.params.id, motoRideValue]
          : [status, new Date().toISOString(), JSON.stringify(statusHistory ?? []), deliveredAt ?? null, jwtUser.id, req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE orders SET status=$1, updated_at=$2, status_history=$3, delivered_at=$4${motoRideValue != null ? ', moto_ride_value=$6' : ''} WHERE id=$5`,
        motoRideValue != null
          ? [status, new Date().toISOString(), JSON.stringify(statusHistory ?? []), deliveredAt ?? null, req.params.id, motoRideValue]
          : [status, new Date().toISOString(), JSON.stringify(statusHistory ?? []), deliveredAt ?? null, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/payment', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const jwtUser = req.jwtUser!;
    const isSeller = jwtUser.roles.includes('seller') && !jwtUser.roles.includes('admin');

    if (isSeller) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.status(403).json({ error: 'Perfil de vendedor não encontrado' });
      const orderRow = await pool.query('SELECT store_id FROM orders WHERE id = $1', [req.params.id]);
      if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      if (orderRow.rows[0].store_id !== profileRow.rows[0].store_id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    await pool.query(
      `UPDATE orders SET payment_status=$1, updated_at=$2 WHERE id=$3`,
      [paymentStatus, new Date().toISOString(), req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/seen', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isSeller = jwtUser.roles.includes('seller') && !jwtUser.roles.includes('admin');

    if (isSeller) {
      const profileRow = await pool.query('SELECT store_id FROM seller_profile WHERE id = $1', [jwtUser.id]);
      if (profileRow.rows.length === 0) return res.status(403).json({ error: 'Perfil de vendedor não encontrado' });
      const orderRow = await pool.query('SELECT store_id FROM orders WHERE id = $1', [req.params.id]);
      if (orderRow.rows.length === 0) return res.status(404).json({ error: 'Pedido não encontrado' });
      if (orderRow.rows[0].store_id !== profileRow.rows[0].store_id) {
        return res.status(403).json({ error: 'Acesso não autorizado' });
      }
    }

    await pool.query(`UPDATE orders SET seen_by_seller=TRUE WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
