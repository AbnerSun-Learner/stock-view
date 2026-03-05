"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen transition-colors duration-500 bg-[#F0F4F8] text-[#243B53] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 导航栏：左侧 Logo，中间 网格交易/指数估值，右侧 关于我们 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-blue-100/20">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
          {/* 左侧：Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-[#243B53] rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-[#243B53] transition-colors">
              Stillwell
            </span>
          </Link>

          {/* 中间一体：网格交易 / 指数估值 / 关于我们 */}
          <div className="hidden md:flex items-center justify-center space-x-10 flex-1">
            <Link
              href="/grid"
              className="text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
            >
              网格交易
            </Link>
            <Link
              href="/valuation"
              className="text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
            >
              指数估值
            </Link>
            <Link
              href="#"
              className="text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
            >
              关于我们
            </Link>
          </div>

          {/* 右侧占位，与左侧 Logo 对称 */}
          <div className="w-[120px]" aria-hidden />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* 背景装饰：雾霾蓝动态背景 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-200/20 rounded-full blur-[140px] -z-10"></div>
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 rounded-full blur-[100px] -z-10"></div>

        <header className="px-8 max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-8xl font-serif font-medium leading-[1.1] mb-10 tracking-tight">
            Still in{" "}
            <span className="italic font-light text-slate-400 dark:text-slate-500">
              Volatility
            </span>
            ,<br />
            Rich in <span className="text-[#243B53] font-semibold">Time</span>.
          </h1>

          <p className="max-w-3xl mx-auto text-lg md:text-2xl opacity-70 leading-relaxed mb-16 font-light">
            市场的噪音是暂时的，复利的增长是永恒的。
            <br className="hidden md:block" />
            在这里，遇见让指数投资与内心安宁共生的栖息地。
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
            <Link href="/grid">
              <button className="w-full md:w-auto bg-[#243B53] text-white px-12 py-5 rounded-full text-lg flex items-center justify-center group font-bold shadow-xl shadow-blue-900/10 hover:-translate-y-1 transition-all">
                进入网格策略{" "}
                <ArrowRight
                  className="ml-2 group-hover:translate-x-1 transition-transform"
                  size={20}
                />
              </button>
            </Link>
            <Link href="/valuation">
              <button className="w-full md:w-auto px-12 py-5 rounded-full text-lg border border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100 transition-all hover:bg-blue-50/50 dark:hover:bg-white/5">
                指数估值
              </button>
            </Link>
          </div>
        </header>

        {/* 极简页脚 */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 font-bold">
            © 2024 Stillwell · 慢即是快，稳即是远。
          </p>
        </div>
      </div>

      {/* 字体引入与动效样式 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap');

        .font-serif {
          font-family: 'Lora', serif;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
        
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `,
        }}
      />
    </div>
  );
}
