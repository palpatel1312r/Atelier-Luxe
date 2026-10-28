import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'atelier_luxe';

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);
  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${database}\``);

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await conn.query(stmt);
  }

  console.log(`Database "${database}" ready — all tables created.`);
  await conn.end();
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
