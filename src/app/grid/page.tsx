"use client";

/**
 * 网格交易计算器 - 重构优化版
 * 将业务逻辑和UI分离，提高代码可维护性
 */

import { AntdProvider } from "@/components/antd-provider";
import { BaseInfoConfig } from "@/components/grid/base-info-config";
import { ErrorAlert } from "@/components/grid/error-alert";
import { FundCoefficientConfig } from "@/components/grid/fund-coefficient-config";
import { GridNavbar } from "@/components/grid/grid-navbar";
import { GridStepConfig } from "@/components/grid/grid-step-config";
import { GridTable } from "@/components/grid/grid-table";
import { StatsCards } from "@/components/grid/stats-cards";
import { StrategyComparisonChart } from "@/components/grid/strategy-comparison-chart";
import { useGridCalculator } from "@/hooks/use-grid-calculator";
import { useGridParams } from "@/hooks/use-grid-params";
import type { GridRow, StressTest } from "@/types/grid";
import { message } from "antd";
import { Sparkles } from "lucide-react";
import { useState } from "react";

export default function GridPage() {
  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [stressTest, setStressTest] = useState<StressTest | null>(null);
  const theme = "light" as const;

  // 动态网格步长状态
  const [dynamicGridEnabled, setDynamicGridEnabled] = useState(false);
  const [dynamicGridMode, setDynamicGridMode] = useState<
    "stable" | "aggressive"
  >("stable");

  // 参数管理
  const { params, updateParam, validateParams, errors, priceDecimals } =
    useGridParams({
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

  // 网格计算
  const { calculateGrid } = useGridCalculator({
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  });

  // 生成策略
  const handleGenerateStrategy = () => {
    const validation = validateParams();
    if (!validation.isValid) {
      message.error("请检查参数设置");
      return;
    }

    const result = calculateGrid();
    setGridData(result.gridData);
    setStressTest(result.stressTest);
    message.success("策略已生成");
  };

  return (
    <AntdProvider>
      <div
        className="min-h-screen transition-colors duration-500 bg-[var(--page-bg)] text-[var(--foreground)]"
      >
        {/* 背景装饰：雾霾蓝动态背景 */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[140px]"></div>
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-[100px]"></div>
        </div>

        {/* 导航栏 */}
        <GridNavbar />

        <div className="pt-20">
          <div className="py-8 space-y-8 max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-[var(--foreground)] mb-3">
                网格交易策略
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] leading-relaxed font-light max-w-2xl mx-auto">
                在市场波动中寻找属于自己的节奏，通过科学的网格策略实现稳健收益
              </p>
            </div>

            {/* 错误提示 */}
            <ErrorAlert errors={errors} />

            {/* 左右布局 */}
            <div className="grid grid-cols-12 gap-6">
              {/* 左侧：参数配置 */}
              <div className="col-span-12 lg:col-span-4">
                <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-md shadow-2xl shadow-blue-900/10 overflow-hidden">
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
                      onMinPriceChange={(value) =>
                        updateParam("minPrice", value)
                      }
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
                      mediumStep={params.mediumGridStep}
                      onMediumStepChange={(value) =>
                        updateParam("mediumGridStep", value)
                      }
                      largeStep={params.largeGridStep}
                      onLargeStepChange={(value) =>
                        updateParam("largeGridStep", value)
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
                      onClick={handleGenerateStrategy}
                      disabled={errors.length > 0}
                      className="w-full px-6 py-4 rounded-full bg-[var(--brand)] text-white font-bold text-lg shadow-xl shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
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
                  <div className="h-full min-h-[600px] flex items-center justify-center p-12 rounded-2xl border border-dashed border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-sm">
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
                    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-md shadow-2xl shadow-blue-900/10 overflow-hidden">
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
                    <div className="p-6 rounded-2xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-md shadow-2xl shadow-blue-900/10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-serif font-medium text-[var(--foreground)] mb-2">
                            网格计算结果
                          </h3>
                          <p className="text-sm opacity-70 font-light">
                            共 {gridData.length} 个网格档位
                          </p>
                        </div>
                      </div>

                      {/* 统计数据 */}
                      <StatsCards stressTest={stressTest} />

                      {/* 表格 */}
                      <GridTable
                        gridData={gridData}
                        priceDecimals={priceDecimals}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AntdProvider>
  );
}
