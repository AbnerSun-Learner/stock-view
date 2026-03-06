"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Filter, HelpCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";

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
  theme?: "light" | "dark";
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
  theme = "light",
}: GridStepConfigProps) {
  const [inputValue, setInputValue] = useState(baseStep.toString());
  const [mediumInputValue, setMediumInputValue] = useState(mediumStep.toString());
  const [largeInputValue, setLargeInputValue] = useState(largeStep.toString());

  // 同步外部值变化
  useEffect(() => {
    setInputValue(baseStep.toString());
  }, [baseStep]);

  useEffect(() => {
    setMediumInputValue(mediumStep.toString());
  }, [mediumStep]);

  useEffect(() => {
    setLargeInputValue(largeStep.toString());
  }, [largeStep]);

  // 获取当前模式的系数
  const getScaleFactor = () => {
    return mode === "stable" ? 0.3 : 0.6;
  };

  // 处理输入变化 - 仅允许整数
  function handleInputChange(value: string) {
    // 过滤非数字字符
    const filtered = value.replace(/[^\d]/g, "");
    setInputValue(filtered);

    // 转换为数字并限制范围
    const numValue = parseInt(filtered) || 0;
    const clamped = Math.min(99, Math.max(1, numValue));
    onBaseStepChange(clamped);
  }

  // 失去焦点时确保值在范围内
  function handleBlur() {
    const numValue = parseInt(inputValue) || 1;
    const clamped = Math.min(99, Math.max(1, numValue));
    setInputValue(clamped.toString());
    onBaseStepChange(clamped);
  }

  // 处理中网步长输入变化
  function handleMediumInputChange(value: string) {
    const filtered = value.replace(/[^\d.]/g, "");
    setMediumInputValue(filtered);
    const numValue = parseFloat(filtered) || 0;
    const clamped = Math.min(100, Math.max(0.1, numValue));
    onMediumStepChange(clamped);
  }

  function handleMediumBlur() {
    const numValue = parseFloat(mediumInputValue) || 15;
    const clamped = Math.min(100, Math.max(0.1, numValue));
    setMediumInputValue(clamped.toString());
    onMediumStepChange(clamped);
  }

  // 处理大网步长输入变化
  function handleLargeInputChange(value: string) {
    const filtered = value.replace(/[^\d.]/g, "");
    setLargeInputValue(filtered);
    const numValue = parseFloat(filtered) || 0;
    const clamped = Math.min(100, Math.max(0.1, numValue));
    onLargeStepChange(clamped);
  }

  function handleLargeBlur() {
    const numValue = parseFloat(largeInputValue) || 30;
    const clamped = Math.min(100, Math.max(0.1, numValue));
    setLargeInputValue(clamped.toString());
    onLargeStepChange(clamped);
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-100/50 dark:bg-slate-700/30 rounded-full">
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
                ? "bg-[var(--brand)]"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                dynamicEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* 基础步长配置区 - 常驻 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="base-step-input"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              基础步长（小网）
            </label>
          </div>

          <div className="relative">
            <input
              id="base-step-input"
              type="text"
              inputMode="numeric"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleBlur}
              className="w-full px-4 py-3 pr-10 text-center text-lg font-semibold rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="1-99"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
              %
            </span>
          </div>
        </div>

        {/* 中网步长和大网步长配置区 - 一行两列 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 中网步长配置区 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="medium-step-input"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                中网步长
              </label>
            </div>

            <div className="relative">
              <input
                id="medium-step-input"
                type="text"
                inputMode="decimal"
                value={mediumInputValue}
                onChange={(e) => handleMediumInputChange(e.target.value)}
                onBlur={handleMediumBlur}
                className="w-full px-4 py-3 pr-10 text-center text-lg font-semibold rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* 大网步长配置区 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="large-step-input"
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                大网步长
              </label>
            </div>

            <div className="relative">
              <input
                id="large-step-input"
                type="text"
                inputMode="decimal"
                value={largeInputValue}
                onChange={(e) => handleLargeInputChange(e.target.value)}
                onBlur={handleLargeBlur}
                className="w-full px-4 py-3 pr-10 text-center text-lg font-semibold rounded-xl border-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="30"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>

        {/* 动态模式提示 */}
        <AnimatePresence>
          {dynamicEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800"
            >
              <svg
                className="w-4 h-4 mt-0.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                动态模式已激活
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 动态增强面板 - 展开层 */}
        <AnimatePresence>
          {dynamicEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  感官模式
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  {/* 稳健模式卡片 */}
                  <motion.button
                    onClick={() => onModeChange("stable")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                      mode === "stable"
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {/* 选中指示器 */}
                    {mode === "stable" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-indigo-600"
                      />
                    )}

                    <div className="flex flex-col gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          mode === "stable"
                            ? "bg-indigo-100 dark:bg-indigo-900/40"
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        <Shield
                          className={`w-5 h-5 ${
                            mode === "stable"
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <div
                          className={`font-semibold mb-1 ${
                            mode === "stable"
                              ? "text-indigo-900 dark:text-indigo-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          稳健模式
                        </div>
                        <div
                          className={`text-xs leading-relaxed ${
                            mode === "stable"
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          兼顾利润与防守，适合常规波动
                        </div>
                        <div
                          className={`text-xs font-mono mt-2 ${
                            mode === "stable"
                              ? "text-indigo-600 dark:text-indigo-400"
                              : "text-slate-500 dark:text-slate-500"
                          }`}
                        >
                          Scale = 0.3
                        </div>
                      </div>
                    </div>
                  </motion.button>

                  {/* 抄底模式卡片 */}
                  <motion.button
                    onClick={() => onModeChange("aggressive")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                      mode === "aggressive"
                        ? "border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-md"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    {/* 选中指示器 */}
                    {mode === "aggressive" && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-purple-600"
                      />
                    )}

                    <div className="flex flex-col gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          mode === "aggressive"
                            ? "bg-purple-100 dark:bg-purple-900/40"
                            : "bg-slate-100 dark:bg-slate-700"
                        }`}
                      >
                        <Filter
                          className={`w-5 h-5 ${
                            mode === "aggressive"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <div
                          className={`font-semibold mb-1 ${
                            mode === "aggressive"
                              ? "text-purple-900 dark:text-purple-100"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          抄底模式
                        </div>
                        <div
                          className={`text-xs leading-relaxed ${
                            mode === "aggressive"
                              ? "text-purple-700 dark:text-purple-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          牺牲频率换取深度防守，适合接飞刀
                        </div>
                        <div
                          className={`text-xs font-mono mt-2 ${
                            mode === "aggressive"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-500 dark:text-slate-500"
                          }`}
                        >
                          Scale = 0.6
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部状态栏 */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                dynamicEnabled
                  ? "bg-green-500 animate-pulse"
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
