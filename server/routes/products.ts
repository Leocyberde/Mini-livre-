import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../auth.js';

const router = Router();

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
    const jwtUser = req.jwtUser!;
    const isAdmin = jwtUser.roles.includes('admin');
    const products: unknown[] = req.body;
    for (const p of products as Array<Record<string, unknown>>) {
      // Sellers can only bulk-import into their own store
      const storeId = isAdmin ? p.storeId : jwtUser.id;
      await pool.query(`
        INSERT INTO products (id, store_id, name, price, original_price, image, image_url, category, stock, rating, reviews, description, frozen)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, storeId, p.name, p.price, p.originalPrice ?? null, p.image, p.imageUrl ?? null,
          p.category, p.stock, p.rating, p.reviews, p.description, p.frozen ?? false]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
