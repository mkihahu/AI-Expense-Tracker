import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DROP_ALL = `
    DROP TABLE IF EXISTS ai_insights CASCADE;
    DROP TABLE IF EXISTS budgets CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
`;

const runMigrations = async () => {
    const shouldReset = process.argv.includes('--reset');
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');

    try {
        if (shouldReset) {
            console.log('⏳ Dropping all tables...');
            await pool.query(DROP_ALL);
            console.log('✅ All tables dropped');
        }

        console.log('📂 Reading schema file...');
        const schemaSQL = await fs.readFile(schemaPath, 'utf8');

        console.log('⏳ Applying schema...');
        await pool.query(schemaSQL);
        console.log('✅ Schema applied successfully');

        console.log('🎉 Database migration completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

runMigrations();    