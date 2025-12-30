# AKShare 数据服务使用说明

## 概述

项目已配置为使用 AKShare 作为唯一数据源。AKShare 通过 Python API 服务提供数据，如果 Python 服务不可用，会自动 fallback 到东方财富接口（AKShare 底层也是调用这些接口）。

## Python API 服务

### 启动服务

```bash
# 安装依赖
pip install -r requirements.txt

# 启动 Flask API 服务
python api_server.py
```

服务将在 `http://localhost:5000` 启动。

### 环境变量

可以通过环境变量 `AKSHARE_API_URL` 配置 Python API 服务的地址：

```bash
export AKSHARE_API_URL=http://localhost:5000
```

### API 接口

#### 获取指数数据

```
GET /api/akshare/index?symbol=000300&period=daily
```

参数：
- `symbol`: 指数代码（如 000300, 399001, 930955）
- `period`: 数据周期（daily/weekly/monthly），默认 daily

#### 获取股票数据

```
GET /api/akshare/stock?symbol=000001&period=daily
```

参数：
- `symbol`: 股票代码（如 000001, 600000）
- `period`: 数据周期（daily/weekly/monthly），默认 daily

## 交易日规则

所有接口都实现了交易日判断逻辑：

- **交易时间内（9:30-11:30, 13:00-15:00）**：展示上一个交易日的价格
- **收盘后（15:00之后）**：展示当天交易日的价格

这个规则在以下位置实现：
1. Python API 服务（`api_server.py`）
2. TypeScript 数据获取函数（`src/lib/stock-fetcher.ts`）
3. API 路由处理（`src/app/api/stock/route.ts`）

## 数据源

- **主数据源**：AKShare Python API 服务
- **备用数据源**：东方财富接口（当 Python 服务不可用时自动切换）

## 注意事项

1. 确保 Python 环境已安装 AKShare 和相关依赖
2. Python API 服务需要与 Next.js 应用在同一网络或可访问的网络中
3. 如果 Python 服务不可用，系统会自动 fallback 到东方财富接口，确保服务可用性

