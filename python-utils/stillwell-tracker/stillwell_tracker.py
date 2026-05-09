#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
指数历史追踪器
使用AKShare获取指数数据，生成带买卖点标记的折线图
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import akshare as ak
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Circle
import matplotlib.patches as mpatches
from matplotlib.ticker import FuncFormatter
import numpy as np

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def load_config(json_path: str) -> Dict:
    """加载JSON配置文件"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_index_name(index_code: str) -> str:
    """
    获取指数的中文名称
    
    Args:
        index_code: 指数代码
    
    Returns:
        指数的中文名称，如果获取失败则返回代码本身
    """
    try:
        # 标准化指数代码
        normalized_code = index_code
        if index_code.startswith('sh') or index_code.startswith('sz'):
            normalized_code = index_code[2:]
        
        # 尝试使用AKShare获取指数基本信息
        # 方法1: 尝试获取指数列表并匹配
        try:
            # 获取所有指数列表
            index_list = ak.index_zh_a_hist(symbol=normalized_code, period="daily", 
                                           start_date="20240101", end_date="20240102")
            # 如果成功获取数据，说明代码有效，但可能没有名称字段
            # 继续尝试其他方法
        except:
            pass
        
        # 方法2: 使用常见指数名称映射表（作为后备）
        index_name_map = {
            "000001": "上证指数",
            "000002": "A股指数",
            "000003": "B股指数",
            "000008": "综合指数",
            "000009": "上证380",
            "000010": "上证180",
            "000016": "上证50",
            "000017": "新综指",
            "000300": "沪深300",
            "000905": "中证500",
            "000852": "中证1000",
            "399001": "深证成指",
            "399002": "深成指R",
            "399003": "成分B指",
            "399005": "中小板指",
            "399006": "创业板指",
            "399100": "新指数",
            "399101": "中小板综",
            "399106": "深证综指",
            "399330": "深证100",
            "399673": "创业板50",
            "399967": "中证军工",
            "399971": "中证传媒",
        }
        
        if normalized_code in index_name_map:
            return index_name_map[normalized_code]
        
        # 如果映射表中没有，尝试从AKShare获取
        # 对于中证指数，可以使用 stock_zh_index_hist_csindex
        if normalized_code.startswith('000') or normalized_code.startswith('399'):
            try:
                # 尝试获取指数基本信息
                # 注意：这里可能需要根据AKShare的最新API调整
                return f"指数{normalized_code}"
            except:
                return f"指数{normalized_code}"
        
        return f"指数{normalized_code}"
    
    except Exception as e:
        print(f"获取指数名称时出错: {e}")
        return f"指数{index_code}"


def fetch_index_all_history(index_code: str) -> Optional[pd.DataFrame]:
    """
    获取指数的全量历史数据（从指数成立开始）
    
    Args:
        index_code: 指数代码
    
    Returns:
        DataFrame包含全量历史数据，如果获取失败返回None
    """
    try:
        # 标准化指数代码
        normalized_code = index_code
        if index_code.startswith('sh') or index_code.startswith('sz'):
            normalized_code = index_code[2:]
        
        # 从1990年开始获取（大多数A股指数都是1990年后成立的）
        start_date_all = "19900101"
        end_date = datetime.now().strftime('%Y%m%d')
        
        print(f"正在获取指数 {normalized_code} 的全量历史数据（用于判断历史最高/最低点）...")
        
        # 使用AKShare获取全量历史数据
        df_all = ak.index_zh_a_hist(
            symbol=normalized_code,
            period="daily",
            start_date=start_date_all,
            end_date=end_date
        )
        
        if df_all.empty:
            print("警告: 无法获取全量历史数据，将无法判断是否为历史最高/最低点")
            return None
        
        # 确保日期列为datetime类型
        if '日期' in df_all.columns:
            df_all['日期'] = pd.to_datetime(df_all['日期'])
            df_all = df_all.sort_values('日期')
        else:
            print("警告: 全量历史数据格式异常")
            return None
        
        print(f"成功获取全量历史数据，共 {len(df_all)} 条")
        return df_all
    
    except Exception as e:
        print(f"获取全量历史数据时出错: {e}")
        print("将无法判断是否为历史最高/最低点")
        return None


def fetch_index_data(index_code: str, start_date: str) -> pd.DataFrame:
    """
    使用AKShare获取指数历史数据
    
    Args:
        index_code: 指数代码，如 '000300' (沪深300), '000001' (上证指数), '399001' (深证成指)
        start_date: 开始日期，格式 'YYYY-MM-DD' 或 'YYYYMMDD'
    
    Returns:
        DataFrame包含日期和收盘价
    """
    try:
        # 标准化指数代码（移除sh/sz前缀，AKShare只需要数字部分）
        normalized_code = index_code
        if index_code.startswith('sh') or index_code.startswith('sz'):
            normalized_code = index_code[2:]
        
        # 标准化日期格式为 YYYYMMDD
        if '-' in start_date:
            start_date_formatted = start_date.replace('-', '')
        else:
            start_date_formatted = start_date
        
        # 获取结束日期（今天）
        end_date = datetime.now().strftime('%Y%m%d')
        
        print(f"正在从东方财富获取指数 {normalized_code} 的真实数据（从 {start_date_formatted} 到 {end_date}）...")
        
        # 使用AKShare从东方财富获取指数历史数据（真实数据）
        df = ak.index_zh_a_hist(
            symbol=normalized_code,
            period="daily",
            start_date=start_date_formatted,
            end_date=end_date
        )
        
        if df.empty:
            raise ValueError(f"无法获取指数 {normalized_code} 的数据，请检查代码是否正确")
        
        # 确保日期列为datetime类型
        if '日期' in df.columns:
            df['日期'] = pd.to_datetime(df['日期'])
            df = df.sort_values('日期')
            # 确保从指定开始日期开始
            start_datetime = pd.to_datetime(start_date)
            df = df[df['日期'] >= start_datetime]
        else:
            raise ValueError("数据格式异常：未找到'日期'列")
        
        print(f"成功获取 {len(df)} 条数据")
        return df
    
    except Exception as e:
        print(f"获取数据时出错: {e}")
        print("提示：如果指数代码不正确，请参考AKShare文档")
        print("常见指数代码：")
        print("  - 000300: 沪深300")
        print("  - 000001: 上证指数")
        print("  - 399001: 深证成指")
        raise




def parse_trade_points(trade_points: List[Dict]) -> tuple:
    """
    解析买卖点数据
    
    Returns:
        (buy_points, sell_points) - 每个都是 [(date, price, note), ...]
    """
    buy_points = []
    sell_points = []
    
    for point in trade_points:
        date_str = point['date']
        note = point.get('note', '')
        action = point.get('action', 'buy').lower()
        
        date = pd.to_datetime(date_str)
        
        # 价格会在后续从数据中查找
        if action == 'buy' or action == '买入':
            buy_points.append((date, None, note))
        elif action == 'sell' or action == '卖出':
            sell_points.append((date, None, note))
    
    return buy_points, sell_points


def calculate_annotation_position(date: pd.Timestamp, price: float, action: str,
                                  all_annotations: List[Dict],
                                  date_col: str, price_col: str, df: pd.DataFrame,
                                  point_index: int) -> tuple:
    """
    计算标注的智能位置，避免遮挡（增强版）
    
    Args:
        date: 交易日期
        price: 交易价格
        action: 操作类型（买入/卖出）
        all_annotations: 所有已添加的标注信息列表
        date_col: 日期列名
        price_col: 价格列名
        df: 数据框
        point_index: 当前点在所有买卖点中的索引（用于交替布局）
    
    Returns:
        (x_offset, y_offset, arrow_props, ha, va) - 偏移量、箭头属性和对齐方式
    """
    # 使用数据范围计算
    date_nums = [mdates.date2num(d) for d in df[date_col]]
    x_range = max(date_nums) - min(date_nums) if len(date_nums) > 1 else 1
    y_range = df[price_col].max() - df[price_col].min() if len(df) > 0 else 1
    
    date_num = mdates.date2num(date)
    price_min = df[price_col].min()
    price_max = df[price_col].max()
    price_ratio = (price - price_min) / (price_max - price_min) if price_max > price_min else 0.5
    
    # 定义多个候选位置（按优先级排序）
    # 每个候选位置：(x_offset, y_offset, ha, va, arrow_rad)
    # 使用更大的偏移距离，确保标注之间有足够空间
    candidates = []
    
    # 策略1: 根据价格位置和操作类型选择基础方向
    # 水平偏移调整为100-120像素，垂直偏移减少到60-80像素（更保守）
    if price_ratio > 0.7:  # 价格在上部，标注放在下方
        candidates.extend([
            (110, -70, 'left', 'top', 0.2),      # 右下（优先，较小偏移）
            (-110, -70, 'right', 'top', -0.2),  # 左下
            (110, 70, 'left', 'bottom', 0.2),    # 右上（备选）
            (-110, 70, 'right', 'bottom', -0.2), # 左上（备选）
        ])
    elif price_ratio < 0.3:  # 价格在下部，标注放在上方
        candidates.extend([
            (110, 70, 'left', 'bottom', 0.2),    # 右上（优先，较小偏移）
            (-110, 70, 'right', 'bottom', -0.2), # 左上
            (110, -70, 'left', 'top', 0.2),      # 右下（备选）
            (-110, -70, 'right', 'top', -0.2),  # 左下（备选）
        ])
    else:  # 价格在中间，根据索引和操作类型交替
        # 使用索引来决定位置，确保相邻点不会重叠
        if point_index % 4 == 0:
            # 右上
            candidates.extend([
                (110, 75, 'left', 'bottom', 0.2),
                (-110, 75, 'right', 'bottom', -0.2),
            ])
        elif point_index % 4 == 1:
            # 右下
            candidates.extend([
                (110, -75, 'left', 'top', 0.2),
                (-110, -75, 'right', 'top', -0.2),
            ])
        elif point_index % 4 == 2:
            # 左上
            candidates.extend([
                (-110, 75, 'right', 'bottom', -0.2),
                (110, 75, 'left', 'bottom', 0.2),
            ])
        else:  # point_index % 4 == 3
            # 左下
            candidates.extend([
                (-110, -75, 'right', 'top', -0.2),
                (110, -75, 'left', 'top', 0.2),
            ])
    
    # 检查每个候选位置是否与已有标注冲突
    # 冲突检测：考虑标注框的大致尺寸和最小间距
    annotation_width = 200  # 标注框大致宽度（像素，水平偏移调整为100-150）
    annotation_height = 200  # 标注框大致高度（像素，调整为200）
    min_distance = 100  # 最小间距（像素）- 增大间距避免遮挡
    
    # 检查是否有日期非常接近的点（需要更激进的策略）
    very_close_points = []
    for ann in all_annotations:
        ann_date_num = mdates.date2num(ann['date'])
        date_diff_days = abs((date_num - ann_date_num))
        # 如果日期差异小于60天，认为是非常接近的点
        if date_diff_days < 60:
            very_close_points.append(ann)
    
    # 如果有非常接近的点，扩展候选位置，使用更大的偏移
    if very_close_points:
        # 检查已有标注的位置分布
        right_positions = [ann for ann in very_close_points if ann.get('x_offset', 0) > 0]
        left_positions = [ann for ann in very_close_points if ann.get('x_offset', 0) < 0]
        top_positions = [ann for ann in very_close_points if ann.get('y_offset', 0) > 0]
        bottom_positions = [ann for ann in very_close_points if ann.get('y_offset', 0) < 0]
        
        # 如果右侧已有标注，优先使用左侧；反之亦然
        # 只在必要时使用较大偏移，避免过度偏移
        if len(right_positions) > len(left_positions):
            # 右侧已有标注，优先使用左侧
            candidates = [
                (-110, 90, 'right', 'bottom', -0.2),  # 左上
                (-110, -90, 'right', 'top', -0.2),    # 左下
                (110, 90, 'left', 'bottom', 0.2),     # 右上（备选）
                (110, -90, 'left', 'top', 0.2),       # 右下（备选）
            ]
        elif len(left_positions) > len(right_positions):
            # 左侧已有标注，优先使用右侧
            candidates = [
                (110, 90, 'left', 'bottom', 0.2),     # 右上
                (110, -90, 'left', 'top', 0.2),       # 右下
                (-110, 90, 'right', 'bottom', -0.2),  # 左上（备选）
                (-110, -90, 'right', 'top', -0.2),    # 左下（备选）
            ]
        else:
            # 如果上下分布不均，适度增加垂直偏移
            if len(top_positions) > len(bottom_positions):
                # 上方已有标注，优先使用下方
                candidates = [
                    (110, -100, 'left', 'top', 0.2),   # 右下
                    (-110, -100, 'right', 'top', -0.2), # 左下
                    (110, 100, 'left', 'bottom', 0.2),  # 右上（备选）
                    (-110, 100, 'right', 'bottom', -0.2), # 左上（备选）
                ]
            else:
                # 下方已有标注，优先使用上方
                candidates = [
                    (110, 100, 'left', 'bottom', 0.2),  # 右上
                    (-110, 100, 'right', 'bottom', -0.2), # 左上
                    (110, -100, 'left', 'top', 0.2),    # 右下（备选）
                    (-110, -100, 'right', 'top', -0.2),  # 左下（备选）
                ]
    
    # 首先检查是否有冲突，如果没有冲突，使用更小的偏移量
    has_conflict = False
    for ann in all_annotations:
        ann_date_num = mdates.date2num(ann['date'])
        ann_x_off = ann.get('x_offset', 0)
        ann_y_off = ann.get('y_offset', 0)
        
        # 计算日期差异（转换为像素）
        chart_width_pixels = 1920
        pixels_per_day = chart_width_pixels / max(x_range, 1) if x_range > 0 else 1
        date_diff_pixels = abs(date_num - ann_date_num) * pixels_per_day
        
        # 计算价格差异（转换为像素）
        chart_height_pixels = 1080
        pixels_per_price = chart_height_pixels / max(y_range, 1) if y_range > 0 else 1
        price_diff_pixels = abs(price - ann['price']) * pixels_per_price
        
        # 使用较小的偏移量来检查冲突（100, 60）
        test_x_off = 100 if price_ratio > 0.5 else 100
        test_y_off = 60 if price_ratio > 0.6 else -60
        
        current_center_x = date_diff_pixels + test_x_off
        current_center_y = price_diff_pixels + test_y_off
        ann_center_x = ann_x_off
        ann_center_y = ann_y_off
        
        x_distance = abs(current_center_x - ann_center_x)
        y_distance = abs(current_center_y - ann_center_y)
        
        x_overlap = (annotation_width + min_distance) - x_distance
        y_overlap = (annotation_height + min_distance) - y_distance
        
        if x_overlap > 0 and y_overlap > 0:
            has_conflict = True
            break
    
    # 如果没有冲突，使用更小的偏移量，让标注更靠近买卖点
    if not has_conflict:
        if action == '买入':
            if price_ratio > 0.6:
                best_candidate = (100, -60, 'left', 'top', 0.2)  # 右下，较小偏移
            else:
                best_candidate = (100, 60, 'left', 'bottom', 0.2)  # 右上，较小偏移
        else:  # 卖出
            if price_ratio > 0.6:
                best_candidate = (100, -60, 'left', 'top', 0.2)  # 右下，较小偏移
            else:
                best_candidate = (100, 60, 'left', 'bottom', 0.2)  # 右上，较小偏移
    else:
        # 有冲突，从候选位置中选择冲突最少的
        best_candidate = None
        min_conflicts = float('inf')
        
        for x_off, y_off, ha_cand, va_cand, arrow_rad in candidates:
            conflicts = 0
            max_overlap = 0
            
            for ann in all_annotations:
                ann_date_num = mdates.date2num(ann['date'])
                ann_x_off = ann.get('x_offset', 0)
                ann_y_off = ann.get('y_offset', 0)
                
                chart_width_pixels = 1920
                pixels_per_day = chart_width_pixels / max(x_range, 1) if x_range > 0 else 1
                date_diff_pixels = abs(date_num - ann_date_num) * pixels_per_day
                
                chart_height_pixels = 1080
                pixels_per_price = chart_height_pixels / max(y_range, 1) if y_range > 0 else 1
                price_diff_pixels = abs(price - ann['price']) * pixels_per_price
                
                current_center_x = date_diff_pixels + x_off
                current_center_y = price_diff_pixels + y_off
                ann_center_x = ann_x_off
                ann_center_y = ann_y_off
                
                x_distance = abs(current_center_x - ann_center_x)
                y_distance = abs(current_center_y - ann_center_y)
                
                x_overlap = (annotation_width + min_distance) - x_distance
                y_overlap = (annotation_height + min_distance) - y_distance
                
                if x_overlap > 0 and y_overlap > 0:
                    overlap_area = x_overlap * y_overlap
                    conflicts += overlap_area / 1000
                    max_overlap = max(max_overlap, overlap_area)
            
            score = conflicts + (max_overlap / 10000)
            if score < min_conflicts:
                min_conflicts = score
                best_candidate = (x_off, y_off, ha_cand, va_cand, arrow_rad)
    
    # 如果没有找到合适的候选位置，使用默认位置（较小偏移）
    if best_candidate is None:
        if action == '买入':
            best_candidate = (100, 60, 'left', 'bottom', 0.2)
        else:
            best_candidate = (100, -60, 'left', 'top', 0.2)
    
    x_offset, y_offset, ha, va, arrow_rad = best_candidate
    
    # 箭头属性
    arrow_props = dict(
        arrowstyle='->',
        connectionstyle=f'arc3,rad={arrow_rad}',
        lw=1.5,
        color='gray',
        alpha=0.6
    )
    
    return x_offset, y_offset, arrow_props, ha, va


def build_trade_point_annotation(date: pd.Timestamp, price: float, note: str, 
                                  action: str, all_trade_points: List[Dict],
                                  all_time_max: Optional[float] = None) -> str:
    """
    构建买卖点的标注文本
    
    Args:
        date: 交易日期
        price: 交易价格
        note: 备注信息
        action: 操作类型（买入/卖出）
        all_trade_points: 所有买卖点列表（已按日期排序）
    
    Returns:
        格式化的标注文本
    """
    # 格式化日期
    date_str = date.strftime('%Y-%m-%d')
    
    # 构建第一行：价格点位 + 操作 + 备注
    price_text = f'{price:.2f}'
    if note:
        first_line = f'{price_text}点位{action}{note}'
    else:
        first_line = f'{price_text}点位{action}'
    
    # 查找当前点在所有买卖点中的位置
    current_idx = None
    for idx, point in enumerate(all_trade_points):
        if point['date'] == date and abs(point['price'] - price) < 0.01:
            current_idx = idx
            break
    
    # 如果不是第一个点，计算间隔和涨跌幅
    if current_idx is not None and current_idx > 0:
        prev_point = all_trade_points[current_idx - 1]
        prev_date = prev_point['date']
        prev_price = prev_point['price']
        prev_action = prev_point['action_cn']
        
        # 计算间隔天数
        days_diff = (date - prev_date).days
        
        # 计算涨跌幅
        if prev_price > 0:
            change_pct = ((price - prev_price) / prev_price) * 100
            # 格式化涨跌幅，保留整数或一位小数
            if abs(change_pct) >= 1:
                change_pct_str = f'{change_pct:.1f}'
            else:
                change_pct_str = f'{change_pct:.2f}'
            
            if change_pct >= 0:
                change_text = f'升幅为 +{change_pct_str}%'
            else:
                change_text = f'降幅为 {change_pct_str}%'
        else:
            change_text = '无法计算涨跌幅'
        
        # 构建完整标注（间隔和涨跌幅分行显示）
        annotation_text = f'{first_line}\n日期：{date_str}\n距离上一次{prev_action}间隔{days_diff}天\n{change_text}'
    else:
        # 第一个点，只显示基本信息
        annotation_text = f'{first_line}\n日期：{date_str}'
    
    # 如果是买入点，添加距离历史最高点的跌幅
    if action == '买入' and all_time_max is not None and all_time_max > 0:
        drop_from_high = ((price - all_time_max) / all_time_max) * 100
        if drop_from_high < 0:  # 只显示跌幅（负数）
            drop_text = f'距离历史最高点跌幅为 {drop_from_high:.1f}%'
            annotation_text = f'{annotation_text}\n{drop_text}'
    
    return annotation_text


def find_price_for_date(df: pd.DataFrame, target_date: pd.Timestamp) -> Optional[float]:
    """在数据框中查找指定日期对应的收盘价"""
    # 尝试精确匹配
    if '日期' in df.columns:
        date_col = '日期'
        price_col = '收盘' if '收盘' in df.columns else df.columns[-1]
    elif 'date' in df.columns:
        date_col = 'date'
        price_col = 'close' if 'close' in df.columns else df.columns[-1]
    else:
        date_col = df.columns[0]
        price_col = df.columns[-1]
    
    # 精确匹配
    exact_match = df[df[date_col].dt.date == target_date.date()]
    if not exact_match.empty:
        return float(exact_match.iloc[0][price_col])
    
    # 如果精确匹配失败，找最近的交易日
    df_sorted = df.sort_values(date_col)
    after_dates = df_sorted[df_sorted[date_col] >= target_date]
    if not after_dates.empty:
        return float(after_dates.iloc[0][price_col])
    
    before_dates = df_sorted[df_sorted[date_col] <= target_date]
    if not before_dates.empty:
        return float(before_dates.iloc[-1][price_col])
    
    return None


def create_chart(df: pd.DataFrame, buy_points: List, sell_points: List, 
                 index_code: str, index_name: str, output_path: str,
                 df_all_history: Optional[pd.DataFrame] = None,
                 key_points: Optional[Dict] = None):
    """
    创建折线图，参考Ant Design Charts样式
    
    Args:
        df: 包含日期和价格的数据框
        buy_points: 买入点列表 [(date, price, note), ...]
        sell_points: 卖出点列表 [(date, price, note), ...]
        index_code: 指数代码
        output_path: 输出文件路径
        df_all_history: 全量历史数据（用于判断历史最高/最低点）
        key_points: 关键点位配置，包含pressure_level和support_level数组
    """
    # 确定日期和价格列
    if '日期' in df.columns:
        date_col = '日期'
        price_col = '收盘' if '收盘' in df.columns else df.columns[-1]
    elif 'date' in df.columns:
        date_col = 'date'
        price_col = 'close' if 'close' in df.columns else df.columns[-1]
    else:
        date_col = df.columns[0]
        price_col = df.columns[-1]
    
    # 创建图表，参考Ant Design Charts的简洁风格
    # 固定宽度为3840像素，DPI设置为200，高度保持16:9比例（2160像素）
    chart_dpi = 200
    width_inches = 3840 / chart_dpi  # 19.2英寸
    height_inches = 2160 / chart_dpi  # 10.8英寸（16:9比例）
    fig, ax = plt.subplots(figsize=(width_inches, height_inches), dpi=chart_dpi)
    fig.patch.set_facecolor('white')
    ax.set_facecolor('#fafafa')
    
    # 绘制折线图 - 使用Ant Design Charts的蓝色调
    line_color = '#1890ff'  # Ant Design主色
    ax.plot(df[date_col], df[price_col], 
            color=line_color, 
            linewidth=2.5,
            alpha=0.9,
            label='指数价格')
    
    # 填充区域（浅色背景）
    ax.fill_between(df[date_col], df[price_col], 
                    alpha=0.1, 
                    color=line_color)
    
    # 合并所有买卖点，按日期排序，用于计算间隔和涨跌幅
    all_trade_points = []
    for date, price, note in buy_points:
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            all_trade_points.append({
                'date': date,
                'price': price,
                'note': note,
                'action': 'buy',
                'action_cn': '买入'
            })
    
    for date, price, note in sell_points:
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            all_trade_points.append({
                'date': date,
                'price': price,
                'note': note,
                'action': 'sell',
                'action_cn': '卖出'
            })
    
    # 按日期排序
    all_trade_points.sort(key=lambda x: x['date'])
    
    # 获取历史最高点和最低点信息（用于标题和标注）
    all_time_max = None
    all_time_max_date = None
    all_time_min = None
    all_time_min_date = None
    
    if df_all_history is not None and not df_all_history.empty:
        # 确定全量历史数据的价格列
        if '收盘' in df_all_history.columns:
            all_price_col = '收盘'
            all_date_col = '日期'
        else:
            all_price_col = df_all_history.columns[-1]
            all_date_col = df_all_history.columns[0]
        
        # 获取全量历史数据的最高和最低价格
        all_time_max = df_all_history[all_price_col].max()
        all_time_min = df_all_history[all_price_col].min()
        all_time_max_date = df_all_history.loc[df_all_history[all_price_col].idxmax(), all_date_col]
        all_time_min_date = df_all_history.loc[df_all_history[all_price_col].idxmin(), all_date_col]
    
    # 存储所有标注信息，用于计算位置
    all_annotations = []
    
    # 合并所有买卖点，按日期排序，用于计算索引
    all_points_sorted = []
    for date, price, note in buy_points:
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            all_points_sorted.append(('买入', date, price, note))
    for date, price, note in sell_points:
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            all_points_sorted.append(('卖出', date, price, note))
    all_points_sorted.sort(key=lambda x: x[1])  # 按日期排序
    
    # 标记买入点（绿色）
    buy_color = '#52c41a'  # Ant Design成功色（绿色）
    for i, (date, price, note) in enumerate(buy_points):
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            # 找到当前点在所有点中的索引
            point_index = next((idx for idx, (act, dt, _, _) in enumerate(all_points_sorted) 
                               if act == '买入' and dt == date), i)
            
            # 绘制价格水平参考线（虚线）
            ax.axhline(y=price, color=buy_color, linestyle='--', 
                      linewidth=1, alpha=0.3, zorder=1)
            
            # 绘制买入点
            ax.scatter([date], [price], 
                      color=buy_color, 
                      s=120, 
                      zorder=5,
                      edgecolors='white',
                      linewidths=2,
                      label='买入' if i == 0 else '')
            
            # 构建标注文本（传入历史最高点）
            annotation_text = build_trade_point_annotation(
                date, price, note, '买入', all_trade_points, all_time_max
            )
            
            # 计算智能位置（传入点索引）
            x_offset, y_offset, arrow_props, ha, va = calculate_annotation_position(
                date, price, '买入', all_annotations, date_col, price_col, df, point_index
            )
            
            # 添加价格和备注标注（使用箭头连接）
            # 标注框高度调整为200像素（通过增加pad实现）
            ann = ax.annotate(annotation_text, 
                       xy=(date, price), 
                       xytext=(x_offset, y_offset),
                       textcoords='offset points',
                       fontsize=8,
                       bbox=dict(boxstyle='round,pad=1.8', 
                               facecolor='white', 
                               edgecolor=buy_color,
                               alpha=0.95,
                               linewidth=1.5),
                       ha=ha,
                       va=va,
                       arrowprops=arrow_props,
                       zorder=10)
            
            # 记录标注信息
            all_annotations.append({
                'date': date,
                'price': price,
                'x_offset': x_offset,
                'y_offset': y_offset
            })
    
    # 标记卖出点（红色）
    sell_color = '#ff4d4f'  # Ant Design错误色（红色）
    for i, (date, price, note) in enumerate(sell_points):
        if price is None:
            price = find_price_for_date(df, date)
        if price is not None:
            # 找到当前点在所有点中的索引
            point_index = next((idx for idx, (act, dt, _, _) in enumerate(all_points_sorted) 
                               if act == '卖出' and dt == date), len(buy_points) + i)
            
            # 绘制价格水平参考线（虚线）
            ax.axhline(y=price, color=sell_color, linestyle='--', 
                      linewidth=1, alpha=0.3, zorder=1)
            
            # 绘制卖出点
            ax.scatter([date], [price], 
                      color=sell_color, 
                      s=120, 
                      zorder=5,
                      edgecolors='white',
                      linewidths=2,
                      label='卖出' if i == 0 else '')
            
            # 构建标注文本
            annotation_text = build_trade_point_annotation(
                date, price, note, '卖出', all_trade_points, all_time_max
            )
            
            # 计算智能位置（传入点索引）
            x_offset, y_offset, arrow_props, ha, va = calculate_annotation_position(
                date, price, '卖出', all_annotations, date_col, price_col, df, point_index
            )
            
            # 添加价格和备注标注（使用箭头连接）
            # 标注框高度调整为200像素（通过增加pad实现）
            ann = ax.annotate(annotation_text, 
                       xy=(date, price), 
                       xytext=(x_offset, y_offset),
                       textcoords='offset points',
                       fontsize=8,
                       bbox=dict(boxstyle='round,pad=1.8', 
                               facecolor='white', 
                               edgecolor=sell_color,
                               alpha=0.95,
                               linewidth=1.5),
                       ha=ha,
                       va=va,
                       arrowprops=arrow_props,
                       zorder=10)
            
            # 记录标注信息
            all_annotations.append({
                'date': date,
                'price': price,
                'x_offset': x_offset,
                'y_offset': y_offset
            })
    
    # 设置标题和标签（显示中文名称和代码）
    title = f'{index_name} ({index_code}) 历史走势图'
    
    # 在标题上方添加历史最高点和最低点信息
    if all_time_max is not None and all_time_min is not None:
        max_date_str = all_time_max_date.strftime('%Y-%m-%d') if hasattr(all_time_max_date, 'strftime') else str(all_time_max_date)
        min_date_str = all_time_min_date.strftime('%Y-%m-%d') if hasattr(all_time_min_date, 'strftime') else str(all_time_min_date)
        subtitle = f'历史最高点：{all_time_max:.2f}（{max_date_str}） | 历史最低点：{all_time_min:.2f}（{min_date_str}）'
        ax.text(0.5, 1.02, subtitle, 
               transform=ax.transAxes,
               fontsize=11,
               ha='center',
               va='bottom',
               color='#666666')
    
    ax.set_title(title, 
                fontsize=16, 
                fontweight='bold',
                pad=27)
    ax.set_xlabel('日期', fontsize=12)
    ax.set_ylabel('价格', fontsize=12)
    
    # 格式化X轴日期
    ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
    
    # 格式化Y轴价格（添加千分位，保留2位小数）
    def format_price(value, pos):
        if value >= 1000:
            return f'{value:,.0f}'
        else:
            return f'{value:.2f}'
    
    ax.yaxis.set_major_formatter(FuncFormatter(format_price))
    
    # 增强网格线（水平线更明显，方便读取价格）
    ax.grid(True, 
           linestyle='--', 
           linewidth=0.5, 
           alpha=0.4,
           color='#d9d9d9',
           which='major')
    # 添加更明显的水平网格线
    ax.grid(True, which='major', axis='y', 
          linestyle='-', linewidth=0.3, alpha=0.2, color='#bfbfbf')
    
    # 标注关键价格点（最高点、最低点、当前点）
    max_price = df[price_col].max()
    min_price = df[price_col].min()
    current_price = df[price_col].iloc[-1]
    max_date = df.loc[df[price_col].idxmax(), date_col]
    min_date = df.loc[df[price_col].idxmin(), date_col]
    current_date = df[date_col].iloc[-1]
    
    # 判断是否为历史最高/最低点
    is_historical_max = False
    is_historical_min = False
    
    if all_time_max is not None and all_time_min is not None:
        # 判断当前区间的最高/最低点是否为历史最高/最低点
        # 使用小的容差值来比较浮点数（避免精度问题）
        tolerance = 0.01
        if abs(max_price - all_time_max) < tolerance:
            is_historical_max = True
        if abs(min_price - all_time_min) < tolerance:
            is_historical_min = True
    
    # 标注最高点
    max_label = '历史最高点' if is_historical_max else '区间最高点'
    ax.scatter([max_date], [max_price], 
              color='#faad14', s=80, zorder=4,
              edgecolors='white', linewidths=1.5,
              marker='^', label=max_label)
    ax.annotate(f'{max_label}: {max_price:.2f}', 
               xy=(max_date, max_price), 
               xytext=(10, 10),
               textcoords='offset points',
               fontsize=8,
               bbox=dict(boxstyle='round,pad=0.3', 
                       facecolor='#fffbe6', 
                       edgecolor='#faad14',
                       alpha=0.8))
    
    # 标注最低点
    min_label = '历史最低点' if is_historical_min else '区间最低点'
    ax.scatter([min_date], [min_price], 
              color='#722ed1', s=80, zorder=4,
              edgecolors='white', linewidths=1.5,
              marker='v', label=min_label)
    ax.annotate(f'{min_label}: {min_price:.2f}', 
               xy=(min_date, min_price), 
               xytext=(10, -15),
               textcoords='offset points',
               fontsize=8,
               bbox=dict(boxstyle='round,pad=0.3', 
                       facecolor='#f9f0ff', 
                       edgecolor='#722ed1',
                       alpha=0.8))
    
    # 标注当前点（最新价格）
    ax.scatter([current_date], [current_price], 
              color='#1890ff', s=100, zorder=4,
              edgecolors='white', linewidths=2,
              marker='o', label='当前价格')
    ax.annotate(f'当前: {current_price:.2f}', 
               xy=(current_date, current_price), 
               xytext=(-10, 15),
               textcoords='offset points',
               fontsize=9,
               fontweight='bold',
               bbox=dict(boxstyle='round,pad=0.4', 
                       facecolor='#e6f7ff', 
                       edgecolor='#1890ff',
                       alpha=0.9,
                       linewidth=1.5))
    
    # 图例
    ax.legend(loc='upper left', 
             frameon=True, 
             fancybox=True, 
             shadow=True,
             fontsize=10)
    
    # 在所有内容绘制完成后，调整X轴和Y轴范围，减少留白
    # 获取数据的日期范围
    data_min_date = df[date_col].min()
    data_max_date = df[date_col].max()
    date_range = (data_max_date - data_min_date).days
    
    # 计算合适的边距：数据范围的2-3%，为标注留出少量空间
    # 减少留白，但保留一些空间给标注
    margin_days = max(date_range * 0.02, 7)  # 至少7天，最多数据范围的2%
    
    # 设置X轴范围，稍微扩展一点以容纳标注
    ax.set_xlim(data_min_date - pd.Timedelta(days=margin_days), 
                data_max_date + pd.Timedelta(days=margin_days))
    
    # 调整Y轴范围，也稍微减少上下留白
    data_price_min = df[price_col].min()
    data_price_max = df[price_col].max()
    price_range = data_price_max - data_price_min
    price_margin = price_range * 0.03  # Y轴留3%的边距（减少到3%）
    ax.set_ylim(data_price_min - price_margin, data_price_max + price_margin)
    
    # 绘制关键点位：压力位和支撑位（在设置轴范围之后，确保标签能正确显示）
    if key_points:
        pressure_levels = key_points.get('pressure_level', [])
        support_levels = key_points.get('support_level', [])
        
        # 获取扩展后的X轴最大值，用于定位标签
        label_x_position = data_max_date + pd.Timedelta(days=margin_days * 0.8)
        
        # 绘制压力位（红色点划线，更粗，区别于买卖点的虚线）
        pressure_color = '#ff4d4f'  # Ant Design错误色（红色）
        for i, level_str in enumerate(pressure_levels):
            try:
                level = float(level_str)
                # 使用点划线样式，线宽更粗，透明度更高，以区别于买卖点的虚线
                ax.axhline(y=level, color=pressure_color, linestyle='-.', 
                          linewidth=2, alpha=0.6, zorder=2)
                # 添加标签，在图表最右侧显示
                ax.text(label_x_position, level, f'压力位 {level:.2f}', 
                       fontsize=9,
                       color=pressure_color,
                       va='center',
                       ha='left',
                       bbox=dict(boxstyle='round,pad=0.3', 
                               facecolor='#fff1f0', 
                               edgecolor=pressure_color,
                               alpha=0.8,
                               linewidth=1),
                       zorder=10)
            except (ValueError, TypeError):
                print(f"警告: 无法解析压力位数值: {level_str}")
        
        # 绘制支撑位（绿色点划线，更粗，区别于买卖点的虚线）
        support_color = '#52c41a'  # Ant Design成功色（绿色）
        for i, level_str in enumerate(support_levels):
            try:
                level = float(level_str)
                # 使用点划线样式，线宽更粗，透明度更高，以区别于买卖点的虚线
                ax.axhline(y=level, color=support_color, linestyle='-.', 
                          linewidth=2, alpha=0.6, zorder=2)
                # 添加标签，在图表最右侧显示
                ax.text(label_x_position, level, f'支撑位 {level:.2f}', 
                       fontsize=9,
                       color=support_color,
                       va='center',
                       ha='left',
                       bbox=dict(boxstyle='round,pad=0.3', 
                               facecolor='#f6ffed', 
                               edgecolor=support_color,
                               alpha=0.8,
                               linewidth=1),
                       zorder=10)
            except (ValueError, TypeError):
                print(f"警告: 无法解析支撑位数值: {level_str}")
    
    # 调整布局 - 减少整个画布的留白
    # 使用subplots_adjust手动控制边距，让图表占据更多画布空间
    plt.subplots_adjust(
        left=0.06,      # 左边距（减少）
        right=0.98,     # 右边距（减少）
        top=0.95,       # 上边距（减少）
        bottom=0.10,    # 下边距（减少，为X轴标签留空间）
        hspace=0,       # 水平间距
        wspace=0        # 垂直间距
    )
    
    # 保存图片（使用与创建时相同的DPI，确保宽度为3840像素）
    # 使用bbox_inches='tight'进一步裁剪空白边缘
    plt.savefig(output_path, dpi=chart_dpi, bbox_inches='tight', 
                facecolor='white', pad_inches=0.1)
    print(f"图表已保存到: {output_path} (画布尺寸: 3840x2160像素)")
    
    plt.close()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='指数历史追踪器')
    parser.add_argument('config', 
                       type=str, 
                       nargs='?',
                       default=None,
                       help='JSON配置文件路径（可选，默认使用当前目录下的tracker_config.json）')
    parser.add_argument('-o', '--output', 
                       type=str, 
                       default=None,
                       help='输出图片路径（默认：仓库根 artifacts/python-utils/stillwell-tracker/{配置基名}_chart.png）')
    
    args = parser.parse_args()
    
    # 确定配置文件路径
    if args.config:
        config_path = args.config
    else:
        # 默认使用当前目录下的 tracker_config.json
        current_dir = os.getcwd()
        config_path = os.path.join(current_dir, 'tracker_config.json')
    
    # 检查配置文件是否存在
    if not os.path.exists(config_path):
        print(f"错误: 配置文件不存在: {config_path}")
        print(f"请确保 tracker_config.json 文件存在于当前目录: {os.getcwd()}")
        import sys
        sys.exit(1)
    
    config = load_config(config_path)
    
    # 解析配置
    index_code = config['index_code']
    start_date = config['start_date']
    trade_points = config.get('trade_points', [])
    # 解析关键点位配置（key_points可能是数组，取第一个元素）
    key_points_config = None
    if 'key_points' in config and config['key_points']:
        if isinstance(config['key_points'], list) and len(config['key_points']) > 0:
            key_points_config = config['key_points'][0]
        elif isinstance(config['key_points'], dict):
            key_points_config = config['key_points']
    
    # 确定输出路径
    if args.output:
        output_path = args.output
    else:
        base_name = os.path.splitext(os.path.basename(config_path))[0]
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        out_dir = os.path.join(repo_root, 'artifacts', 'python-utils', 'stillwell-tracker')
        os.makedirs(out_dir, exist_ok=True)
        output_path = os.path.join(out_dir, f"{base_name}_chart.png")
    
    # 获取指数中文名称
    print("正在获取指数中文名称...")
    index_name = get_index_name(index_code)
    print(f"指数名称: {index_name}")
    
    # 获取区间数据
    try:
        df = fetch_index_data(index_code, start_date)
        if df.empty:
            print("错误: 无法获取数据")
            return
    except Exception as e:
        print(f"错误: {e}")
        return
    
    # 获取全量历史数据（用于判断历史最高/最低点）
    df_all_history = fetch_index_all_history(index_code)
    
    # 解析买卖点
    buy_points, sell_points = parse_trade_points(trade_points)
    
    # 为买卖点查找对应的价格
    buy_points_with_price = []
    for date, _, note in buy_points:
        price = find_price_for_date(df, date)
        if price:
            buy_points_with_price.append((date, price, note))
    
    sell_points_with_price = []
    for date, _, note in sell_points:
        price = find_price_for_date(df, date)
        if price:
            sell_points_with_price.append((date, price, note))
    
    # 创建图表
    create_chart(df, buy_points_with_price, sell_points_with_price, 
                index_code, index_name, output_path,
                df_all_history=df_all_history,
                key_points=key_points_config)
    
    print("完成!")


if __name__ == '__main__':
    main()
