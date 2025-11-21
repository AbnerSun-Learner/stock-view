## 项目简介

本项目是一个基于 **Next.js + TypeScript + Tailwind CSS** 的股票分析小工具，核心功能：

- **输入股票代码**：支持 A 股 6 位股票代码（可带 `.SZ`/`.SH` 后缀，如 `000001.SZ`、`600519`）。
- **展示日 K 走势**：基于 **Baostock** 提供的日度前复权数据（自 1990-12-19 起）。
- **关键价位计算**：
  - 历史最高收盘价；
  - 对应的 **-80% 点位**（即 \(0.2 \times 最高收盘价\)）；
  - 最近交易日收盘价（非实时价格，仅到当日收盘）。
- **距离 -80% 的预期跌幅**：
  - 计算从当前价到 -80% 点位，还需/已经完成多少比例的「从最高到 -80%」跌幅。
- **收藏与历史记录**：
  - 本地 `localStorage` 存储收藏股票与查询历史，类似浏览器书签+搜索历史。

前端首页整体风格借鉴 Google 搜索首页：居中搜索框、简洁留白、重点信息卡片化展示。

---

## 环境要求

- 推荐 Node.js：**>= 20.9.0**

  - 如果你本地安装了 `nvm`，可在项目根目录执行：

  ```bash
  nvm use 20
  ```

- npm：建议使用随 Node 20 一起安装的版本。

---

## 外部依赖

- **Python 3.9+ 与 Baostock**

  - 保证服务器可用 `python3`（或自定义路径）；
  - 安装 Baostock：`pip install baostock`;
  - 若默认 `python3` 不可用，可在 `.env.local` 中指定：

    ```bash
    PYTHON_BIN=/custom/path/to/python3
    ```

  - `/api/stock` 会通过 `scripts/baostock_fetcher.py` 调用本地 Python 解释器抓取数据，请确保部署环境允许执行。

---

## 本地运行

1. **安装依赖**

   ```bash
   cd /Users/abnersun/Downloads/code/stock-view
   npm install
   ```

2. **启动开发服务**

   ```bash
   npm run dev
   ```

3. 在浏览器打开 `http://localhost:3000` 即可访问。

> 提示：首次访问时，可尝试输入 `000001.SZ`、`600519.SH`、`002415` 等 A 股代码，暂不支持美股/港股。

---

## 功能说明

- **搜索输入框**

- 输入股票代码，回车或点击「查询」按钮发起请求。
- 后端请求 `/api/stock?symbol=代码`，实时通过 Baostock 拉取该股票自 1990 年以来的日度前复权数据。

- **日 K 与价位展示**

  - 通过后端计算：
    - `highest.price`: 近 5 年内最高收盘价；
    - `target80.price`: `highest.price * 0.2`，即 -80% 点位；
    - `current.price`: 最近有效交易日的收盘价；
    - `expectedDropRatio`: 当前价到 -80% 点位，相对「从最高到 -80% 全程」的比例。
  - 前端以卡片形式展示以上关键数值，并绘制简易折线图：
    - 折线图基于收盘价（近约 6 个月数据）；
    - 图中使用水平线标记：历史最高价、-80% 点位、当前价。

- **收藏与历史记录**
  - 收藏/取消收藏在结果卡片右上角切换，保存在浏览器 `localStorage` 中；
  - 历史记录自动记录最近查询股票，点击可快速再次查询；
  - 历史记录支持一键清空，不会影响收藏。

---

## 部署到 GitHub / Vercel

### 1. 推送到 GitHub

1. 在 GitHub 上新建一个仓库，例如 `stock-view`。
2. 在本地项目根目录执行（如你还未初始化 git，可执行）：

   ```bash
   cd /Users/abnersun/Downloads/code/stock-view
   git init
   git remote add origin <你的 GitHub 仓库地址>
   git add .
   git commit -m "init stock-view app"
   git push -u origin main
   ```

> 若 `create-next-app` 已自动初始化 git，可直接 `git remote add origin` 然后 push。

### 2. 使用 Vercel 部署（推荐）

1. 打开 Vercel 网站，使用 GitHub 账号登录。
2. 选择「Import Project」，选中刚才的 GitHub 仓库。
3. 保持默认 Next.js 配置，一路确认即可。
4. 部署完成后，会得到一个线上访问地址（如 `https://your-project.vercel.app`）。

> 本项目不需要任何后端环境变量，部署开箱即用，但需要保证 Vercel 使用的 Node 版本满足 Next.js 要求（一般默认即可）。

---

## 接口说明（后端）

- 路径：`/api/stock`
- 方法：`GET`
- 参数：
  - `symbol`：股票代码（字符串，必填），如 `AAPL`、`MSFT`、`000001.SZ`。
- 返回示例（简化）：

  ```json
  {
    "symbol": "AAPL",
    "highest": { "price": 199.99, "time": 1700000000000 },
    "target80": { "price": 40.0 },
    "current": { "price": 120.0, "time": 1730000000000 },
    "expectedDropRatio": 0.5,
    "candles": [
      {
        "time": 1720000000000,
        "open": 110,
        "high": 115,
        "low": 108,
        "close": 112,
        "volume": 1000000
      }
    ]
  }
  ```

- 计算逻辑说明：

  - 历史最高点：近 5 年内所有日 K 收盘价的最大值；
  - -80% 点位：`0.2 * 最高收盘价`；
  - 当前价：K 线中最后一根有效日 K 的收盘价；
  - 预期跌幅比例：

    \[
    \text{expectedDropRatio} =
    \frac{\text{当前收盘价} - 0.2 \times \text{最高收盘价}}
    {0.8 \times \text{最高收盘价}}
    \]

    - 返回值例如 `0.5`，前端会展示为 `50%`。

---

## 注意事项与扩展方向

- 本项目当前使用 Baostock 数据源，请遵守 Baostock 的使用条款及访问频控要求。
- 目前的 K 线展示为「收盘价折线」+ 关键价位水平线，后续可以引入专门的金融图表库（如 `lightweight-charts`、`react-financial-charts` 等）实现完整蜡烛图。
- 收藏与历史记录存储在浏览器本地，不会同步到服务器或不同设备。
