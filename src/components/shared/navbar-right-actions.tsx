"use client";

import { useAuth } from "@/lib/auth";
import { Moon, Sun, User } from "lucide-react";

interface NavbarRightActionsProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onLoginClick: () => void;
}

export function NavbarRightActions({
  theme,
  onThemeToggle,
  onLoginClick,
}: NavbarRightActionsProps) {
  const { user, isAuthenticated, signOut } = useAuth();

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={onThemeToggle}
        className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
        aria-label="Toggle Theme"
      >
        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      {isAuthenticated ? (
        <>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#243B53] dark:bg-blue-500 text-white text-sm font-bold">
            <User size={16} />
            <span>{user?.email?.split("@")[0] || "用户"}</span>
          </div>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-full border border-blue-100/50 dark:border-white/5 bg-white/50 dark:bg-slate-800/50 text-[#243B53] dark:text-blue-100 hover:bg-blue-50/50 dark:hover:bg-white/10 transition-all font-bold text-sm cursor-pointer"
          >
            退出
          </button>
        </>
      ) : (
        <button
          onClick={onLoginClick}
          className="flex items-center space-x-2 bg-[#243B53] dark:bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-blue-900/10 cursor-pointer"
        >
          <User size={16} />
          <span>登录</span>
        </button>
      )}
    </div>
  );
}
