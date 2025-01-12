const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const { Pool } = require('pg');



// Create a pool instance
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

// Function to test the connection
(async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to PostgreSQL successfully!');
        client.release(); // Release the client back to the pool
    } catch (err) {
        console.error('Error connecting to PostgreSQL:', err);
    }
})();

module.exports = pool;
