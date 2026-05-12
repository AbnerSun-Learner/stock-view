"use client";

import { AntdProvider } from "@/components/antd-provider";
import { BaseInfoConfig } from "@/components/grid/base-info-config";
import { ErrorAlert } from "@/components/grid/error-alert";
import { FundCoefficientConfig } from "@/components/grid/fund-coefficient-config";
import { GridNavbar } from "@/components/grid/grid-navbar";
import { GridStepConfig } from "@/components/grid/grid-step-config";
import { GridTable } from "@/components/grid/grid-table";
import { LazyStrategyComparisonChart } from "@/components/grid/lazy-strategy-comparison-chart";
import { StatsCards } from "@/components/grid/stats-cards";
import { useGridCalculator } from "@/hooks/use-grid-calculator";
import { useGridParams } from "@/hooks/use-grid-params";
import type { GridRow, StressTest } from "@/types/grid";
import { message } from "antd";
import { useState } from "react";

export default function GridPage() {
  const [gridData, setGridData] = useState<GridRow[]>([]);
  const [stressTest, setStressTest] = useState<StressTest | null>(null);

  const [dynamicGridEnabled, setDynamicGridEnabled] = useState(false);
  const [dynamicGridMode, setDynamicGridMode] = useState<
    "stable" | "aggressive"
  >("stable");

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

  const { calculateGrid } = useGridCalculator({
    params,
    validateParams,
    dynamicGridEnabled,
    dynamicGridMode,
  });

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
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
        <GridNavbar />

        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-8 md:px-16 py-16">
            {/* 页头 */}
            <div className="mb-12">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)] mb-4">
                Grid Trading
              </p>
              <h1 className="text-4xl md:text-5xl font-light tracking-[-0.02em] text-[var(--foreground)] mb-4">
                网格交易策略
              </h1>
              <p
                className="text-base text-[var(--muted-foreground)] leading-[1.8] max-w-xl"
                style={{ letterSpacing: "0.02em" }}
              >
                在市场波动中寻找属于自己的节奏，通过科学的网格策略实现稳健收益
              </p>
            </div>

            {/* 错误提示 */}
            <ErrorAlert errors={errors} />

            {/* 主体布局 */}
            <div className="grid grid-cols-12 gap-8">
              {/* 左侧：参数配置 */}
              <div className="col-span-12 lg:col-span-4">
                <div className="border border-[color:var(--border-color)]">
                  {/* 基本信息 */}
                  <div className="border-b border-[color:var(--border-color)]">
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
                    />
                  </div>

                  {/* 资金系数 */}
                  <div className="border-b border-[color:var(--border-color)]">
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
                    />
                  </div>

                  {/* 网格步长 */}
                  <div className="border-b border-[color:var(--border-color)]">
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
                    />
                  </div>

                  {/* 生成策略按钮 */}
                  <div className="p-6">
                    <button
                      onClick={handleGenerateStrategy}
                      disabled={errors.length > 0}
                      className="w-full px-6 py-4 bg-[var(--foreground)] text-[var(--page-bg)] text-sm font-medium tracking-wide hover:opacity-70 transition-opacity duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      生成策略
                    </button>
                  </div>
                </div>
              </div>

              {/* 右侧：计算结果 */}
              <div className="col-span-12 lg:col-span-8 space-y-8">
                {gridData.length === 0 || !stressTest ? (
                  <div className="h-full min-h-[500px] flex items-center justify-center border border-dashed border-[color:var(--border-color)]">
                    <div className="text-center">
                      <p
                        className="text-sm text-[var(--muted-foreground)] mb-2"
                        style={{ letterSpacing: "0.03em" }}
                      >
                        设置参数后，计算结果将在这里展示
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] opacity-60">
                        包括网格策略对比图和详细数据表格
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 策略对比图 */}
                    <div className="border border-[color:var(--border-color)] p-6">
                      <LazyStrategyComparisonChart
                        gridData={gridData}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                      />
                    </div>

                    {/* 计算结果 */}
                    <div className="border border-[color:var(--border-color)] p-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-light tracking-[-0.01em] text-[var(--foreground)] mb-1">
                          网格计算结果
                        </h3>
                        <p
                          className="text-xs text-[var(--muted-foreground)]"
                          style={{ letterSpacing: "0.03em" }}
                        >
                          共 {gridData.length} 个网格档位
                        </p>
                      </div>

                      <StatsCards stressTest={stressTest} />
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
