import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Navbar } from "../components/common/Navbar";
import { Sidebar } from "../components/common/Sidebar";
import { AyurvedaAssistantModal } from "../components/chat/AyurvedaAssistantModal";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export const DashboardLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingSpinner size="lg" text="Connecting to AyurSutra..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <Navbar onOpenAIModal={() => setIsAIModalOpen(true)} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Assistant Drawer/Modal */}
      <AyurvedaAssistantModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </div>
  );
};
