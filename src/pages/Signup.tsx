import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthService from "@/utils/AuthService";
import GoogleIcon from "@/components/GoogleIcon";

interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupErrors {
  firstName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const Signup = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<SignupData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<SignupErrors>({});

  const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const normalizedValue = name === "email" ? value.trimStart().toLowerCase() : value.trimStart();
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }));
    if (errors[name as keyof SignupErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: SignupErrors = {};

    if (!formData.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!formData.email.trim()) nextErrors.email = "Email is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email";
    }
    if (formData.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await AuthService.register(
        formData.email.toLowerCase(),
        formData.password,
        formData.firstName,
        formData.lastName || undefined
      );
      navigate("/trade");
    } catch (error: unknown) {
      setErrors((prev) => ({
        ...prev,
        general: error instanceof Error ? error.message : "Signup failed. Please try again.",
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
            Create your NEXUS<span className="text-primary">X</span> account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Email/password and Google login supported</p>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
            {errors.general}
          </div>
        )}

        <button type="button" onClick={() => (window.location.href = `${apiBaseUrl}/auth/google`)} disabled={isLoading} className="btn-google">
          <GoogleIcon />
          <span>Sign up with Google</span>
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="divider-line" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
          <div className="divider-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground mb-1.5">First Name</label>
            <input id="firstName" type="text" name="firstName" autoComplete="given-name" value={formData.firstName} onChange={handleChange} className="input-exchange" disabled={isLoading} />
            {errors.firstName && <p className="error-text">{errors.firstName}</p>}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground mb-1.5">Last Name</label>
            <input id="lastName" type="text" name="lastName" autoComplete="family-name" value={formData.lastName} onChange={handleChange} className="input-exchange" disabled={isLoading} />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
            <input id="email" type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} className="input-exchange" disabled={isLoading} />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
            <input id="password" type="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} className="input-exchange" disabled={isLoading} />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground mb-1.5">Confirm Password</label>
            <input id="confirmPassword" type="password" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} className="input-exchange" disabled={isLoading} />
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary mt-6 w-full">
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
