# 指数历史追踪器 (Index Tracker)

使用 AKShare 获取指数历史数据，生成带买卖点标记的折线图。

## 功能特性

- 📊 从指定开始日期获取指数历史数据
- 📈 生成美观的折线图（参考 Ant Design Charts 样式）
- 🟢 绿色圆点标记买入点
- 🔴 红色圆点标记卖出点
- 📝 支持为每个买卖点添加备注信息
- 💾 图表可保存为高清 PNG 图片
- 🎯 **价格标注**：买卖点显示具体价格数值
- 📊 **关键点标注**：自动标注最高点、最低点、当前价格

## 环境要求

- Python 3.7+
- 依赖包：
  - `akshare` - 获取指数数据
  - `pandas` - 数据处理
  - `matplotlib` - 图表绘制

## 安装依赖

```bash
# 在项目根目录执行
pip install akshare pandas matplotlib

# 或者使用 requirements.txt
pip install -r ../../requirements.txt
```

## 配置文件格式

JSON 配置文件应包含以下字段：

```json
{
  "index_code": "指数代码",
  "start_date": "开始日期 (YYYY-MM-DD)",
  "trade_points": [
    {
      "date": "交易日期 (YYYY-MM-DD)",
      "action": "buy 或 sell",
      "note": "备注信息（可选）"
    }
  ]
}
```

### 字段说明

- `index_code`: 指数代码，例如：

  - `000300` - 沪深 300
  - `000001` - 上证指数
  - `399001` - 深证成指
  - 也支持带前缀格式：`sh000300`、`sz399001`（会自动处理）
  - 更多代码请参考 AKShare 文档

- `start_date`: 数据查询的开始日期，格式 `YYYY-MM-DD`

- `trade_points`: 买卖点数组
  - `date`: 交易日期，格式 `YYYY-MM-DD`
  - `action`: 操作类型，`buy`（买入）或 `sell`（卖出）
  - `note`: 备注信息（可选），会显示在图表上

## 使用方法

### 基本用法（推荐）

```bash
# 在 stillwell-tracker 目录下执行
# 脚本会自动加载当前目录下的 tracker_config.json
cd python-utils/stillwell-tracker
python index_tracker.py
```

**注意**：如果 `tracker_config.json` 不存在，脚本会报错并退出。

### 指定配置文件（可选）

```bash
# 如果配置文件在其他位置
python index_tracker.py /path/to/your/config.json
```

### 指定输出路径

```bash
python index_tracker.py -o output/chart.png
```

### 完整路径示例

```bash
# 从项目根目录执行
cd python-utils/stillwell-tracker
python index_tracker.py -o output/chart.png
```

## 输出说明

- 默认情况下，图表会保存在与 JSON 配置文件相同的目录下
- 文件名格式：`{配置文件名}_chart.png`（如果使用默认配置，则为 `tracker_config_chart.png`）
- 图片分辨率：300 DPI，适合打印和展示
- 图表样式参考 Ant Design Charts，包含：
  - 蓝色折线图
  - 绿色买入点标记（带价格数值）
  - 红色卖出点标记（带价格数值）
  - 价格水平参考线（从买卖点延伸到Y轴）
  - 浅色网格背景
  - 日期格式化显示
  - 关键价格点标注（最高/最低/当前）
  - **图表标题显示指数的中文名称和代码**（如：中证传媒 (399971) 历史走势图）

## 示例

查看 `tracker_config.json` 了解配置格式。

运行示例：

```bash
cd python-utils/stillwell-tracker
# 确保 tracker_config.json 存在
python index_tracker.py
```

脚本会：

1. 自动加载当前目录下的 `tracker_config.json`
2. 从东方财富获取真实的指数历史数据
3. 获取指数的中文名称
4. 生成带买卖点标记的折线图，标题显示中文名称

## 注意事项

1. **指数代码格式**：AKShare 的指数代码可能需要特定格式，如果遇到数据获取失败，请检查：

   - 代码是否正确（如 `sh000300` 而不是 `000300`）
   - 网络连接是否正常
   - AKShare 版本是否最新

2. **日期格式**：所有日期必须使用 `YYYY-MM-DD` 格式

3. **买卖点日期**：如果指定的买卖点日期不是交易日，脚本会自动查找最近的交易日价格

4. **数据获取**：首次运行可能需要下载数据，请耐心等待

## 故障排除

### 无法获取数据

如果遇到数据获取失败：

1. 检查网络连接
2. 更新 AKShare：`pip install --upgrade akshare`
3. 检查指数代码是否正确（使用数字格式，如 `000300` 而不是 `sh000300`）
4. 确认日期格式为 `YYYY-MM-DD`
5. 查看 AKShare 官方文档获取最新的 API 用法

**常见指数代码参考**：

- `000300` - 沪深 300
- `000001` - 上证指数
- `399001` - 深证成指
- `399006` - 创业板指

### 中文显示问题

如果图表中文显示为方块：

1. 确保系统安装了中文字体
2. 在脚本中修改 `plt.rcParams['font.sans-serif']` 为系统可用字体

### 依赖安装问题

如果安装依赖时遇到问题：

```bash
# 使用国内镜像源
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple akshare pandas matplotlib
```

## 扩展功能

可以修改脚本添加以下功能：

- 支持多个指数对比
- 添加技术指标（MA、MACD 等）
- 导出为 PDF 格式
- 交互式图表（使用 plotly）

## 许可证

本项目遵循项目主仓库的许可证。
