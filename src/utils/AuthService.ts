const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  auth_method: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export class AuthService {
  static getToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  static setToken(token: string): void {
    localStorage.setItem("accessToken", token);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  static setUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static logout(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    this.setToken(data.data.accessToken);
    this.setUser(data.data.user);

    return data.data;
  }

  static async register(
    email: string,
    password: string,
    firstName: string,
    lastName?: string
  ): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    this.setToken(data.data.accessToken);
    this.setUser(data.data.user);

    return data.data;
  }

  static async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch profile");
    }

    this.setUser(data.data);
    return data.data;
  }

  static async logoutServer(): Promise<void> {
    const token = this.getToken();
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    this.logout();
  }

  static getAuthHeaders(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export default AuthService;
