import dotenv from "dotenv";
import pkg from 'pg';

const {Pool, types} = pkg;

dotenv.config();

// Return DATE columns as plain 'YYY-MM-DD' strings instead of JS Date objects
// so JSON serialization doesn't UTC-shift the date for clients in in non_UTC timezones
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('Connected to Neon PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
