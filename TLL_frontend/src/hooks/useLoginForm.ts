import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { authApi } from "../services/auth.service";
import { logger } from "../lib/logger";

export const useLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate("/inbox");
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      const response = error?.response as Record<string, unknown>;
      const data = response?.data as Record<string, unknown>;
      setError(String(data?.message) || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getGoogleAuthUrl();
      window.location.href = response.url;
    } catch (err) {
      logger.error("Failed to get Google auth URL", err);
      setError("Failed to initialize Google login");
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    error,
    handleSubmit,
    handleGoogleLogin,
  };
};
