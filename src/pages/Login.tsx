import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import GoogleIcon from "@/components/GoogleIcon";
import AuthService from "@/utils/AuthService";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    const token = searchParams.get("token");
    const user = searchParams.get("user");

    if (token) {
      AuthService.setToken(token);
      if (user) {
        try {
          AuthService.setUser(JSON.parse(user));
        } catch {
          localStorage.setItem("user", user);
        }
      }
      navigate("/trade", { replace: true });
      return;
    }

    if (searchParams.get("error")) {
      setErrors((prev) => ({
        ...prev,
        general: "Google authentication failed. Please try again.",
      }));
    }
  }, [navigate, searchParams]);

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await AuthService.login(email.toLowerCase(), password);
      navigate("/trade");
    } catch (error: unknown) {
      setErrors((prev) => ({
        ...prev,
        general: error instanceof Error ? error.message : "Login failed. Please try again.",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="login-card animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            NEXUS<span className="text-primary">X</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Professional trading access</p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
            {errors.general}
          </div>
        )}

        <button type="button" onClick={() => (window.location.href = `${apiBaseUrl}/auth/google`)} disabled={isLoading} className="btn-google">
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="divider-line" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
          <div className="divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="trader@example.com"
              className={`input-exchange ${errors.email ? "ring-2 ring-destructive border-transparent" : ""}`}
              disabled={isLoading}
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              className={`input-exchange ${errors.password ? "ring-2 ring-destructive border-transparent" : ""}`}
              disabled={isLoading}
            />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary mt-6 w-full">
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
