import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

try {
  await db.raw.query(fs.readFileSync(schemaPath, 'utf8'));
  console.log('Database schema initialized successfully!');
} catch (error) {
  console.error('Error initializing database:', error);
  process.exitCode = 1;
} finally {
  await db.end();
}
