"use client";

import { AntdProvider } from "@/components/antd-provider";
import { BaseInfoConfig } from "@/components/grid/base-info-config";
import { ErrorAlert } from "@/components/grid/error-alert";
import { FundCoefficientConfig } from "@/components/grid/fund-coefficient-config";
import { GridStepConfig } from "@/components/grid/grid-step-config";
import { GridTable } from "@/components/grid/grid-table";
import { LazyStrategyComparisonChart } from "@/components/grid/lazy-strategy-comparison-chart";
import { StatsCards } from "@/components/grid/stats-cards";
import { StillwellSiteNav } from "@/components/stillwell-site-nav";
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
      <div className="relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] text-[var(--foreground)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90"
          aria-hidden
        >
          <div className="ds-hero-glow absolute inset-0" />
        </div>

        <StillwellSiteNav />

        <div className="relative pt-[72px]">
          <div className="mx-auto max-w-6xl px-6 py-14 lg:px-10 lg:py-16">
            {/* 页头 */}
            <header className="mb-10 lg:mb-12">
              <div className="ds-section-label">
                <span className="ds-section-label__text">Grid Trading</span>
              </div>
              <h1 className="font-display mb-4 text-3xl font-light text-[var(--foreground)] md:text-[2.75rem] md:leading-[1.12]">
                网格交易策略
              </h1>
              <p className="max-w-xl text-[15px] leading-[1.8] text-[var(--muted-foreground)]">
                在市场波动中寻找属于自己的节奏，通过科学的网格策略实现稳健收益
              </p>
            </header>

            {/* 错误提示 */}
            <ErrorAlert errors={errors} />

            {/* 主体布局 */}
            <div className="grid grid-cols-12 gap-8 lg:gap-10">
              {/* 左侧：参数配置 */}
              <div className="col-span-12 lg:col-span-4">
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--ds-shadow-md)]">
                  {/* 基本信息 */}
                  <div className="border-b border-[var(--border)]">
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
                  <div className="border-b border-[var(--border)]">
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
                  <div className="border-b border-[var(--border)]">
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
                  <div className="border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-subtle)_55%,var(--card))] p-6">
                    <button
                      type="button"
                      onClick={handleGenerateStrategy}
                      disabled={errors.length > 0}
                      className="marketing-primary-btn w-full px-6 py-3.5 text-sm font-semibold tracking-wide disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none"
                    >
                      生成策略
                    </button>
                  </div>
                </div>
              </div>

              {/* 右侧：计算结果 */}
              <div className="col-span-12 space-y-8 lg:col-span-8">
                {gridData.length === 0 || !stressTest ? (
                  <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] px-6 shadow-[var(--ds-shadow-sm)] backdrop-blur-[2px] lg:min-h-[520px]">
                    <div className="max-w-sm text-center">
                      <p className="mb-2 text-sm font-medium text-[var(--foreground)]">
                        尚无计算结果
                      </p>
                      <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                        完成左侧参数配置后点击「生成策略」，策略优势推演与明细表格将在此呈现
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 策略对比图（组件内部图表 UI 不改，仅外层容器） */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--ds-shadow-md)] md:p-8">
                      <LazyStrategyComparisonChart
                        gridData={gridData}
                        basePrice={params.basePrice}
                        priceDecimals={priceDecimals}
                      />
                    </div>

                    {/* 计算结果 */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--ds-shadow-md)] md:p-8">
                      <div className="mb-8 border-b border-[var(--border)] pb-6">
                        <p className="ds-card-eyebrow mb-2">Results</p>
                        <h3 className="text-lg font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                          网格计算结果
                        </h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
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
