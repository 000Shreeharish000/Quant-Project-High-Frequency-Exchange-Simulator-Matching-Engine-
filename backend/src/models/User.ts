import { query } from "../database/connection.js";

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  google_id?: string;
  auth_method: string;
  profile_picture_url?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export class UserModel {
  static async create(userData: {
    email: string;
    password_hash?: string;
    first_name?: string;
    last_name?: string;
    google_id?: string;
    auth_method: string;
    profile_picture_url?: string;
  }): Promise<User> {
    const result = await query(
      `INSERT INTO users 
        (email, password_hash, first_name, last_name, google_id, auth_method, profile_picture_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userData.email,
        userData.password_hash || null,
        userData.first_name || null,
        userData.last_name || null,
        userData.google_id || null,
        userData.auth_method,
        userData.profile_picture_url || null,
      ]
    );

    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await query(`SELECT * FROM users WHERE email = $1 AND is_active = true`, [
      email.toLowerCase(),
    ]);
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const result = await query(`SELECT * FROM users WHERE id = $1 AND is_active = true`, [id]);
    return result.rows[0] || null;
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await query(`SELECT * FROM users WHERE google_id = $1 AND is_active = true`, [
      googleId,
    ]);
    return result.rows[0] || null;
  }

  static async update(
    id: string,
    updates: Partial<Omit<User, "id" | "created_at" | "updated_at">>
  ): Promise<User | null> {
    const fields = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(", ");

    if (!fields) return this.findById(id);

    const result = await query(
      `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${Object.keys(updates).length + 1} RETURNING *`,
      [...Object.values(updates), id]
    );

    return result.rows[0] || null;
  }

  static async getUserProfile(id: string): Promise<Partial<User> | null> {
    const user = await this.findById(id);
    if (!user) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  static async existsByEmail(email: string): Promise<boolean> {
    const result = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    return result.rows.length > 0;
  }

  static async existsByGoogleId(googleId: string): Promise<boolean> {
    const result = await query(`SELECT id FROM users WHERE google_id = $1`, [googleId]);
    return result.rows.length > 0;
  }
}

export default UserModel;
