import { query } from "./connection.js";

export async function initializeDatabase() {
  try {
    console.log("🔄 Initializing database schema...");

    // Drop existing table if exists (for development)
    await query(`
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        google_id VARCHAR(255) UNIQUE,
        auth_method VARCHAR(50) NOT NULL DEFAULT 'email',
        profile_picture_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_google_id ON users(google_id);
    `);

    console.log("✅ Database schema initialized successfully!");
    return true;
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
}

// Run initialization
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
