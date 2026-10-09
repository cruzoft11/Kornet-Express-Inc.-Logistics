import { DatabaseSync } from 'node:sqlite';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Find the db
const paths = [
  './prisma/data/accounting.db',
  './prisma/data/kornet.db',
  '../accounting_v11.db',
];

for (const p of paths) {
  if (existsSync(p)) {
    console.log('Found DB at:', p);
    const db = new DatabaseSync(p);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('Tables:', tables.map(t => t.name).join(', '));
    db.close();
  }
}
