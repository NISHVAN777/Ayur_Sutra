import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const defaultRoute =
    user?.role === "ADMIN" ? "/admin" : user?.role === "THERAPIST" ? "/therapist" : "/patient";

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-ayur-100 text-ayur-800 font-serif font-bold text-3xl flex items-center justify-center mb-4">
        404
      </div>
      <h1 className="text-2xl font-bold font-serif text-stone-900">Page Not Found</h1>
      <p className="text-xs text-stone-500 max-w-sm mt-1 mb-6">
        The requested page or therapy record could not be found.
      </p>
      <Link
        to={defaultRoute}
        className="px-5 py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
};
