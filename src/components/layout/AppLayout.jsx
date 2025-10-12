import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar: fixed, full width */}
      <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        {/* Sidebar: fixed, full height, below topbar */}
        <aside className="w-64 h-screen bg-card border-r fixed top-16 left-0 z-40 hidden lg:block">
          <Sidebar />
        </aside>
        {/* Main content: offset by sidebar width */}
        <main className="flex-1 ml-0 lg:ml-64 p-6 lg:p-8">{children}</main>
      </div>
      {/* Mobile sidebar overlay (optional, if you want to support mobile sidebar toggle) */}
      {/*
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      */}
    </div>
  );
}
