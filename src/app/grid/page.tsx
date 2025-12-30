"use client";

/**
 * 网格策略页面
 * 完全按照 demo.jsx 的 PageGrid 功能和UI实现
 */

import {
  ArrowRightLeft,
  Calculator,
  ChevronRight,
  Info,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TerminalLayout } from "@/components/etf-terminal/layout";
import { InputGroup, StatCard } from "@/components/etf-terminal/shared-components";
import { formatNum } from "@/lib/etf-terminal-utils";
import { supabase } from "@/lib/supabase-client";

const appId = "etf-manager-default";

interface GridStrategyParams {
  id?: number;
  name: string;
  upper: number;
  lower: number;
  count: number;
  amount: number;
  type: "arithmetic" | "geometric";
  feeRate: number;
  minFee: number;
  sellTax: number;
  showAdv?: boolean;
}

interface FavoritesState {
  gridStrategies: GridStrategyParams[];
}

async function loadUserSettings(userId: string): Promise<FavoritesState> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("grid_strategies")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .maybeSingle();

  if (error || !data) {
    return { gridStrategies: [] };
  }

  return {
    gridStrategies: data.grid_strategies || [],
  };
}

async function saveToFirestore(
  userId: string,
  newData: FavoritesState
): Promise<void> {
  try {
    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        app_id: appId,
        grid_strategies: newData.gridStrategies,
      },
      {
        onConflict: "user_id,app_id",
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Save error:", err);
  }
}

export default function GridPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoritesState>({
    gridStrategies: [],
  });
  const [params, setParams] = useState<GridStrategyParams>({
    name: "我的网格策略",
    upper: 1.1,
    lower: 0.9,
    count: 10,
    amount: 10000,
    type: "arithmetic",
    feeRate: 0.00015,
    minFee: 0.1,
    sellTax: 0.0005,
  });

  // 初始化用户ID（模拟匿名登录）
  useEffect(() => {
    const tempUserId = localStorage.getItem("etf_terminal_temp_user_id");
    if (tempUserId) {
      setUserId(tempUserId);
    } else {
      const newTempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("etf_terminal_temp_user_id", newTempId);
      setUserId(newTempId);
    }
  }, []);

  // 加载用户数据
  useEffect(() => {
    if (!userId) return;

    loadUserSettings(userId).then((data) => {
      setFavorites(data);
    });
  }, [userId]);

  // 核心网格计算逻辑
  const gridCalc = useMemo(() => {
    const { upper, lower, count, amount, type, feeRate, minFee, sellTax } =
      params;
    const levels: {
      level: number;
      buyPrice: string;
      sellPrice: string;
      qty: number;
      profit: string;
      profitRate: string;
    }[] = [];
    const totalAmount = Number.parseFloat(String(amount));
    const amountPerGrid = totalAmount / count;

    for (let i = 0; i <= count; i += 1) {
      let buyPrice: number;
      if (type === "arithmetic") {
        buyPrice = upper - ((upper - lower) / count) * i;
      } else {
        buyPrice = upper * Math.pow(lower / upper, i / count);
      }

      // 计算卖出价 (假设目标是下一档，或固定间隔)
      // 在网格策略中，本档的卖出价通常是上一档的价格
      const sellPrice =
        i === 0
          ? buyPrice * 1.05
          : type === "arithmetic"
          ? buyPrice + (upper - lower) / count
          : buyPrice / Math.pow(lower / upper, 1 / count);

      const qty = Math.floor(amountPerGrid / buyPrice / 100) * 100; // A股通常100股一手
      const cost = qty * buyPrice;
      const buyFee = Math.max(minFee, cost * feeRate);

      const revenue = qty * sellPrice;
      const sellFee = Math.max(minFee, revenue * feeRate);
      const tax = revenue * sellTax;

      const profit = revenue - cost - buyFee - sellFee - tax;
      const profitRate = (profit / cost) * 100;

      levels.push({
        level: i,
        buyPrice: buyPrice.toFixed(3),
        sellPrice: sellPrice.toFixed(3),
        qty,
        profit: profit.toFixed(2),
        profitRate: profitRate.toFixed(2),
      });
    }
    return { levels, amountPerGrid };
  }, [params]);

  const saveCurrent = () => {
    if (!userId) return;
    const list = favorites.gridStrategies || [];
    const newList = [...list, { ...params, id: Date.now() }];
    const newFavorites = { ...favorites, gridStrategies: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
  };

  const removeSaved = (id: number | undefined) => {
    if (!userId || !id) return;
    const newList = favorites.gridStrategies.filter((s) => s.id !== id);
    const newFavorites = { ...favorites, gridStrategies: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <TerminalLayout theme={theme} onToggleTheme={toggleTheme}>
      <div className="grid lg:grid-cols-12 gap-6">
        {/* 左侧配置栏 */}
        <div className="lg:col-span-4 space-y-6">
          <div
            className={`p-6 rounded-3xl border ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            } shadow-xl`}
          >
            <div className="flex items-center gap-2 mb-6 text-indigo-500">
              <Calculator size={24} strokeWidth={2.5} />
              <h2 className="text-xl font-black">策略配置</h2>
            </div>

            <div className="space-y-4">
              <InputGroup
                label="策略名称"
                value={params.name}
                onChange={(v) => setParams({ ...params, name: v })}
              />

              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="价格上限"
                  type="number"
                  value={params.upper}
                  onChange={(v) =>
                    setParams({ ...params, upper: Number.parseFloat(v) })
                  }
                />
                <InputGroup
                  label="价格下限"
                  type="number"
                  value={params.lower}
                  onChange={(v) =>
                    setParams({ ...params, lower: Number.parseFloat(v) })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="网格格数"
                  type="number"
                  value={params.count}
                  onChange={(v) =>
                    setParams({ ...params, count: Number.parseInt(v, 10) })
                  }
                />
                <InputGroup
                  label="投资总额"
                  type="number"
                  value={params.amount}
                  onChange={(v) =>
                    setParams({ ...params, amount: Number.parseFloat(v) })
                  }
                />
              </div>

              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                <button
                  onClick={() => setParams({ ...params, type: "arithmetic" })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    params.type === "arithmetic"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-500"
                      : "opacity-50"
                  }`}
                >
                  等差网格
                </button>
                <button
                  onClick={() => setParams({ ...params, type: "geometric" })}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    params.type === "geometric"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-indigo-500"
                      : "opacity-50"
                  }`}
                >
                  等比网格
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() =>
                    setParams({ ...params, showAdv: !params.showAdv })
                  }
                  className="text-[10px] font-bold opacity-40 hover:opacity-100 flex items-center gap-1 uppercase tracking-tighter"
                >
                  {params.showAdv ? "隐藏高级设置" : "显示费率设置"}
                </button>
                {params.showAdv && (
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <InputGroup
                      label="手续费 (万分之)"
                      type="number"
                      value={params.feeRate * 10000}
                      onChange={(v) =>
                        setParams({ ...params, feeRate: Number(v) / 10000 })
                      }
                    />
                    <InputGroup
                      label="最低规费"
                      type="number"
                      value={params.minFee}
                      onChange={(v) =>
                        setParams({ ...params, minFee: Number.parseFloat(v) })
                      }
                    />
                  </div>
                )}
              </div>

              <button
                onClick={saveCurrent}
                className="w-full mt-4 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Save size={18} /> 保存该策略
              </button>
            </div>
          </div>

          {/* 已存策略 */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-40 pl-2">
              已保存的策略
            </h3>
            {favorites.gridStrategies?.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                } flex justify-between items-center group`}
              >
                <div>
                  <p className="font-bold text-sm">{s.name}</p>
                  <p className="text-[10px] opacity-50">
                    {s.lower}-{s.upper} | {s.count}格
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setParams(s)}
                    className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => removeSaved(s.id)}
                    className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧数据展示 */}
        <div className="lg:col-span-8 space-y-6">
          {/* 数据面板摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="每格资金"
              value={`￥${formatNum(gridCalc.amountPerGrid)}`}
              color="indigo"
            />
            <StatCard
              title="平均单格利润"
              value={`~${gridCalc.levels[1]?.profitRate}%`}
              color="green"
            />
            <StatCard
              title="网格密度"
              value={`${(
                ((params.upper - params.lower) / params.count) *
                100
              ).toFixed(2)}%`}
              color="blue"
            />
            <StatCard title="运行状态" value="待机中" color="slate" />
          </div>

          {/* 详细列表 */}
          <div
            className={`rounded-3xl border ${
              theme === "dark"
                ? "bg-slate-800 border-slate-700"
                : "bg-white border-slate-200"
            } shadow-xl overflow-hidden`}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2">
                <ArrowRightLeft className="text-indigo-500" size={20} /> 网格运行详情
              </h3>
              <span className="text-[10px] px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full font-bold opacity-60">
                自动模拟结果
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead
                  className={theme === "dark" ? "bg-slate-900/50" : "bg-slate-50"}
                >
                  <tr>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40">
                      档位
                    </th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40 text-blue-500">
                      买入价格
                    </th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40 text-red-500">
                      卖出价格
                    </th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40">
                      单笔数量
                    </th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40">
                      单笔利润
                    </th>
                    <th className="p-4 font-black uppercase text-[10px] tracking-widest opacity-40">
                      利润率
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {gridCalc.levels.map((row) => (
                    <tr
                      key={row.level}
                      className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold opacity-40">
                        {row.level}
                      </td>
                      <td className="p-4 font-mono font-black text-blue-500">
                        {row.buyPrice}
                      </td>
                      <td className="p-4 font-mono font-black text-red-500">
                        {row.sellPrice}
                      </td>
                      <td className="p-4 font-mono">{row.qty} 股</td>
                      <td className="p-4 font-mono text-green-500">
                        ￥{row.profit}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-md font-bold text-xs">
                          +{row.profitRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 提示信息 */}
          <div
            className={`p-4 rounded-2xl flex gap-3 ${
              theme === "dark"
                ? "bg-indigo-900/20 text-indigo-300"
                : "bg-indigo-50 text-indigo-600"
            } text-xs leading-relaxed`}
          >
            <Info size={18} className="shrink-0" />
            <p>
              <b>提示：</b>
              本计算器结果仅供参考。实际交易中存在滑点、费率变动及分红送配等因素影响。建议单笔格子的利润率覆盖{" "}
              <b>2倍以上</b> 的交易佣金，通常维持在 <b>0.5% - 2%</b> 之间最为理想。
            </p>
          </div>
        </div>
      </div>
    </TerminalLayout>
  );
}

