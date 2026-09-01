require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

async function createDefaultAdmin() {
  try {
    const email = process.env.ADMIN_DEFAULT_EMAIL || 'swamisamarthsshop@gmail.com';
    const username = process.env.ADMIN_DEFAULT_USERNAME || 'sagar raje';
    const password = process.env.ADMIN_DEFAULT_PASSWORD || 'swamisamarth@9922';

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1 OR username = $2', [email, username]);

    if (existing.rowCount > 0) {
      console.log('Default admin already exists.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO admins (name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      ['System Admin', username, email, passwordHash, 'admin']
    );

    console.log('Default admin created successfully.');
  } catch (error) {
    console.error("Seed admin error:", error);
}
}

async function main() {
  await createDefaultAdmin();
  process.exit(0);
}

main();
