import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata } from "next";
import { Geist_Mono, Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

/**
 * Inter — 英文 UI 字体
 * 300 light（大标题）/ 400 regular（正文）/ 500 medium（强调）/ 600 semibold（按钮、标签）
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

/**
 * Noto Sans SC — 中文字体（思源黑体简体）
 * 与 Inter 共享同一 font-family 栈，自动接管 CJK 字符
 * 300 细体（配合 Inter Light 标题）/ 400 正文 / 500 中等
 */
const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

/**
 * Geist Mono — 等宽数字字体
 * 用于金融数据表格、价格、分位数等需要等宽对齐的场景
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stillwell - 慢即是快，稳即是远",
  description:
    "市场的噪音是暂时的，复利的增长是永恒的。在这里，遇见让指数投资与内心安宁共生的栖息地。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansSC.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
