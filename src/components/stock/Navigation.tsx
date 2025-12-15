/**
 * 导航组件（顶部菜单栏）
 */

"use client";

import { getUserIdFromStorage } from "@/lib/user-id";
import type { ContactType } from "@/types/favorites";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserIdentityModal } from "./UserIdentityModal";

export function Navigation() {
  const pathname = usePathname();
  const [showIdentityModal, setShowIdentityModal] = useState(false);

  // 使用函数初始化状态，避免在 useEffect 中同步 setState
  const [hasContact, setHasContact] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("stock_view_user_contact");
  });

  const [storedContact, setStoredContact] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("stock_view_user_contact") || "";
  });

  const [storedContactType, setStoredContactType] = useState<ContactType>(
    () => {
      if (typeof window === "undefined") return "phone";
      return (
        (localStorage.getItem("stock_view_user_contact_type") as ContactType) ||
        "phone"
      );
    }
  );

  const handleIdentitySubmit = async (
    contact: string,
    contactType: ContactType
  ) => {
    try {
      // 保存联系方式到 localStorage
      localStorage.setItem("stock_view_user_contact", contact);
      localStorage.setItem("stock_view_user_contact_type", contactType);

      setHasContact(true);
      setStoredContact(contact);
      setStoredContactType(contactType);

      // 同步联系方式到服务端
      const userId = getUserIdFromStorage();
      if (userId) {
        try {
          // 获取当前收藏列表
          const favoritesResponse = await fetch(
            `/api/favorites?userId=${userId}`
          );
          const favoritesData = await favoritesResponse.json();
          const favorites = favoritesData.ok
            ? favoritesData.data?.favorites || []
            : [];

          // 同步到服务端
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              contact,
              contactType,
              favorites: favorites.map(
                (f: { symbol: string; name: string | null }) => ({
                  symbol: f.symbol,
                  name: f.name,
                })
              ),
            }),
          });
        } catch (error) {
          console.error("Failed to sync contact to server:", error);
        }
      }
    } catch (error) {
      console.error("Failed to save contact:", error);
      throw error;
    }
  };

  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between border-slate-200/80 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:text-slate-700"
        >
          <span className="text-sky-500">ETF</span>
          <span className="text-slate-800">View</span>
        </Link>
        <nav className="flex flex-1 justify-center">
          <ul className="flex items-center gap-8 text-sm font-medium text-slate-700">
            <li>
              <Link
                href="/"
                className={`transition hover:text-slate-900 ${
                  pathname === "/" ? "text-slate-900 font-semibold" : ""
                }`}
              >
                70/80
              </Link>
            </li>
            <li>
              <Link
                href="/favorites"
                className={`transition hover:text-slate-900 ${
                  pathname === "/favorites"
                    ? "text-slate-900 font-semibold"
                    : ""
                }`}
              >
                收藏
              </Link>
            </li>
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowIdentityModal(true)}
            className="text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
          >
            {hasContact ? (
              <span className="flex items-center gap-2">
                <span>身份识别</span>
                <span className="text-xs text-slate-400">
                  {storedContactType === "phone"
                    ? storedContact.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")
                    : storedContact.replace(/(.{2}).*(@.*)/, "$1***$2")}
                </span>
              </span>
            ) : (
              "身份识别"
            )}
          </button>
        </div>
      </header>

      <UserIdentityModal
        open={showIdentityModal}
        onClose={() => setShowIdentityModal(false)}
        onSubmit={handleIdentitySubmit}
        initialContact={storedContact}
        initialContactType={storedContactType}
      />
    </>
  );
}
