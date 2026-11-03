import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function getUser(userId) {
  const result = await query(
    `
    SELECT
      id,
      email,
      is_admin,
      admin_panel_access,
      email_verified,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export async function getUserByEmail(email) {
  const result = await query(
    `
    SELECT
      id,
      email,
      is_admin,
      admin_panel_access,
      email_verified,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status
    FROM users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function getEntitlement(userId) {
  const result = await query(
    `
    SELECT *
    FROM product_entitlements
    WHERE user_id = $1
      AND product = 'sports_jedi'
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

export default pool;

export async function getActiveTrial(userId) {
  const result = await query(
    "SELECT ends_at FROM sports_jedi_trials WHERE user_id = $1 AND ends_at > NOW() LIMIT 1",
    [userId]
  );
  return result.rows[0] || null;
}
