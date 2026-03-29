import { pool } from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Exporta os dados da tabela addresses_cache para um arquivo SQL de INSERTs.
 */
async function exportCacheToSeed() {
  try {
    const result = await pool.query("SELECT address, lat, lng FROM addresses_cache");
    const rows = result.rows;

    if (rows.length === 0) {
      console.log("No data in addresses_cache to export.");
      return;
    }

    let sql = "-- Seed data for addresses_cache\n";
    sql += "INSERT INTO addresses_cache (address, lat, lng)\nVALUES\n";

    const values = rows.map(row => {
      const escapedAddress = row.address.replace(/'/g, "''");
      return `  ('${escapedAddress}', ${row.lat}, ${row.lng})`;
    });

    sql += values.join(",\n");
    sql += "\nON CONFLICT (address) DO NOTHING;";

    const outputPath = path.join(__dirname, "seed_addresses.sql");
    fs.writeFileSync(outputPath, sql);
    console.log(`Seed file generated at: ${outputPath}`);
  } catch (err) {
    console.error("Error exporting cache:", err);
  } finally {
    await pool.end();
  }
}

exportCacheToSeed();
