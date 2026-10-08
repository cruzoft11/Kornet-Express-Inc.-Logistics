import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl?.startsWith('file:')) {
  throw new Error('DATABASE_URL must be a SQLite file: URL before production schema sync.');
}

const urlPath = decodeURIComponent(databaseUrl.slice('file:'.length).split('?')[0]);
const databasePath = path.isAbsolute(urlPath)
  ? urlPath
  : path.resolve(serverRoot, urlPath);
const schemaHash = crypto.createHash('sha256').update(fs.readFileSync(schemaPath)).digest('hex').slice(0, 12);
const backupRoot = process.env.KORNET_DB_BACKUP_DIR
  ?? path.join(process.env.HOME ?? serverRoot, 'kornet-db-backups');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.mkdirSync(backupRoot, { recursive: true });

if (fs.existsSync(databasePath) && fs.statSync(databasePath).size > 0) {
  const backupPath = path.join(backupRoot, `kornet-before-${schemaHash}.db`);
  if (!fs.existsSync(backupPath)) {
    const temporaryBackup = `${backupPath}.tmp`;
    if (fs.existsSync(temporaryBackup)) fs.rmSync(temporaryBackup);
    const source = new DatabaseSync(databasePath);
    try {
      source.exec('PRAGMA wal_checkpoint(FULL)');
      source.exec(`VACUUM INTO '${temporaryBackup.replaceAll("'", "''")}'`);
    } finally {
      source.close();
    }
    fs.renameSync(temporaryBackup, backupPath);
    console.log(`[boot] SQLite backup created before schema sync (${path.basename(backupPath)}).`);
  }
}

const db = new DatabaseSync(databasePath);
try {
  const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(({ name }) => name));
  const columns = (table) => new Set(
    db.prepare(`PRAGMA table_info("${table}")`).all().map(({ name }) => name),
  );
  const addColumn = (table, column) => {
    if (!tables.has(table) || columns(table).has(column)) return;
    db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" TEXT`);
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    if (tables.has('BridgeItem')) {
      addColumn('BridgeItem', 'sourceType');
      addColumn('BridgeItem', 'sourceId');
      addColumn('BridgeItem', 'journal');
      db.exec("UPDATE BridgeItem SET sourceType=COALESCE(NULLIF(sourceType,''),'LEGACY'), sourceId=COALESCE(NULLIF(sourceId,''),'legacy:'||id), journal=COALESCE(NULLIF(journal,''),'LEGACY')");
    }
    if (tables.has('CheckDisbursement')) {
      addColumn('CheckDisbursement', 'voucherNo');
      db.exec("UPDATE CheckDisbursement SET voucherNo=COALESCE(NULLIF(voucherNo,''),'LEGACY-'||id)");
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
} finally {
  db.close();
}
