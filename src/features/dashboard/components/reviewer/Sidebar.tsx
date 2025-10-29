import React from "react";
import { MENU_CONFIG } from "@/utils/roles";
import { getRoleDisplayName } from "@/utils/roles";

interface SidebarProps {
  user?: {
    name?: string;
    role?: string;
    location?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const role = user?.role;
  const menus = MENU_CONFIG.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 border-b flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="NIRI" className="h-10" />
          <div>
            <div className="font-bold text-lg text-primary">NIRI</div>
            <div className="text-xs text-muted-foreground">
              National Infrastructure Readiness Index
            </div>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-semibold">{user?.name || "Reviewer"}</div>
          <div className="text-xs text-muted-foreground">
            {getRoleDisplayName(user?.role) || "MoSPI Reviewer"}
            {user?.location ? `, ${user.location}` : ""}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6">
        <ul className="space-y-3">
          {menus.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer text-gray-700 font-medium"
            >
              {/* Replace with your icon logic if needed */}
              <span className="text-lg">{item.icon}</span>
              <a href={item.path}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign Out */}
      <button className="p-6 text-left text-red-500 border-t font-medium hover:bg-red-50">
        Sign Out
      </button>
    </aside>
  );
}
