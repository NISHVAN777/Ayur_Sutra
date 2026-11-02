import React from "react";
import { Outlet } from "react-router-dom";
import { Logo } from "../components/common/Logo";

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[radial-gradient(#cbd9cb_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6 flex justify-center">
        <Logo size="lg" className="flex-col text-center" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-stone-200/80">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
