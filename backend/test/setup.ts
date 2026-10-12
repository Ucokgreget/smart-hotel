/**
 * Test bootstrap. Runs before any test module is imported, so modules that read
 * the environment at import time see safe local values instead of whatever is in
 * .env.local. Nothing here touches a real database.
 */
// connect_timeout keeps the one test that deliberately reaches the database
// from stalling on a real TCP attempt to a host that does not exist.
process.env.DATABASE_URL ??=
  "postgresql://postgres.test:test@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=1"
process.env.DIRECT_URL ??=
  "postgresql://postgres.test:test@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?connect_timeout=1"
process.env.JWT_SECRET ??= "test-secret-not-used-anywhere-else"
process.env.PAYMENT_GATEWAY_MODE ??= "mock"
process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET ??= "test-webhook-secret"
