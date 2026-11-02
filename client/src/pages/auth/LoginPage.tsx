import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LogIn, Lock, Mail, Sparkles, UserCheck, Shield, Heart } from "lucide-react";
import { Alert } from "../../components/common/Alert";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>("admin@ayursutra.com");
  const [password, setPassword] = useState<string>("Admin@123");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const user = await login({ email, password });
      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "THERAPIST") navigate("/therapist");
      else navigate("/patient");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (role: "ADMIN" | "THERAPIST" | "PATIENT") => {
    if (role === "ADMIN") {
      setEmail("admin@ayursutra.com");
      setPassword("Admin@123");
    } else if (role === "THERAPIST") {
      setEmail("therapist@ayursutra.com");
      setPassword("Therapist@123");
    } else {
      setEmail("patient@ayursutra.com");
      setPassword("Patient@123");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-serif text-stone-900">Sign In to AyurSutra</h2>
        <p className="text-xs text-stone-500 mt-1">
          Access your clinical dashboard, therapy schedules, or personal healing journey.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Quick Demo Credentials Switcher */}
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block mb-2">
          Demo One-Click Logins:
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickFill("ADMIN")}
            className="px-2 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-ayur-600 text-[11px] font-semibold text-stone-800 flex items-center justify-center gap-1 transition-all shadow-xs"
          >
            <Shield className="w-3 h-3 text-ayur-700" /> Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("THERAPIST")}
            className="px-2 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-ayur-600 text-[11px] font-semibold text-stone-800 flex items-center justify-center gap-1 transition-all shadow-xs"
          >
            <UserCheck className="w-3 h-3 text-ayur-700" /> Therapist
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("PATIENT")}
            className="px-2 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-ayur-600 text-[11px] font-semibold text-stone-800 flex items-center justify-center gap-1 transition-all shadow-xs"
          >
            <Heart className="w-3 h-3 text-ayur-700" /> Patient
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600 font-medium"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-md shadow-ayur-900/10 transition-all flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {isLoading ? "Signing In..." : "Sign In to Clinic Portal"}
        </button>
      </form>

      <div className="text-center text-xs text-stone-500 pt-2">
        New patient?{" "}
        <Link to="/register" className="font-semibold text-ayur-700 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
};
