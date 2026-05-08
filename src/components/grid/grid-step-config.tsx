"use client";

import { InputNumber } from "antd";
import { Filter, HelpCircle, Shield } from "lucide-react";

interface GridStepConfigProps {
  baseStep: number;
  onBaseStepChange: (value: number) => void;
  mediumStep: number;
  onMediumStepChange: (value: number) => void;
  largeStep: number;
  onLargeStepChange: (value: number) => void;
  dynamicEnabled: boolean;
  onDynamicEnabledChange: (enabled: boolean) => void;
  mode: "stable" | "aggressive";
  onModeChange: (mode: "stable" | "aggressive") => void;
}

export function GridStepConfig({
  baseStep,
  onBaseStepChange,
  mediumStep,
  onMediumStepChange,
  largeStep,
  onLargeStepChange,
  dynamicEnabled,
  onDynamicEnabledChange,
  mode,
  onModeChange,
}: GridStepConfigProps) {
  function getScaleFactor() {
    return mode === "stable" ? 0.3 : 0.6;
  }

  function normalizeValue(value: number | null, fallback: number) {
    if (value === null) return fallback;
    return value;
  }

  function handleBaseStepChange(value: number | null) {
    onBaseStepChange(normalizeValue(value, 1));
  }

  function handleMediumStepChange(value: number | null) {
    onMediumStepChange(normalizeValue(value, 15));
  }

  function handleLargeStepChange(value: number | null) {
    onLargeStepChange(normalizeValue(value, 30));
  }

  return (
    <div className="p-6 space-y-4">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            网格步长
          </h3>
          <div className="group relative">
            <HelpCircle className="w-4 h-4 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
            <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-72 p-3 text-xs rounded-lg bg-slate-900 dark:bg-slate-950 text-slate-100 shadow-xl whitespace-normal pointer-events-none">
              <div className="font-semibold mb-2">计算逻辑公式：</div>
              <div className="space-y-1 font-mono text-[11px]">
                <div>P₁ = 基准价</div>
                <div>P₂ = P₁ × (1 - Step_initial)</div>
                <div>Pₙ = Pₙ₋₁ × (1 - Stepₙ₋₁)</div>
                <div className="pt-2 border-t border-slate-700">
                  <div>动态步长更新：</div>
                  <div>Stepₙ = Stepₙ₋₁ × (1 + Scale)</div>
                  <div className="text-slate-400 mt-1">
                    稳健模式 Scale=0.3
                    <br />
                    抄底模式 Scale=0.6
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 功能开关 */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="dynamic-switch"
            className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            启用动态间距
          </label>
          <button
            id="dynamic-switch"
            role="switch"
            aria-checked={dynamicEnabled}
            onClick={() => onDynamicEnabledChange(!dynamicEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--page-bg)] ${
              dynamicEnabled
                ? "bg-[var(--foreground)]"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-[var(--page-bg)] transition-transform duration-200 ${
                dynamicEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* 基础步长配置区 - 常驻 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="base-step-input"
              className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              <span className="text-red-500">*</span>
              基础步长（小网）
            </label>
          </div>

          <InputNumber
            id="base-step-input"
            value={baseStep}
            onChange={handleBaseStepChange}
            precision={0}
            min={1}
            max={99}
            controls={false}
            addonAfter="%"
            className="w-full"
            style={{
              width: "100%",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "16px",
            }}
          />
        </div>

        {/* 中网步长和大网步长配置区 - 一行两列 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 中网步长配置区 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="medium-step-input"
                className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="text-red-500">*</span>
                中网步长
              </label>
            </div>

            <InputNumber
              id="medium-step-input"
              value={mediumStep}
              onChange={handleMediumStepChange}
              precision={1}
              min={0.1}
              max={100}
              controls={false}
              addonAfter="%"
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>

          {/* 大网步长配置区 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="large-step-input"
                className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="text-red-500">*</span>
                大网步长
              </label>
            </div>

            <InputNumber
              id="large-step-input"
              value={largeStep}
              onChange={handleLargeStepChange}
              precision={1}
              min={0.1}
              max={100}
              controls={false}
              addonAfter="%"
              className="w-full"
              style={{
                width: "100%",
                textAlign: "center",
                fontWeight: 600,
                fontSize: "16px",
              }}
            />
          </div>
        </div>

        {/* 动态模式提示 */}
        {dynamicEnabled && (
          <div className="border border-[color:var(--border-color)] p-3">
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              动态模式已激活，步长会随网格档位按所选模式逐级扩张。
            </p>
          </div>
        )}

        {/* 动态增强面板 - 展开层 */}
        {dynamicEnabled && (
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              感官模式
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* 稳健模式卡片 */}
              <button
                onClick={() => onModeChange("stable")}
                className={`relative p-4 border transition-colors duration-150 text-left ${
                  mode === "stable"
                    ? "border-[var(--foreground)] bg-[var(--hover-bg)]"
                    : "border-[color:var(--border-color)] hover:border-[var(--foreground)]"
                }`}
              >
                {mode === "stable" && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--foreground)]" />
                )}

                <div className="flex flex-col gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-[color:var(--border-color)]">
                    <Shield className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1 text-slate-800 dark:text-slate-200">
                      稳健模式
                    </div>
                    <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      兼顾利润与防守，适合常规波动
                    </div>
                    <div className="text-xs font-mono mt-2 text-[var(--muted-foreground)]">
                      Scale = 0.3
                    </div>
                  </div>
                </div>
              </button>

              {/* 抄底模式卡片 */}
              <button
                onClick={() => onModeChange("aggressive")}
                className={`relative p-4 border transition-colors duration-150 text-left ${
                  mode === "aggressive"
                    ? "border-[var(--foreground)] bg-[var(--hover-bg)]"
                    : "border-[color:var(--border-color)] hover:border-[var(--foreground)]"
                }`}
              >
                {mode === "aggressive" && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--foreground)]" />
                )}

                <div className="flex flex-col gap-3">
                  <div className="w-10 h-10 flex items-center justify-center border border-[color:var(--border-color)]">
                    <Filter className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1 text-slate-800 dark:text-slate-200">
                      抄底模式
                    </div>
                    <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      牺牲频率换取深度防守，适合接飞刀
                    </div>
                    <div className="text-xs font-mono mt-2 text-[var(--muted-foreground)]">
                      Scale = 0.6
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 底部状态栏 */}
        <div className="pt-4 border-t border-[color:var(--border-color)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                dynamicEnabled
                  ? "bg-[var(--foreground)]"
                  : "bg-slate-400 dark:bg-slate-600"
              }`}
            />
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {dynamicEnabled ? (
                <>
                  当前生效逻辑：
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    加速扩张
                  </span>{" "}
                  (基础: {baseStep}%, 系数: {getScaleFactor()})
                </>
              ) : (
                <>
                  当前生效逻辑：
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    等差指数模型
                  </span>{" "}
                  (系数: 0)
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
