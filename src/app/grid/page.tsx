"use client";

/**
 * 网格交易计算器 - 方案C优化版：卡片网格布局
 * 设计风格：日本极简主义
 * 布局：所有元素以卡片形式展示，排列成网格
 * 功能完全按照 Home.tsx 实现
 */

import { AntdProvider } from "@/components/antd-provider";
import { AuthModal } from "@/components/etf-terminal/auth-modal";
import { BaseInfoConfig } from "@/components/grid/base-info-config";
import { FundCoefficientConfig } from "@/components/grid/fund-coefficient-config";
import { GridStepConfig } from "@/components/grid/grid-step-config";
import { StrategyComparisonChart } from "@/components/grid/strategy-comparison-chart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { message } from "antd";
import {
  AlertCircle,
  BookOpen,
  ChevronDown,
  Compass,
  HelpCircle,
  Moon,
  Save,
  Sparkles,
  Sun,
  User,
  Wind,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
interface GridRow {
  position: number;
  buyTriggerPrice: number;
  buyPrice: number;
  buyAmount: number;
  buyShares: number;
  sellTriggerPrice: number;
  sellPrice: number;
  sellShares: number;
  sellAmount: number;
  priceDropRate: number;
}

interface StressTest {
  totalBuyAmount: number;
  totalBuyShares: number;
  totalSellAmount: number;
  totalSellShares: number;
  remainingShares: number;
  profit: number;
  profitRate: number;
}

interface SavedScheme {
  id: string;
  name: string;
  timestamp: number;
  params: {
    minTradeUnit: number;
    basePrice: number;
    amountPerGrid: number;
    minPrice: number;
    smallGridStep: number;
    mediumGridStep: number;
    largeGridStep: number;
    amountMultiplier: number;
    profitReserveMultiplier: number;
  };
  gridData: GridRow[];
  stressTest: StressTest;
}

// 加载用户保存的方案
async function loadUserSchemes(userId: string): Promise<SavedScheme[]> {
  try {
    const { data, error } = await supabase
      .from("grid_strategies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map(
      (item: {
        id: string;
        name: string;
        created_at: string;
        min_trade_unit: number;
        base_price: number;
        amount_per_grid: number;
        min_price: number;
        small_grid_step: number;
        medium_grid_step: number;
        large_grid_step: number;
        amount_multiplier: number;
        profit_reserve_multiplier: number;
        grid_data: Array<{
          position: number;
          buyTriggerPrice: number;
          buyPrice: number;
          buyAmount: number;
          buyShares: number;
          sellTriggerPrice: number;
          sellPrice: number;
          sellShares: number;
          sellAmount: number;
          priceDropRate?: number;
          expectedProfit?: number; // 兼容旧数据
          type?: string; // 兼容旧数据
        }>;
        stress_test: StressTest;
      }) => {
        // 转换旧格式数据，计算跌幅
        const gridData: GridRow[] = (item.grid_data || []).map((row, index) => {
          // 如果有 priceDropRate 就用，否则计算
          let priceDropRate = row.priceDropRate ?? 0;
          if (priceDropRate === 0 && index > 0 && item.grid_data[index - 1]) {
            const prevBuyPrice = item.grid_data[index - 1].buyPrice;
            priceDropRate = parseFloat(
              (((row.buyPrice - prevBuyPrice) / prevBuyPrice) * 100).toFixed(2)
            );
          }

          return {
            position: row.position,
            buyTriggerPrice: row.buyTriggerPrice,
            buyPrice: row.buyPrice,
            buyAmount: row.buyAmount,
            buyShares: row.buyShares,
            sellTriggerPrice: row.sellTriggerPrice,
            sellPrice: row.sellPrice,
            sellShares: row.sellShares,
            sellAmount: row.sellAmount,
            priceDropRate,
          };
        });

        return {
          id: item.id,
          name: item.name,
          timestamp: new Date(item.created_at).getTime(),
          params: {
            minTradeUnit: item.min_trade_unit,
            basePrice: item.base_price,
            amountPerGrid: item.amount_per_grid,
            minPrice: item.min_price,
            smallGridStep: item.small_grid_step,
            mediumGridStep: item.medium_grid_step,
            largeGridStep: item.large_grid_step,
            amountMultiplier: item.amount_multiplier,
            profitReserveMultiplier: item.profit_reserve_multiplier,
          },
          gridData,
          stressTest: item.stress_test || null,
        };
      }
    );
  } catch (error) {
    console.error("加载方案失败:", error);
    return [];
  }
}

// 保存方案到 Supabase
async function saveSchemeToSupabase(
  userId: string,
  scheme: SavedScheme
): Promise<void> {
  const { error } = await supabase.from("grid_strategies").insert({
    user_id: userId,
    name: scheme.name,
    min_trade_unit: scheme.params.minTradeUnit,
    base_price: scheme.params.basePrice,
    amount_per_grid: scheme.params.amountPerGrid,
    min_price: scheme.params.minPrice,
    small_grid_step: scheme.params.smallGridStep,
    medium_grid_step: scheme.params.mediumGridStep,
    large_grid_step: scheme.params.largeGridStep,
    amount_multiplier: scheme.params.amountMultiplier,
    profit_reserve_multiplier: scheme.params.profitReserveMultiplier,
    grid_data: scheme.gridData,
    stress_test: scheme.stressTest,
  });

  if (error) throw error;
}

export default function GridPage() {
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [params, setParams] = useState({
    minTradeUnit: 100,
    priceUnit: 0.001,
    basePrice: 1.0,
    amountPerGrid: 10000,
    minPrice: 0.5,
    smallGridStep: 5.0,
    mediumGridStep: 15.0,
    largeGridStep: 30.0,
    amountMultiplier: 1.0,
    profitReserveMultiplier: 1.0,
  });

  // 动态网格步长状态
  const [dynamicGridEnabled, setDynamicGridEnabled] = useState(false);
  const [dynamicGridMode, setDynamicGridMode] = useState<
    "stable" | "aggressive"
  >("stable");

  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [stressTest, setStressTest] = useState<StressTest | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [schemeName, setSchemeName] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 初始化：加载本地存储的方案
  useEffect(() => {
    const saved = localStorage.getItem("gridTradingSchemes");
    if (saved) {
      try {
        setSavedSchemes(JSON.parse(saved));
      } catch (error) {
        console.error("加载本地方案失败:", error);
      }
    }
  }, []);

  // 加载用户保存的方案
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadUserSchemes(user.id).then((data) => {
        if (data.length > 0) {
          setSavedSchemes(data);
        }
      });
    }
  }, [isAuthenticated, user?.id]);

  // 参数验证（不设置状态，只返回验证结果）
  const validateParams = useCallback((): {
    isValid: boolean;
    errors: string[];
  } => {
    const newErrors: string[] = [];

    if (params.minPrice >= params.basePrice) {
      newErrors.push("最低价必须小于基准价");
    }
    if (
      params.minPrice <= 0 ||
      params.basePrice <= 0 ||
      params.amountPerGrid <= 0
    ) {
      newErrors.push("所有数值必须大于0");
    }
    if (
      params.smallGridStep <= 0 ||
      params.mediumGridStep <= 0 ||
      params.largeGridStep <= 0
    ) {
      newErrors.push("步长必须大于0");
    }
    if (
      params.smallGridStep > 100 ||
      params.mediumGridStep > 100 ||
      params.largeGridStep > 100
    ) {
      newErrors.push("步长不能超过100%");
    }
    if (params.amountMultiplier < 0 || params.profitReserveMultiplier < 0) {
      newErrors.push("系数不能小于0");
    }

    return { isValid: newErrors.length === 0, errors: newErrors };
  }, [params]);

  // 计算错误状态
  const validationErrors = useMemo(() => {
    const validation = validateParams();
    return validation.errors;
  }, [validateParams]);

  useEffect(() => {
    setErrors(validationErrors);
  }, [validationErrors]);

  // 计算价格显示的小数位数
  const priceDecimals = useMemo(() => {
    const unit = params.priceUnit;
    if (unit >= 1) return 0;
    if (unit >= 0.1) return 1;
    if (unit >= 0.01) return 2;
    if (unit >= 0.001) return 3;
    return 4;
  }, [params.priceUnit]);

  // 计算网格（改为普通函数，不再自动计算）
  const calculateGrid = useCallback(() => {
    const validation = validateParams();
    if (!validation.isValid) {
      return { gridData: [], stressTest: null };
    }

    const {
      minTradeUnit,
      basePrice,
      amountPerGrid,
      minPrice,
      smallGridStep,
      amountMultiplier,
      profitReserveMultiplier,
    } = params;

    const grids: GridRow[] = [];

    // 辅助函数：根据档位计算金额加码
    const calculateBuyAmount = (档位: number) => {
      // 金额加码系数：逐级增加买入金额
      // 公式：每份金额 + 每份金额 × 系数 × (1 - 当前档位)
      // 等价于：每份金额 × (1 + 系数 × (1 - 当前档位))
      // 例如：每份金额10000，系数1，档位0.9 → 10000 + 10000×1×(1-0.9) = 11000
      return amountPerGrid * (1 + amountMultiplier * (1 - 档位));
    };

    // 辅助函数：计算卖出股数（保留利润逻辑）
    const calculateSellShares = (buyShares: number, stepPercent: number) => {
      // 保留利润系数：控制卖出时是否保留利润
      // 0 = 不保留利润（全部卖出）
      // 0.5 = 保留一半利润
      // 1 = 保留全部利润（只卖回本）
      // 2 = 保留两倍利润
      // 公式：出股数 = 入股数 × (1 - 步长% × 保留利润系数)
      const targetSellShares =
        buyShares * (1 - stepPercent * profitReserveMultiplier);

      // 取整到最小交易单位
      return Math.floor(targetSellShares / minTradeUnit) * minTradeUnit;
    };

    // 动态步长计算逻辑
    let currentBuyPrice = basePrice;
    let previousBuyPrice = basePrice; // 上一档的买入价，用于计算跌幅和卖出价
    let currentStep = smallGridStep / 100; // 基础步长（转为小数）
    const scale = dynamicGridEnabled
      ? dynamicGridMode === "stable"
        ? 0.3
        : 0.6
      : 0; // 步长增长系数
    const maxGrids = 10; // 最大网格数

    // 生成网格（统一处理）
    for (let i = 0; i < maxGrids; i++) {
      // 第1档：买入价 = 基准价
      // 第2档及以后：买入价 = 上一档买入价 × (1 - 当前步长)
      let buyPrice: number;
      if (i === 0) {
        buyPrice = basePrice;
      } else {
        // 先计算精确的买入价，保留3位小数
        buyPrice = parseFloat((currentBuyPrice * (1 - currentStep)).toFixed(3));
      }

      if (buyPrice <= minPrice) break;

      // 档位按步长严格递减，保留2位小数
      // 档位 = 1 - (步长累计)
      const position = parseFloat((buyPrice / basePrice).toFixed(2));

      // 买入金额：根据档位计算（价格越低买的越多）
      const buyAmount = calculateBuyAmount(position);

      // 买入股数：必须是最小交易单位的整数倍
      const buyShares =
        Math.floor(buyAmount / buyPrice / minTradeUnit) * minTradeUnit;

      // 实际买入金额
      const actualBuyAmount = buyShares * buyPrice;

      // 卖出价计算
      // 第一档：卖出价 = 基准价 × (1 + 当前步长)，保留3位小数
      // 后续档：卖出价 = 上一档的买入价
      const sellPrice =
        i === 0
          ? parseFloat((basePrice * (1 + currentStep)).toFixed(3))
          : previousBuyPrice;

      // 买入/卖出触发价（滑点 = 5 × 最小报价单位），保留3位小数
      const slippage = params.priceUnit * 5;
      const buyTriggerPrice = parseFloat((buyPrice + slippage).toFixed(3));
      const sellTriggerPrice = parseFloat((sellPrice - slippage).toFixed(3));

      // 卖出股数：根据保留利润系数计算
      const sellShares = calculateSellShares(buyShares, currentStep);

      const sellAmount = sellShares * sellPrice;

      // 跌幅 = (本档位的买入价 - 上一档位的买入价) / 上一档位的买入价
      // 第一档跌幅为 0
      const priceDropRate =
        i === 0
          ? 0
          : parseFloat(
              (
                ((buyPrice - previousBuyPrice) / previousBuyPrice) *
                100
              ).toFixed(2)
            );

      grids.push({
        position,
        buyTriggerPrice,
        buyPrice,
        buyAmount: Math.round(actualBuyAmount),
        buyShares,
        sellTriggerPrice,
        sellPrice,
        sellShares,
        sellAmount: Math.round(sellAmount),
        priceDropRate,
      });

      // 更新：当前买入价成为下一档的"上一档买入价"
      previousBuyPrice = buyPrice;
      currentBuyPrice = buyPrice;

      // 动态步长更新逻辑
      // 第1档到第2档：使用基础步长
      // 第2档之后（i >= 1）：步长按指数倍率加速扩张
      if (i >= 1 && dynamicGridEnabled) {
        // Step_n = Step_{n-1} × (1 + Scale)
        currentStep = currentStep * (1 + scale);
      } else if (!dynamicGridEnabled) {
        // 固定步长模式：始终使用基础步长
        currentStep = smallGridStep / 100;
      }
    }

    // 计算压力测试
    const totalBuyAmount = grids.reduce((sum, row) => sum + row.buyAmount, 0);
    const totalBuyShares = grids.reduce((sum, row) => sum + row.buyShares, 0);
    const totalSellAmount = grids.reduce((sum, row) => sum + row.sellAmount, 0);
    const totalSellShares = grids.reduce((sum, row) => sum + row.sellShares, 0);
    const remainingShares = totalBuyShares - totalSellShares;

    // 预期利润 = 卖出金额 - 买入金额 + 剩余股数 * 基准价
    const profit =
      totalSellAmount - totalBuyAmount + remainingShares * basePrice;

    // 收益率 = 利润 / 买入金额 * 100
    const profitRate = totalBuyAmount > 0 ? (profit / totalBuyAmount) * 100 : 0;

    const stressTestResult: StressTest = {
      totalBuyAmount: Math.round(totalBuyAmount),
      totalBuyShares,
      totalSellAmount: Math.round(totalSellAmount),
      totalSellShares,
      remainingShares,
      profit: Math.round(profit),
      profitRate: parseFloat(profitRate.toFixed(2)),
    };

    return { gridData: grids, stressTest: stressTestResult };
  }, [params, validateParams, dynamicGridEnabled, dynamicGridMode]);

  // 更新参数
  const updateParam = (key: string, value: number | null) => {
    if (value === null) return; // 当值为 null 时，保持当前值不变
    setParams({ ...params, [key]: value });
  };

  // 保存方案
  const saveScheme = async () => {
    if (!schemeName.trim()) {
      message.error("请输入方案名称");
      return;
    }
    if (gridData.length === 0 || !stressTest) {
      message.error("请先生成网格");
      return;
    }

    const newScheme: SavedScheme = {
      id: Date.now().toString(),
      name: schemeName,
      timestamp: Date.now(),
      params,
      gridData,
      stressTest,
    };

    // 如果已登录，保存到 Supabase
    if (isAuthenticated && user?.id) {
      try {
        await saveSchemeToSupabase(user.id, newScheme);
        const updated = await loadUserSchemes(user.id);
        setSavedSchemes(updated);
        message.success("方案已保存");
      } catch (error) {
        console.error("保存失败:", error);
        message.error("保存失败，请重试");
      }
    } else {
      // 未登录，保存到本地存储
      const updated = [...savedSchemes, newScheme];
      setSavedSchemes(updated);
      localStorage.setItem("gridTradingSchemes", JSON.stringify(updated));
      message.success("方案已保存到本地");
    }

    setSchemeName("");
    setShowSaveDialog(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <AntdProvider>
      <div
        className={`min-h-screen transition-colors duration-500 ${
          theme === "dark"
            ? "bg-[#0F172A] text-[#E2E8F0]"
            : "bg-[#F0F4F8] text-[#243B53]"
        }`}
      >
        {/* 背景装饰：雾霾蓝动态背景 */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[140px]"></div>
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-[100px]"></div>
        </div>

        {/* 自定义导航栏 */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-md border-b border-blue-100/20 dark:border-white/5">
          <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
            {/* 左侧：Logo - 衬线体定制 */}
            <div className="flex items-center space-x-2 group">
              <Link href="/" className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 bg-[#243B53] dark:bg-blue-400 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
                  <div className="w-2 h-2 bg-white dark:bg-[#0F172A] rounded-full animate-pulse"></div>
                </div>
                <span className="text-2xl font-serif font-bold tracking-tight text-[#243B53] dark:text-blue-100 transition-colors">
                  <span className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer">
                    Stillwell
                  </span>
                  <span className="opacity-70">.grid</span>
                </span>
              </Link>
            </div>

            {/* 中间：菜单栏 - 只保留投资指南 */}
            <div className="hidden md:flex items-center space-x-10">
              {/* 投资指南 Dropdown */}
              <div
                className="relative group py-2"
                onMouseEnter={() => setHoveredMenu("guide")}
                onMouseLeave={() => setHoveredMenu(null)}
              >
                <button className="flex items-center space-x-1 text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity">
                  <span>投资指南</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-300 ${
                      hoveredMenu === "guide" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* 指南下拉面板 */}
                <div
                  className={`absolute top-full left-1/2 -translate-x-1/2 w-80 pt-4 transition-all duration-300 ${
                    hoveredMenu === "guide"
                      ? "opacity-100 visible translate-y-0"
                      : "opacity-0 invisible -translate-y-2"
                  }`}
                >
                  <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl shadow-blue-900/10 border border-blue-50 dark:border-white/5 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                        <Compass
                          size={18}
                          className="text-slate-400 group-hover/item:text-blue-600"
                        />
                        <span className="text-sm font-medium">新手入林指南</span>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                        <Wind
                          size={18}
                          className="text-slate-400 group-hover/item:text-blue-600"
                        />
                        <span className="text-sm font-medium">波动冥想手册</span>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                        <BookOpen
                          size={18}
                          className="text-slate-400 group-hover/item:text-blue-600"
                        />
                        <span className="text-sm font-medium">指数之书</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：功能按钮 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400"
                aria-label="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              {isAuthenticated ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#243B53] dark:bg-blue-500 text-white text-sm font-bold">
                  <User size={16} />
                  <span>{user?.email?.split("@")[0] || "用户"}</span>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-2 bg-[#243B53] dark:bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-blue-900/10"
                >
                  <User size={16} />
                  <span>登录</span>
                </button>
              )}
            </div>
          </div>
        </nav>

        <div className="pt-20">
          <div className="py-8 space-y-8 max-w-[1400px] mx-auto px-4">
            {/* 页面标题 */}
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-3 tracking-tight">
                网格交易策略
              </h1>
              <p className="text-lg opacity-70 leading-relaxed font-light max-w-2xl mx-auto">
                在市场波动中寻找属于自己的节奏，通过科学的网格策略实现稳健收益
              </p>
            </div>

          {/* 错误提示 */}
          {errors.length > 0 && (
              <div className="p-5 rounded-2xl border border-red-200/50 dark:border-red-800/50 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-800 dark:text-red-200">
                  参数错误
                </span>
              </div>
                <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 左右布局 */}
          <div className="grid grid-cols-12 gap-6">
            {/* 左侧：参数配置 */}
            <div className="col-span-12 lg:col-span-4">
              <div className="rounded-2xl border border-blue-50/50 dark:border-white/5 bg-white/70 dark:bg-[#1E293B]/70 backdrop-blur-md shadow-2xl shadow-blue-900/10 overflow-hidden">
                {/* 基本信息 */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10">
                  <BaseInfoConfig
                    minTradeUnit={params.minTradeUnit}
                    onMinTradeUnitChange={(value) =>
                      updateParam("minTradeUnit", value)
                    }
                    priceUnit={params.priceUnit}
                    onPriceUnitChange={(value) =>
                      updateParam("priceUnit", value)
                    }
                    basePrice={params.basePrice}
                    onBasePriceChange={(value) =>
                      updateParam("basePrice", value)
                    }
                    minPrice={params.minPrice}
                    onMinPriceChange={(value) => updateParam("minPrice", value)}
                    theme={theme}
                  />
                </div>

                {/* 分隔线 */}
                <div className="h-px bg-gradient-to-r from-transparent via-blue-100/50 dark:via-white/5 to-transparent" />

                {/* 资金系数 */}
                <div className="bg-purple-50/50 dark:bg-purple-900/10">
                  <FundCoefficientConfig
                    amountPerGrid={params.amountPerGrid}
                    onAmountPerGridChange={(value) =>
                      updateParam("amountPerGrid", value)
                    }
                    amountMultiplier={params.amountMultiplier}
                    onAmountMultiplierChange={(value) =>
                      updateParam("amountMultiplier", value)
                    }
                    profitReserveMultiplier={params.profitReserveMultiplier}
                    onProfitReserveMultiplierChange={(value) =>
                      updateParam("profitReserveMultiplier", value)
                    }
                    theme={theme}
                  />
                </div>

                {/* 分隔线 */}
                <div className="h-px bg-gradient-to-r from-transparent via-blue-100/50 dark:via-white/5 to-transparent" />

                {/* 网格步长 */}
                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6">
                  <GridStepConfig
                    baseStep={params.smallGridStep}
                    onBaseStepChange={(value) =>
                      updateParam("smallGridStep", value)
                    }
                    dynamicEnabled={dynamicGridEnabled}
                    onDynamicEnabledChange={setDynamicGridEnabled}
                    mode={dynamicGridMode}
                    onModeChange={setDynamicGridMode}
                    theme={theme}
                  />
                </div>

                {/* 生成策略按钮 */}
                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/20">
                  <button
                    onClick={() => {
                      // 验证参数
                      const validation = validateParams();
                      if (!validation.isValid) {
                        message.error("请检查参数设置");
                        return;
                      }

                      // 执行计算并更新状态
                      const result = calculateGrid();
                      setGridData(result.gridData);
                      setStressTest(result.stressTest);

                      // 显示成功提示
                      message.success("策略已生成");
                    }}
                    disabled={errors.length > 0}
                    className="w-full px-6 py-4 rounded-full bg-[#243B53] dark:bg-blue-500 text-white font-bold text-lg shadow-xl shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Sparkles className="w-5 h-5" />
                    生成策略
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧：计算结果 */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {gridData.length === 0 || !stressTest ? (
                <div className="h-full min-h-[600px] flex items-center justify-center p-12 rounded-2xl border border-dashed border-blue-100/50 dark:border-white/10 bg-white/50 dark:bg-[#1E293B]/50 backdrop-blur-sm">
                  <div className="text-center space-y-4">
                    <div className="text-slate-400 dark:text-slate-500">
                      <svg
                        className="w-20 h-20 mx-auto mb-4 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-lg font-light">
                      设置参数后，计算结果将在这里展示
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">
                      包括网格策略对比图和详细数据表格
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* 策略对比折线图 */}
                  <div className="rounded-2xl border border-blue-50/50 dark:border-white/5 bg-white/70 dark:bg-[#1E293B]/70 backdrop-blur-md shadow-2xl shadow-blue-900/10 overflow-hidden">
                    <div className="p-6">
                      <StrategyComparisonChart
                        gridData={gridData}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                        theme={theme}
                      />
                    </div>
                  </div>

                  {/* 计算结果表格 */}
                  <div className="p-6 rounded-2xl border border-blue-50/50 dark:border-white/5 bg-white/70 dark:bg-[#1E293B]/70 backdrop-blur-md shadow-2xl shadow-blue-900/10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-serif font-medium text-[#243B53] dark:text-blue-100 mb-2">
                          网格计算结果
                        </h3>
                        <p className="text-sm opacity-70 font-light">
                          共 {gridData.length} 个网格档位
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            setShowAuthModal(true);
                          } else {
                            setShowSaveDialog(true);
                          }
                        }}
                        className="px-6 py-2.5 rounded-full bg-[#243B53] dark:bg-blue-500 text-white hover:scale-105 transition-all duration-300 flex items-center gap-2 font-bold shadow-lg shadow-blue-900/10 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        保存方案
                      </button>
                    </div>

                    {/* 统计数据 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                      <div className="p-5 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-white/5 shadow-lg shadow-blue-900/5 hover:shadow-xl transition-all duration-300">
                        <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-widest opacity-70">
                          总买入金额
                        </div>
                        <div className="text-2xl font-bold text-[#243B53] dark:text-blue-100">
                          {stressTest.totalBuyAmount.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-5 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl border border-purple-100/50 dark:border-white/5 shadow-lg shadow-purple-900/5 hover:shadow-xl transition-all duration-300">
                        <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-widest opacity-70">
                          总卖出金额
                        </div>
                        <div className="text-2xl font-bold text-[#243B53] dark:text-purple-100">
                          {stressTest.totalSellAmount.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50 dark:border-white/5 shadow-lg shadow-indigo-900/5 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-widest opacity-70">
                          <span>剩余股数</span>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 cursor-help text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
                              剩余股数 = 总买入股数 - 总卖出股数
                            </div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-[#243B53] dark:text-indigo-100">
                          {stressTest.remainingShares.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100/50 dark:border-white/5 shadow-lg shadow-emerald-900/5 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase tracking-widest opacity-70">
                          <span>预期利润</span>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 cursor-help text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 transition-colors" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-56 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
                              利润 = 卖出金额 - 买入金额 + 剩余股数 × 基准价
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            stressTest.profit > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : stressTest.profit < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-[#243B53] dark:text-slate-400"
                          }`}
                        >
                          {stressTest.profit > 0 ? "+" : ""}
                          {stressTest.profit.toLocaleString()}
                        </div>
                      </div>
                      <div className="p-5 bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100/50 dark:border-white/5 shadow-lg shadow-amber-900/5 hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-widest opacity-70">
                          <span>收益率</span>
                          <div className="group relative">
                            <HelpCircle className="w-3 h-3 cursor-help text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
                              利润 / 买入金额 × 100
                            </div>
                          </div>
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            stressTest.profitRate > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : stressTest.profitRate < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-[#243B53] dark:text-slate-400"
                          }`}
                        >
                          {stressTest.profitRate > 0 ? "+" : ""}
                          {stressTest.profitRate}%
                        </div>
                      </div>
                    </div>

                    {/* 表格 */}
                    <div className="overflow-x-auto rounded-xl border border-blue-50/50 dark:border-white/5">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-blue-100/50 dark:border-white/5 bg-blue-50/30 dark:bg-blue-900/10">
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              档位
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              买入价
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              <div className="flex items-center gap-1">
                                <span>跌幅</span>
                                <div className="group relative">
                                  <HelpCircle className="w-3 h-3 cursor-help text-slate-400" />
                                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal font-normal pointer-events-none">
                                    相对于上一档位的跌幅
                                  </div>
                                </div>
                              </div>
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              买入金额
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              买入股数
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              卖出价
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              卖出股数
                            </th>
                            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
                              卖出金额
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...gridData]
                            .sort((a, b) => b.position - a.position)
                            .map((row, index) => {
                              return (
                                <tr
                                  key={index}
                                  className="border-b border-blue-50/30 dark:border-white/5 hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-300"
                                >
                                  <td className="p-4 font-medium text-[#243B53] dark:text-blue-100">
                                    {row.position.toFixed(2)}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.buyPrice.toFixed(3)}
                                  </td>
                                  <td
                                    className={`p-4 font-medium ${
                                      row.priceDropRate < 0
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-[#243B53] dark:text-blue-100"
                                    }`}
                                  >
                                    {row.priceDropRate === 0
                                      ? "-"
                                      : `${row.priceDropRate.toFixed(2)}%`}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.buyAmount.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.buyShares.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.sellPrice.toFixed(3)}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.sellShares.toLocaleString()}
                                  </td>
                                  <td className="p-4 text-[#243B53] dark:text-blue-100">
                                    {row.sellAmount.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* 登录模态框 */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        theme={theme}
      />

      {/* 保存方案Modal */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSaveDialog(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-blue-50/50 dark:border-white/5 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md shadow-2xl shadow-blue-900/20 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-medium text-[#243B53] dark:text-blue-100">
                保存交易方案
              </h2>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <p className="text-sm opacity-70 mb-4 font-light">
              为您的交易方案输入一个名称，方便后续查看和对比
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="scheme-name"
                  className="block text-sm font-semibold text-[#243B53] dark:text-blue-100 mb-2 uppercase tracking-wide text-xs"
                >
                  方案名称
                </label>
                <input
                  id="scheme-name"
                  type="text"
                  placeholder="例如：保守型策略-2025年1月"
                  value={schemeName}
                  onChange={(e) => setSchemeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveScheme();
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-blue-100/50 dark:border-white/5 bg-white/50 dark:bg-slate-800/50 text-[#243B53] dark:text-blue-100 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSchemeName("");
                  }}
                  className="flex-1 py-3 px-4 rounded-full border border-blue-100/50 dark:border-white/5 bg-white/50 dark:bg-slate-800/50 text-[#243B53] dark:text-blue-100 hover:bg-blue-50/50 dark:hover:bg-white/10 transition-all font-bold"
                >
                  取消
                </button>
                <button
                  onClick={saveScheme}
                  className="flex-1 py-3 px-4 rounded-full bg-[#243B53] dark:bg-blue-500 hover:scale-105 active:scale-95 text-white transition-all font-bold shadow-lg shadow-blue-900/10"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* 字体引入与样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');

        .font-serif {
          font-family: 'Lora', serif;
        }
      `,
        }}
      />
    </AntdProvider>
  );
}
