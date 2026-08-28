const { pool } = require('../config/db');

async function generateJobId() {
  const year = new Date().getFullYear();
  const prefix = `MR${year}`;

  const result = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(job_id FROM 8) AS INTEGER)), 0) + 1 AS next_number
     FROM repairs
     WHERE job_id LIKE $1`,
    [`${prefix}%`]
  );

  const nextNumber = Number(result.rows[0].next_number || 1);
  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
}

module.exports = { generateJobId };
