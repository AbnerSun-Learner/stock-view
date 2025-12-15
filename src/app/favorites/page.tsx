/**
 * 收藏页面路由
 */

import { FavoritesPage } from "@/components/stock/FavoritesPage";
import { Navigation } from "@/components/stock/Navigation";

export default function FavoritesPageRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-5 text-slate-900">
      <Navigation />
      <FavoritesPage />
    </div>
  );
}
