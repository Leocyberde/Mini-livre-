import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Cache de geocodificação
      CREATE TABLE IF NOT EXISTS addresses_cache (
        id SERIAL PRIMARY KEY,
        address TEXT UNIQUE NOT NULL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_cache_address ON addresses_cache(address);

      -- Cache de distâncias (Google Distance Matrix)
      CREATE TABLE IF NOT EXISTS distances_cache (
        id SERIAL PRIMARY KEY,
        route_key TEXT UNIQUE NOT NULL,
        distance_km DOUBLE PRECISION NOT NULL,
        duration TEXT NOT NULL DEFAULT 'N/A',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_distances_cache_key ON distances_cache(route_key);

      -- Perfil da loja (vendedor) — uma linha só
      CREATE TABLE IF NOT EXISTS seller_profile (
        id TEXT PRIMARY KEY DEFAULT 'default',
        store_id TEXT NOT NULL DEFAULT 'store-1',
        store_name TEXT NOT NULL DEFAULT '',
        store_description TEXT NOT NULL DEFAULT '',
        store_category TEXT NOT NULL DEFAULT '',
        store_logo TEXT NOT NULL DEFAULT '',
        store_phone TEXT NOT NULL DEFAULT '',
        store_email TEXT NOT NULL DEFAULT '',
        address JSONB
      );

      -- Perfis de clientes
      CREATE TABLE IF NOT EXISTS client_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        addresses JSONB NOT NULL DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- Produtos
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        name TEXT NOT NULL,
        price DOUBLE PRECISION NOT NULL DEFAULT 0,
        original_price DOUBLE PRECISION,
        image TEXT NOT NULL DEFAULT '',
        image_url TEXT,
        category TEXT NOT NULL DEFAULT '',
        stock INTEGER NOT NULL DEFAULT 0,
        rating DOUBLE PRECISION NOT NULL DEFAULT 0,
        reviews INTEGER NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        frozen BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- Pedidos
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        items JSONB NOT NULL DEFAULT '[]',
        total DOUBLE PRECISION NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        customer_name TEXT NOT NULL DEFAULT '',
        customer_email TEXT NOT NULL DEFAULT '',
        customer_phone TEXT,
        delivery_code TEXT,
        is_pickup BOOLEAN NOT NULL DEFAULT FALSE,
        payment_status TEXT DEFAULT 'pending_payment',
        delivery_address JSONB,
        delivery_coords JSONB,
        distance_km DOUBLE PRECISION,
        moto_ride_value DOUBLE PRECISION,
        store_name TEXT,
        store_address TEXT,
        store_coords JSONB,
        status_history JSONB DEFAULT '[]',
        delivered_at TEXT,
        seen_by_seller BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- Carrinho
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL,
        store_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price DOUBLE PRECISION NOT NULL DEFAULT 0
      );

      -- Motoboys
      CREATE TABLE IF NOT EXISTS motoboys (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        vehicle TEXT NOT NULL DEFAULT '',
        license_plate TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'unavailable',
        block_info JSONB,
        joined_at TEXT NOT NULL DEFAULT '',
        rating DOUBLE PRECISION NOT NULL DEFAULT 0,
        completed_total INTEGER NOT NULL DEFAULT 0,
        rejected_total INTEGER NOT NULL DEFAULT 0,
        is_active_session BOOLEAN NOT NULL DEFAULT FALSE
      );
      ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS user_id TEXT;

      -- Avaliações de produtos
      CREATE TABLE IF NOT EXISTS product_reviews (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL DEFAULT '',
        store_id TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL DEFAULT '',
        client_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      -- Avaliações de lojas
      CREATE TABLE IF NOT EXISTS store_reviews (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        store_name TEXT NOT NULL DEFAULT '',
        order_id TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL DEFAULT '',
        client_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      -- Notificações
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '',
        timestamp TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        target TEXT NOT NULL DEFAULT 'client',
        type TEXT NOT NULL DEFAULT 'general',
        metadata JSONB DEFAULT '{}'
      );

      -- Chat motoboy/cliente
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        timestamp TEXT NOT NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_chat_order_id ON chat_messages(order_id);

      -- Perguntas e respostas de produtos
      CREATE TABLE IF NOT EXISTS product_qa (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL DEFAULT '',
        product_image TEXT,
        store_id TEXT NOT NULL,
        store_name TEXT NOT NULL DEFAULT '',
        question TEXT NOT NULL DEFAULT '',
        answer TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        client_name TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        answered_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_product_qa_product ON product_qa(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_qa_store ON product_qa(store_id);

      -- Client isolation columns (idempotent)
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id TEXT;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS motoboy_id TEXT;
      ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT '';

      -- Product multiple images (idempotent)
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]';

      -- Promoções
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'percentage',
        value DOUBLE PRECISION NOT NULL DEFAULT 0,
        min_order_value DOUBLE PRECISION NOT NULL DEFAULT 0,
        apply_to TEXT NOT NULL DEFAULT 'all',
        product_ids JSONB NOT NULL DEFAULT '[]',
        category TEXT NOT NULL DEFAULT '',
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        buy_quantity INTEGER NOT NULL DEFAULT 1,
        get_quantity INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_promotions_store ON promotions(store_id);

      -- Users (auth)
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        cpf TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        whatsapp TEXT NOT NULL DEFAULT '',
        password_hash TEXT NOT NULL,
        roles TEXT[] NOT NULL DEFAULT '{client}',
        cep TEXT NOT NULL DEFAULT '',
        logradouro TEXT NOT NULL DEFAULT '',
        numero TEXT NOT NULL DEFAULT '',
        complemento TEXT NOT NULL DEFAULT '',
        bairro TEXT NOT NULL DEFAULT '',
        cidade TEXT NOT NULL DEFAULT '',
        uf TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Password reset tokens
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE
      );

      -- Notification recipient scoping (idempotent)
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS store_id TEXT;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS client_id TEXT;

      -- Revoked JWT tokens (logout / token invalidation)
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL
      );
      -- Purge already-expired revoked tokens on every startup
      DELETE FROM revoked_tokens WHERE expires_at < NOW();

      -- Motoboy completed routes history
      CREATE TABLE IF NOT EXISTS motoboy_routes (
        id TEXT PRIMARY KEY,
        motoboy_user_id TEXT NOT NULL,
        completed_at TIMESTAMP NOT NULL,
        value DOUBLE PRECISION NOT NULL DEFAULT 0,
        from_label TEXT NOT NULL DEFAULT '',
        to_label TEXT NOT NULL DEFAULT '',
        store_address TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_motoboy_routes_user ON motoboy_routes(motoboy_user_id);

      -- Dispatch queue — persists motoboy rejection state across reloads
      CREATE TABLE IF NOT EXISTS dispatch_queue (
        route_id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL DEFAULT '',
        order_ids JSONB NOT NULL DEFAULT '[]',
        route_type TEXT NOT NULL DEFAULT 'single',
        rejection_count INTEGER NOT NULL DEFAULT 0,
        last_rejected_at BIGINT,
        rejected_by_motoboy_ids JSONB NOT NULL DEFAULT '[]',
        cooldown_by_motoboy_id JSONB NOT NULL DEFAULT '{}',
        created_at BIGINT NOT NULL
      );
    `);
    console.log('Database tables initialized');

    // Seed admin user if not exists
    await seedAdmin(client);
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function seedAdmin(client: import('pg').PoolClient) {
  const { hash } = await import('bcryptjs');
  const { nanoid } = await import('nanoid');
  const adminEmail = 'leolulu842@gmail.com';
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const passwordHash = await hash('leoluh123', 10);
    await client.query(`
      INSERT INTO users (id, cpf, name, email, whatsapp, password_hash, roles)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [nanoid(), '00000000000', 'Administrador', adminEmail, '', passwordHash, ['admin']]);
    console.log('Admin user seeded');
  }
}

export interface CachedAddress {
  id: number;
  address: string;
  lat: number;
  lng: number;
  created_at: Date;
}

export async function getCachedAddress(address: string): Promise<CachedAddress | null> {
  const normalizedAddress = address.toLowerCase().trim();
  const result = await pool.query(
    'SELECT * FROM addresses_cache WHERE address = $1',
    [normalizedAddress]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
}

export async function saveAddressToCache(address: string, lat: number, lng: number): Promise<void> {
  const normalizedAddress = address.toLowerCase().trim();
  await pool.query(
    'INSERT INTO addresses_cache (address, lat, lng) VALUES ($1, $2, $3) ON CONFLICT (address) DO NOTHING',
    [normalizedAddress, lat, lng]
  );
}

// ── Distance cache ────────────────────────────────────────────────────────────

function buildRouteKey(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): string {
  // Round to 4 decimal places (~11 m precision) to allow minor GPS drift to hit cache
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return `${round(origin.lat)},${round(origin.lng)}->${round(dest.lat)},${round(dest.lng)}`;
}

export async function getCachedDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ distanceKm: number; duration: string } | null> {
  const key = buildRouteKey(origin, dest);
  const result = await pool.query(
    'SELECT distance_km, duration FROM distances_cache WHERE route_key = $1',
    [key]
  );
  if (result.rows.length > 0) {
    return { distanceKm: result.rows[0].distance_km, duration: result.rows[0].duration };
  }
  return null;
}

export async function saveDistanceToCache(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  distanceKm: number,
  duration: string
): Promise<void> {
  const key = buildRouteKey(origin, dest);
  await pool.query(
    'INSERT INTO distances_cache (route_key, distance_km, duration) VALUES ($1, $2, $3) ON CONFLICT (route_key) DO NOTHING',
    [key, distanceKm, duration]
  );
}
