import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { UserPlus, Lock, Mail, User, Phone, Calendar } from "lucide-react";
import { Alert } from "../../components/common/Alert";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "1995-05-15",
    gender: "Male" as const,
    address: "",
    emergencyContact: "",
    medicalNotes: "",
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await register(formData);
      navigate("/patient");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-serif text-stone-900">Patient Registration</h2>
        <p className="text-xs text-stone-500 mt-1">
          Create an AyurSutra patient account to track your Panchakarma therapy journey.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Radhika Sharma"
            className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="patient@example.com"
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Date of Birth</label>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-stone-700 mb-1">Chief Health Concerns / Notes</label>
          <textarea
            rows={2}
            value={formData.medicalNotes}
            onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
            placeholder="e.g. Back pain, insomnia, digestion issues..."
            className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-md shadow-ayur-900/10 transition-all flex items-center justify-center gap-2 mt-4"
        >
          <UserPlus className="w-4 h-4" />
          {isLoading ? "Creating Account..." : "Complete Registration"}
        </button>
      </form>

      <div className="text-center text-xs text-stone-500 pt-2">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-ayur-700 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
};
