import { Router } from 'express';
import { pool } from './db.js';
import { requireAuth, requireRole, signToken } from './auth.js';

const router = Router();

// ─── SELLER PROFILE ───────────────────────────────────────────────────────────

router.get('/profiles/seller', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.json(null);
    const r = await pool.query('SELECT * FROM seller_profile WHERE id = $1', [userId]);
    if (r.rows.length === 0) return res.json(null);
    const row = r.rows[0];
    res.json({
      storeId: row.store_id,
      storeName: row.store_name,
      storeDescription: row.store_description,
      storeCategory: row.store_category,
      storeLogo: row.store_logo,
      storePhone: row.store_phone,
      storeEmail: row.store_email,
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
    const r = await pool.query('SELECT * FROM seller_profile WHERE store_name IS NOT NULL AND store_name != \'\'');
    res.json(r.rows.map(row => ({
      id: row.id,
      name: row.store_name,
      category: row.store_category,
      description: row.store_description,
      logo: row.store_logo,
      phone: row.store_phone,
      email: row.store_email,
      address: row.address,
    })));
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

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  try {
    const { storeId } = req.query;
    const r = storeId && typeof storeId === 'string'
      ? await pool.query('SELECT * FROM products WHERE store_id = $1 ORDER BY name', [storeId])
      : await pool.query('SELECT * FROM products ORDER BY name');
    res.json(r.rows.map(row => ({
      id: row.id,
      storeId: row.store_id,
      name: row.name,
      price: Number(row.price),
      originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
      image: row.image,
      imageUrl: row.image_url,
      imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
      category: row.category,
      stock: row.stock,
      rating: Number(row.rating),
      reviews: row.reviews,
      description: row.description,
      frozen: row.frozen,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/products', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const p = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    // Vendedor só pode criar produtos para a própria loja
    const storeId = isAdmin ? p.storeId : jwtUser.id;
    await pool.query(`
      INSERT INTO products (id, store_id, name, price, original_price, image, image_url, image_urls, category, stock, rating, reviews, description, frozen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        store_id=EXCLUDED.store_id, name=EXCLUDED.name, price=EXCLUDED.price,
        original_price=EXCLUDED.original_price, image=EXCLUDED.image, image_url=EXCLUDED.image_url,
        image_urls=EXCLUDED.image_urls, category=EXCLUDED.category, stock=EXCLUDED.stock, rating=EXCLUDED.rating,
        reviews=EXCLUDED.reviews, description=EXCLUDED.description, frozen=EXCLUDED.frozen
    `, [p.id, storeId, p.name, p.price, p.originalPrice ?? null, p.image, p.imageUrl ?? null,
        JSON.stringify(p.imageUrls ?? []),
        p.category, p.stock, p.rating, p.reviews, p.description, p.frozen ?? false]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/products/:id', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const p = req.body;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    // Verifica que o produto pertence à loja do vendedor (exceto admin)
    if (!isAdmin) {
      const check = await pool.query('SELECT store_id FROM products WHERE id = $1', [req.params.id]);
      if (check.rows.length > 0 && check.rows[0].store_id !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso negado: produto não pertence à sua loja' });
      }
    }

    await pool.query(`
      UPDATE products SET
        store_id=$1, name=$2, price=$3, original_price=$4, image=$5, image_url=$6,
        image_urls=$7, category=$8, stock=$9, rating=$10, reviews=$11, description=$12, frozen=$13
      WHERE id=$14
    `, [isAdmin ? p.storeId : jwtUser.id, p.name, p.price, p.originalPrice ?? null, p.image, p.imageUrl ?? null,
        JSON.stringify(p.imageUrls ?? []),
        p.category, p.stock, p.rating, p.reviews, p.description, p.frozen ?? false, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/products/:id', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');

    // Verifica que o produto pertence à loja do vendedor (exceto admin)
    if (!isAdmin) {
      const check = await pool.query('SELECT store_id FROM products WHERE id = $1', [req.params.id]);
      if (check.rows.length > 0 && check.rows[0].store_id !== jwtUser.id) {
        return res.status(403).json({ error: 'Acesso negado: produto não pertence à sua loja' });
      }
    }

    await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk upsert (for initial seed)
router.post('/products/bulk', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const products: unknown[] = req.body;
    for (const p of products as Array<Record<string, unknown>>) {
      await pool.query(`
        INSERT INTO products (id, store_id, name, price, original_price, image, image_url, category, stock, rating, reviews, description, frozen)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.storeId, p.name, p.price, p.originalPrice ?? null, p.image, p.imageUrl ?? null,
          p.category, p.stock, p.rating, p.reviews, p.description, p.frozen ?? false]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── ORDERS ───────────────────────────────────────────────────────────────────

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.query;
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const isSeller = jwtUser.roles.includes('seller');
    let r;

    if (clientId && clientId !== 'undefined' && clientId !== 'null' && clientId !== '') {
      // Modo cliente: filtra pelos pedidos do próprio cliente
      r = await pool.query('SELECT * FROM orders WHERE client_id = $1 ORDER BY created_at DESC', [clientId]);
    } else if (isAdmin) {
      // Admin vê todos os pedidos
      r = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    } else if (isSeller) {
      // Vendedor vê somente os pedidos da própria loja (store_id = userId)
      r = await pool.query('SELECT * FROM orders WHERE store_id = $1 ORDER BY created_at DESC', [jwtUser.id]);
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
        o.deliveredAt ?? null, false, o.clientId ?? null]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/status', requireRole('seller', 'admin', 'motoboy'), async (req, res) => {
  try {
    const { status, statusHistory, deliveredAt } = req.body;
    await pool.query(
      `UPDATE orders SET status=$1, updated_at=$2, status_history=$3, delivered_at=$4 WHERE id=$5`,
      [status, new Date().toISOString(), JSON.stringify(statusHistory ?? []), deliveredAt ?? null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/orders/:id/payment', requireRole('seller', 'admin'), async (req, res) => {
  try {
    const { paymentStatus } = req.body;
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

router.put('/orders/:id/seen', requireRole('seller', 'admin'), async (_req, res) => {
  try {
    await pool.query(`UPDATE orders SET seen_by_seller=TRUE WHERE id=$1`, [_req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
  };
}

// ─── CART ─────────────────────────────────────────────────────────────────────

router.get('/cart', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.query;
    let r;
    if (clientId && clientId !== 'undefined') {
      r = await pool.query('SELECT * FROM cart_items WHERE client_id = $1 ORDER BY id', [clientId]);
    } else {
      r = await pool.query('SELECT * FROM cart_items ORDER BY id');
    }
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
    const { clientId } = req.query;
    const items: Array<{ productId: string; storeId: string; quantity: number; price: number }> = req.body;
    
    if (clientId && clientId !== 'undefined') {
      await pool.query('DELETE FROM cart_items WHERE client_id = $1', [clientId]);
      for (const item of items) {
        await pool.query(`
          INSERT INTO cart_items (product_id, store_id, quantity, price, client_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [item.productId, item.storeId, item.quantity, item.price, clientId]);
      }
    } else {
      await pool.query('DELETE FROM cart_items');
      for (const item of items) {
        await pool.query(`
          INSERT INTO cart_items (product_id, store_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `, [item.productId, item.storeId, item.quantity, item.price]);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── MOTOBOYS ─────────────────────────────────────────────────────────────────

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
    const { userId } = req.body;
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
    await pool.query('UPDATE motoboys SET is_active_session=$1 WHERE id=$2', [isActive, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

router.post('/reviews/products', async (req, res) => {
  try {
    const r = req.body;
    await pool.query(`
      INSERT INTO product_reviews (id, product_id, product_name, store_id, rating, message, client_name, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [r.id, r.productId, r.productName, r.storeId, r.rating, r.message, r.clientName, r.createdAt]);
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

router.post('/reviews/stores', async (req, res) => {
  try {
    const r = req.body;
    await pool.query(`
      INSERT INTO store_reviews (id, store_id, store_name, order_id, rating, message, client_name, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [r.id, r.storeId, r.storeName, r.orderId, r.rating, r.message, r.clientName, r.createdAt]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

router.get('/notifications', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100');
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
    await pool.query(`
      INSERT INTO notifications (id, title, body, icon, timestamp, read, target, type, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [n.id, n.title, n.body, n.icon, n.timestamp, n.read ?? false,
        n.target, n.type ?? 'general', JSON.stringify(n.metadata ?? {})]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const { target } = req.body;
    if (target) {
      await pool.query(`UPDATE notifications SET read=TRUE WHERE target=$1`, [target]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET read=TRUE WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────

router.get('/chat/:orderId', async (req, res) => {
  try {
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
    await pool.query('DELETE FROM chat_messages WHERE order_id=$1', [req.params.orderId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PRODUCT Q&A ──────────────────────────────────────────────────────────────

router.get('/product-qa', async (_req, res) => {
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
    await pool.query(`UPDATE product_qa SET status='closed' WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELIVERY ─────────────────────────────────────────────────────────────────

import { calculateDelivery } from './delivery.js';

router.post('/delivery/calculate', async (req, res) => {
  const { storeAddress, customerAddress } = req.body;
  if (!storeAddress || !customerAddress) {
    return res.status(400).json({ error: 'Store and customer addresses are required' });
  }
  try {
    const result = await calculateDelivery(storeAddress, customerAddress);
    if (!result) return res.status(500).json({ error: 'Could not calculate delivery' });
    res.json(result);
  } catch (err) {
    console.error('Error calculating delivery:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────────

import { compare, hash } from 'bcryptjs';
import { nanoid } from 'nanoid';

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

router.get('/auth/user/:id', async (req, res) => {
  try {
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
    const { userId, role, storeData, motoboyData } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId e role são obrigatórios' });
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
    res.json({ ok: true, code, message: 'Código gerado. Em produção, seria enviado por e-mail.' });
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
    const { nanoid } = await import('nanoid');
    const {
      storeId, title, description, type, value, minOrderValue,
      applyTo, productIds, category, startsAt, endsAt, isActive,
      buyQuantity, getQuantity,
    } = req.body;
    const id = nanoid();
    const createdAt = new Date().toISOString();
    await pool.query(`
      INSERT INTO promotions
        (id, store_id, title, description, type, value, min_order_value, apply_to, product_ids, category, starts_at, ends_at, is_active, buy_quantity, get_quantity, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    `, [id, storeId, title, description || '', type, value || 0, minOrderValue || 0,
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
    await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ─── GEOCODE ──────────────────────────────────────────────────────────────────

router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'address is required' });
    }
    const { getOrCreateCoordinates } = await import('./googleMaps.js');
    const coords = await getOrCreateCoordinates(address);
    if (!coords) return res.status(404).json({ error: 'Could not geocode address' });
    res.json({ lat: coords.lat, lng: coords.lng });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
