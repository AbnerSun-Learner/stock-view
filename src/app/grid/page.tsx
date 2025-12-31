"use client";

/**
 * 网格交易计算器 - 方案C优化版：卡片网格布局
 * 设计风格：日本极简主义
 * 布局：所有元素以卡片形式展示，排列成网格
 * 功能完全按照 Home.tsx 实现
 */

import { AuthModal } from "@/components/etf-terminal/auth-modal";
import { TerminalLayout } from "@/components/etf-terminal/layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase-client";
import { AlertCircle, HelpCircle, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface GridRow {
  type: string;
  position: number;
  buyTriggerPrice: number;
  buyPrice: number;
  buyAmount: number;
  buyShares: number;
  sellTriggerPrice: number;
  sellPrice: number;
  sellShares: number;
  sellAmount: number;
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
    positionMultiplier: number;
    amountMultiplier: number;
    profitReserveMultiplier: number;
  };
  gridData: GridRow[];
  stressTest: StressTest;
}

const PRESET_SCHEMES = {
  conservative: {
    name: "保守型（低风险）",
    params: {
      minTradeUnit: 100,
      basePrice: 1.0,
      amountPerGrid: 10000,
      minPrice: 0.7,
      smallGridStep: 3.0,
      mediumGridStep: 8.0,
      largeGridStep: 15.0,
      positionMultiplier: 1.0,
      amountMultiplier: 1.0,
      profitReserveMultiplier: 1.0,
    },
  },
  balanced: {
    name: "平衡型（中风险）",
    params: {
      minTradeUnit: 100,
      basePrice: 1.0,
      amountPerGrid: 10000,
      minPrice: 0.5,
      smallGridStep: 5.0,
      mediumGridStep: 15.0,
      largeGridStep: 30.0,
      positionMultiplier: 1.0,
      amountMultiplier: 1.0,
      profitReserveMultiplier: 1.0,
    },
  },
  aggressive: {
    name: "激进型（高风险）",
    params: {
      minTradeUnit: 100,
      basePrice: 1.0,
      amountPerGrid: 10000,
      minPrice: 0.3,
      smallGridStep: 8.0,
      mediumGridStep: 20.0,
      largeGridStep: 40.0,
      positionMultiplier: 1.0,
      amountMultiplier: 1.0,
      profitReserveMultiplier: 1.0,
    },
  },
};

const PARAM_FIELDS = [
  { key: "minTradeUnit", label: "最小交易单位", tooltip: "单次交易的最小股数" },
  { key: "basePrice", label: "基准价", tooltip: "网格交易的起始价格" },
  { key: "minPrice", label: "最低价", tooltip: "网格交易的最低价格限制" },
  {
    key: "amountPerGrid",
    label: "每份金额",
    tooltip: "每个网格档位的投资金额",
  },
  {
    key: "smallGridStep",
    label: "小网步长 (%)",
    tooltip: "小网格的价格间隔百分比",
  },
  {
    key: "mediumGridStep",
    label: "中网步长 (%)",
    tooltip: "中网格的价格间隔百分比",
  },
  {
    key: "largeGridStep",
    label: "大网步长 (%)",
    tooltip: "大网格的价格间隔百分比",
  },
  {
    key: "positionMultiplier",
    label: "档位加码系数",
    tooltip: "控制卖出股数随档位增加的倍数",
  },
  {
    key: "amountMultiplier",
    label: "金额加码系数",
    tooltip: "控制买入金额随档位增加的倍数",
  },
  {
    key: "profitReserveMultiplier",
    label: "保留利润系数",
    tooltip: "控制卖出价相对于卖出触发价的利润幅度",
  },
];

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
        position_multiplier: number;
        amount_multiplier: number;
        profit_reserve_multiplier: number;
        grid_data: GridRow[];
        stress_test: StressTest;
      }) => ({
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
          positionMultiplier: item.position_multiplier,
          amountMultiplier: item.amount_multiplier,
          profitReserveMultiplier: item.profit_reserve_multiplier,
        },
        gridData: item.grid_data || [],
        stressTest: item.stress_test || null,
      })
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
    position_multiplier: scheme.params.positionMultiplier,
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
  const [params, setParams] = useState({
    minTradeUnit: 100,
    basePrice: 1.0,
    amountPerGrid: 10000,
    minPrice: 0.5,
    smallGridStep: 5.0,
    mediumGridStep: 15.0,
    largeGridStep: 30.0,
    positionMultiplier: 1.0,
    amountMultiplier: 1.0,
    profitReserveMultiplier: 1.0,
  });

  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [stressTest, setStressTest] = useState<StressTest | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [schemeName, setSchemeName] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
    if (
      params.positionMultiplier <= 0 ||
      params.amountMultiplier <= 0 ||
      params.profitReserveMultiplier <= 0
    ) {
      newErrors.push("系数必须大于0");
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

  // 辅助函数
  const roundToMinUnit = (price: number): number => {
    const minUnit = 0.001;
    return Math.round(price / minUnit) * minUnit;
  };

  // 计算网格
  const calculationResult = useMemo(() => {
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
      mediumGridStep,
      largeGridStep,
      positionMultiplier,
      amountMultiplier,
      profitReserveMultiplier,
    } = params;

    const grids: GridRow[] = [];
    let globalPosition = 1;
    let firstBuyPrice = basePrice; // 记录第一网的买入价（基准价）

    // 生成小网格
    let currentPrice = basePrice;
    let smallGridPosition = 1;
    const smallGridCount = 7;

    while (smallGridPosition <= smallGridCount && currentPrice > minPrice) {
      const stepPercent = smallGridStep / 100;
      const buyTriggerPrice = roundToMinUnit(currentPrice);
      const buyPrice = roundToMinUnit(currentPrice * (1 - stepPercent / 2));

      // 记录第一网的买入价作为基准价
      if (smallGridPosition === 1) {
        firstBuyPrice = buyPrice;
      }

      // 金额加码系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      // 当前档位 = currentPrice / basePrice
      const currentLevel = currentPrice / basePrice;
      const buyAmount =
        amountPerGrid + amountPerGrid * amountMultiplier * (1 - currentLevel);

      const buyShares =
        Math.floor(buyAmount / buyPrice / minTradeUnit) * minTradeUnit;
      const sellTriggerPrice = roundToMinUnit(
        currentPrice * (1 + stepPercent / 2)
      );

      // 保留利润系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      // 用于计算卖出价的利润幅度
      const profitAmount =
        amountPerGrid +
        amountPerGrid * profitReserveMultiplier * (1 - currentLevel);
      const profitRate = profitAmount / amountPerGrid;
      const sellPrice = roundToMinUnit(
        sellTriggerPrice * (1 + (stepPercent / 2) * profitRate)
      );

      const sellShares =
        Math.floor(
          buyShares /
            Math.pow(positionMultiplier, globalPosition - 1) /
            minTradeUnit
        ) * minTradeUnit;
      const sellAmount = sellShares * sellPrice;

      // 档位 = 当前买入价 / 基准价（第一网的买入价），第一网固定为1.0
      const position =
        smallGridPosition === 1
          ? 1.0
          : parseFloat((buyPrice / firstBuyPrice).toFixed(2));

      grids.push({
        type: "小网",
        position,
        buyTriggerPrice: parseFloat(buyTriggerPrice.toFixed(3)),
        buyPrice: parseFloat(buyPrice.toFixed(3)),
        buyAmount: Math.round(buyAmount),
        buyShares,
        sellTriggerPrice: parseFloat(sellTriggerPrice.toFixed(3)),
        sellPrice: parseFloat(sellPrice.toFixed(3)),
        sellShares,
        sellAmount: Math.round(sellAmount),
      });

      currentPrice = currentPrice * (1 - stepPercent);
      smallGridPosition++;
      globalPosition++;
    }

    // 生成中网格
    let mediumGridPosition = 1;
    const mediumGridCount = 2;

    while (mediumGridPosition <= mediumGridCount && currentPrice > minPrice) {
      const stepPercent = mediumGridStep / 100;
      const buyTriggerPrice = roundToMinUnit(currentPrice);
      const buyPrice = roundToMinUnit(currentPrice * (1 - stepPercent / 2));

      // 金额加码系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      const currentLevel = currentPrice / basePrice;
      const buyAmount =
        amountPerGrid + amountPerGrid * amountMultiplier * (1 - currentLevel);

      const buyShares =
        Math.floor(buyAmount / buyPrice / minTradeUnit) * minTradeUnit;
      const sellTriggerPrice = roundToMinUnit(
        currentPrice * (1 + stepPercent / 2)
      );

      // 保留利润系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      const profitAmount =
        amountPerGrid +
        amountPerGrid * profitReserveMultiplier * (1 - currentLevel);
      const profitRate = profitAmount / amountPerGrid;
      const sellPrice = roundToMinUnit(
        sellTriggerPrice * (1 + (stepPercent / 2) * profitRate)
      );

      const sellShares =
        Math.floor(
          buyShares /
            Math.pow(positionMultiplier, globalPosition - 1) /
            minTradeUnit
        ) * minTradeUnit;
      const sellAmount = sellShares * sellPrice;

      // 档位 = 当前买入价 / 基准价（第一网的买入价）
      const position = parseFloat((buyPrice / firstBuyPrice).toFixed(2));

      grids.push({
        type: "中网",
        position,
        buyTriggerPrice: parseFloat(buyTriggerPrice.toFixed(3)),
        buyPrice: parseFloat(buyPrice.toFixed(3)),
        buyAmount: Math.round(buyAmount),
        buyShares,
        sellTriggerPrice: parseFloat(sellTriggerPrice.toFixed(3)),
        sellPrice: parseFloat(sellPrice.toFixed(3)),
        sellShares,
        sellAmount: Math.round(sellAmount),
      });

      currentPrice = currentPrice * (1 - stepPercent);
      mediumGridPosition++;
      globalPosition++;
    }

    // 生成大网格
    let largeGridPosition = 1;
    const largeGridCount = 1;

    while (largeGridPosition <= largeGridCount && currentPrice > minPrice) {
      const stepPercent = largeGridStep / 100;
      const buyTriggerPrice = roundToMinUnit(currentPrice);
      const buyPrice = roundToMinUnit(currentPrice * (1 - stepPercent / 2));

      // 金额加码系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      const currentLevel = currentPrice / basePrice;
      const buyAmount =
        amountPerGrid + amountPerGrid * amountMultiplier * (1 - currentLevel);

      const buyShares =
        Math.floor(buyAmount / buyPrice / minTradeUnit) * minTradeUnit;
      const sellTriggerPrice = roundToMinUnit(
        currentPrice * (1 + stepPercent / 2)
      );

      // 保留利润系数：每份金额 + 每份金额 * 系数 * (1 - 当前档位)
      const profitAmount =
        amountPerGrid +
        amountPerGrid * profitReserveMultiplier * (1 - currentLevel);
      const profitRate = profitAmount / amountPerGrid;
      const sellPrice = roundToMinUnit(
        sellTriggerPrice * (1 + (stepPercent / 2) * profitRate)
      );

      const sellShares =
        Math.floor(
          buyShares /
            Math.pow(positionMultiplier, globalPosition - 1) /
            minTradeUnit
        ) * minTradeUnit;
      const sellAmount = sellShares * sellPrice;

      // 档位 = 当前买入价 / 基准价（第一网的买入价）
      const position = parseFloat((buyPrice / firstBuyPrice).toFixed(2));

      grids.push({
        type: "大网",
        position,
        buyTriggerPrice: parseFloat(buyTriggerPrice.toFixed(3)),
        buyPrice: parseFloat(buyPrice.toFixed(3)),
        buyAmount: Math.round(buyAmount),
        buyShares,
        sellTriggerPrice: parseFloat(sellTriggerPrice.toFixed(3)),
        sellPrice: parseFloat(sellPrice.toFixed(3)),
        sellShares,
        sellAmount: Math.round(sellAmount),
      });

      currentPrice = currentPrice * (1 - stepPercent);
      largeGridPosition++;
      globalPosition++;
    }

    // 计算压力测试
    const totalBuyAmount = grids.reduce((sum, row) => sum + row.buyAmount, 0);
    const totalBuyShares = grids.reduce((sum, row) => sum + row.buyShares, 0);
    const totalSellAmount = grids.reduce((sum, row) => sum + row.sellAmount, 0);
    const totalSellShares = grids.reduce((sum, row) => sum + row.sellShares, 0);
    const remainingShares = totalBuyShares - totalSellShares;
    const profit = totalSellAmount - totalBuyAmount;
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
  }, [params, validateParams]);

  // 更新结果
  useEffect(() => {
    setGridData(calculationResult.gridData);
    setStressTest(calculationResult.stressTest);
  }, [calculationResult]);

  // 更新参数
  const updateParam = (key: string, value: number) => {
    setParams({ ...params, [key]: value });
  };

  // 应用预设
  const applyPreset = (presetKey: string) => {
    const preset = PRESET_SCHEMES[presetKey as keyof typeof PRESET_SCHEMES];
    if (preset) {
      setParams(preset.params);
      setMessage({ type: "success", text: `已应用${preset.name}预设` });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // 保存方案
  const saveScheme = async () => {
    if (!schemeName.trim()) {
      setMessage({ type: "error", text: "请输入方案名称" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (gridData.length === 0 || !stressTest) {
      setMessage({ type: "error", text: "请先生成网格" });
      setTimeout(() => setMessage(null), 3000);
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
        setMessage({ type: "success", text: "方案已保存" });
        setTimeout(() => setMessage(null), 3000);
      } catch (error) {
        console.error("保存失败:", error);
        setMessage({ type: "error", text: "保存失败，请重试" });
        setTimeout(() => setMessage(null), 3000);
      }
    } else {
      // 未登录，保存到本地存储
      const updated = [...savedSchemes, newScheme];
      setSavedSchemes(updated);
      localStorage.setItem("gridTradingSchemes", JSON.stringify(updated));
      setMessage({ type: "success", text: "方案已保存到本地" });
      setTimeout(() => setMessage(null), 3000);
    }

    setSchemeName("");
    setShowSaveDialog(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <>
      <TerminalLayout theme={theme} onToggleTheme={toggleTheme}>
        <div className="py-8 space-y-8 max-w-[1400px] mx-auto">
          {/* 页面标题 */}
          <header className="text-center space-y-3">
            <h1 className="text-3xl font-medium tracking-wide text-slate-800 dark:text-slate-100">
              网格交易计算器
            </h1>
            <p className="text-slate-600 dark:text-slate-400 font-light text-sm">
              专业的网格交易策略计算工具，支持小网、中网、大网三种网格类型
            </p>
          </header>

          {/* 消息提示 */}
          {message && (
            <div
              className={`p-4 rounded-lg border ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 错误提示 */}
          {errors.length > 0 && (
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  参数错误
                </span>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 卡片网格布局 */}
          <div className="grid grid-cols-5 gap-4 auto-rows-max">
            {/* 快速预设卡片 - 跨越全宽 */}
            <div className="col-span-5">
              <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-900/10">
                <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
                  快速预设
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => applyPreset("conservative")}
                    className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-400 font-medium"
                  >
                    保守型
                  </button>
                  <button
                    onClick={() => applyPreset("balanced")}
                    className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-400 font-medium"
                  >
                    平衡型
                  </button>
                  <button
                    onClick={() => applyPreset("aggressive")}
                    className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all duration-400 font-medium"
                  >
                    激进型
                  </button>
                </div>
              </div>
            </div>

            {/* 参数卡片 - 5列布局 */}
            {PARAM_FIELDS.map((field) => (
              <div
                key={field.key}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
              >
                <div className="mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-1 text-slate-800 dark:text-slate-100">
                    <span className="text-red-500">*</span>
                    {field.label}
                    <div className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 cursor-help text-slate-400" />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg">
                        {field.tooltip}
                      </div>
                    </div>
                  </h4>
                </div>
                <input
                  type="number"
                  step={
                    field.key === "basePrice" || field.key === "minPrice"
                      ? "0.001"
                      : "0.1"
                  }
                  value={params[field.key as keyof typeof params]}
                  onChange={(e) =>
                    updateParam(field.key, parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-center transition-all duration-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            ))}

            {/* 计算结果表格 - 跨越全宽 */}
            {gridData.length > 0 && stressTest && (
              <div className="col-span-5">
                <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                        网格计算结果
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-light mt-1">
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
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-400 flex items-center gap-2 font-medium"
                    >
                      <Save className="w-4 h-4" />
                      保存方案
                    </button>
                  </div>

                  {/* 统计数据 */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        总买入金额
                      </div>
                      <div className="text-2xl font-medium text-slate-800 dark:text-slate-100">
                        {stressTest.totalBuyAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        总卖出金额
                      </div>
                      <div className="text-2xl font-medium text-slate-800 dark:text-slate-100">
                        {stressTest.totalSellAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        预期利润
                      </div>
                      <div
                        className={`text-2xl font-medium ${
                          stressTest.profit > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {stressTest.profit.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        收益率
                      </div>
                      <div
                        className={`text-2xl font-medium ${
                          stressTest.profitRate > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {stressTest.profitRate}%
                      </div>
                    </div>
                  </div>

                  {/* 表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            网格种类
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            档位
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            买入触发价
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            买入价
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            买入金额
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            入股数
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            卖出触发价
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            卖出价
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            出股数
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                            卖出金额
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {gridData.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-300"
                          >
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-100">
                              {row.type}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.position}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.buyTriggerPrice}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.buyPrice}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.buyAmount.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.buyShares.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.sellTriggerPrice}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.sellPrice}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.sellShares.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">
                              {row.sellAmount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 页脚 */}
          <footer className="text-center text-xs text-slate-500 dark:text-slate-400 font-light pt-4 space-y-2">
            <p>
              本工具根据设定的参数自动生成网格交易策略，包含小网、中网、大网三种类型
            </p>
            <p className="opacity-70">投资有风险，决策需谨慎，本工具仅供参考</p>
          </footer>
        </div>
      </TerminalLayout>

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
          <div className="relative w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                保存交易方案
              </h2>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              为您的交易方案输入一个名称，方便后续查看和对比
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="scheme-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
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
                  className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSchemeName("");
                  }}
                  className="flex-1 py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-all font-medium"
                >
                  取消
                </button>
                <button
                  onClick={saveScheme}
                  className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-medium"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
