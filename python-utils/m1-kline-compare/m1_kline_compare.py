#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
M1货币供应量和大盘K线对比图
使用AKShare获取数据，生成自1993年以来的双折线图（月度数据）
参考 Ant Design Charts 双折线图样式
"""

import os
from datetime import datetime
from typing import Optional
import akshare as ak
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter
import numpy as np

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


def fetch_m1_data() -> pd.DataFrame:
    """
    获取M1货币供应量月度数据（自1993年以来）
    
    Returns:
        DataFrame包含日期和M1货币供应量（单位：亿元）
    """
    try:
        print("正在获取M1货币供应量数据...")
        
        # 使用AKShare获取货币供应量数据
        # macro_china_money_supply 返回M0、M1、M2数据
        df = ak.macro_china_money_supply()
        
        if df.empty:
            raise ValueError("无法获取M1货币供应量数据")
        
        # 确保日期列为datetime类型
        if '月份' in df.columns:
            date_col = '月份'
        elif '日期' in df.columns:
            date_col = '日期'
        else:
            # 尝试第一列作为日期
            date_col = df.columns[0]
        
        # 转换日期格式：处理 "2025年12月份" 这样的格式
        def parse_chinese_date(date_str):
            """解析中文日期格式，如 '2025年12月份' -> datetime"""
            try:
                # 移除 "月份" 后缀
                date_str = str(date_str).replace('月份', '')
                # 分割年月
                if '年' in date_str:
                    year, month = date_str.split('年')
                    # 移除可能的空格和特殊字符
                    month = month.strip()
                    # 转换为标准格式
                    return pd.to_datetime(f"{year}-{month.zfill(2)}-01")
                else:
                    return pd.to_datetime(date_str, errors='coerce')
            except:
                return pd.NaT
        
        df[date_col] = df[date_col].apply(parse_chinese_date)
        df = df.dropna(subset=[date_col])
        
        # 查找M1列：实际列名是 '货币(M1)-数量(亿元)'
        m1_col = None
        for col in df.columns:
            col_str = str(col)
            # 匹配 '货币(M1)-数量(亿元)' 或包含 M1 的列
            if '货币(M1)' in col_str or ('M1' in col_str.upper() and '数量' in col_str):
                m1_col = col
                break
        
        if m1_col is None:
            # 如果找不到M1列，尝试查找包含"货币"和"M1"的列
            for col in df.columns:
                col_str = str(col).upper()
                if 'M1' in col_str or ('货币' in col_str and '1' in col_str):
                    m1_col = col
                    break
        
        if m1_col is None:
            raise ValueError(f"无法找到M1货币供应量列，可用列: {df.columns.tolist()}")
        
        # 筛选1993年以来的数据（如果数据源有更早的数据）
        # 注意：AKShare的macro_china_money_supply()通常只提供2008年之后的数据
        start_date = pd.to_datetime('1993-01-01')
        actual_start = df[date_col].min()
        if actual_start > start_date:
            print(f"注意: M1数据从 {actual_start.strftime('%Y-%m')} 开始（数据源限制）")
            # 使用实际最早的数据作为起点
            df = df[df[date_col] >= actual_start].copy()
        else:
            df = df[df[date_col] >= start_date].copy()
        df = df.sort_values(date_col)
        
        # 重命名列以便后续使用
        df = df.rename(columns={date_col: '日期', m1_col: 'M1'})
        
        # 确保M1列为数值类型
        df['M1'] = pd.to_numeric(df['M1'], errors='coerce')
        df = df.dropna(subset=['M1'])
        
        print(f"成功获取M1数据，共 {len(df)} 条记录")
        print(f"数据范围: {df['日期'].min()} 至 {df['日期'].max()}")
        
        return df[['日期', 'M1']]
    
    except Exception as e:
        print(f"获取M1数据时出错: {e}")
        print("尝试使用备用方法...")
        
        # 备用方法：尝试其他AKShare函数
        try:
            # 尝试使用 tool_em_lbsz 获取货币供应量
            df = ak.tool_em_lbsz()
            if not df.empty and 'M1' in df.columns:
                df['日期'] = pd.to_datetime(df['日期'], errors='coerce')
                df = df.dropna(subset=['日期'])
                start_date = pd.to_datetime('1993-01-01')
                df = df[df['日期'] >= start_date].copy()
                df = df.sort_values('日期')
                return df[['日期', 'M1']]
        except:
            pass
        
        raise


def fetch_index_monthly_data(index_code: str = '000001') -> pd.DataFrame:
    """
    获取大盘指数月度数据（自1993年以来）
    
    Args:
        index_code: 指数代码，默认 '000001' (上证指数)
    
    Returns:
        DataFrame包含日期和收盘价（月度数据）
    """
    try:
        print(f"正在获取指数 {index_code} 的月度数据...")
        
        # 标准化指数代码
        normalized_code = index_code
        if index_code.startswith('sh') or index_code.startswith('sz'):
            normalized_code = index_code[2:]
        
        # 从1993年开始获取日线数据
        start_date = '19930101'
        end_date = datetime.now().strftime('%Y%m%d')
        
        # 获取日线数据
        df = ak.index_zh_a_hist(
            symbol=normalized_code,
            period="daily",
            start_date=start_date,
            end_date=end_date
        )
        
        if df.empty:
            raise ValueError(f"无法获取指数 {normalized_code} 的数据")
        
        # 确保日期列为datetime类型
        if '日期' in df.columns:
            df['日期'] = pd.to_datetime(df['日期'])
            df = df.sort_values('日期')
        else:
            raise ValueError("数据格式异常：未找到'日期'列")
        
        # 转换为月度数据：取每月最后一个交易日的收盘价
        df['年月'] = df['日期'].dt.to_period('M')
        monthly_df = df.groupby('年月').agg({
            '收盘': 'last',
            '日期': 'last'
        }).reset_index()
        
        # 使用每月最后一个交易日的日期
        monthly_df['日期'] = pd.to_datetime(monthly_df['日期'])
        monthly_df = monthly_df.rename(columns={'收盘': '收盘价'})
        monthly_df = monthly_df[['日期', '收盘价']]
        
        print(f"成功获取指数月度数据，共 {len(monthly_df)} 条记录")
        print(f"数据范围: {monthly_df['日期'].min()} 至 {monthly_df['日期'].max()}")
        
        return monthly_df
    
    except Exception as e:
        print(f"获取指数数据时出错: {e}")
        raise


def merge_data(m1_df: pd.DataFrame, index_df: pd.DataFrame) -> pd.DataFrame:
    """
    合并M1和指数数据，按月份对齐
    
    Args:
        m1_df: M1数据DataFrame
        index_df: 指数数据DataFrame
    
    Returns:
        合并后的DataFrame
    """
    # 确保日期列为datetime类型
    m1_df['日期'] = pd.to_datetime(m1_df['日期'])
    index_df['日期'] = pd.to_datetime(index_df['日期'])
    
    # 将日期转换为月份（月初）
    m1_df['月份'] = m1_df['日期'].dt.to_period('M').dt.to_timestamp()
    index_df['月份'] = index_df['日期'].dt.to_period('M').dt.to_timestamp()
    
    # 按月份合并
    merged_df = pd.merge(
        m1_df[['月份', 'M1']],
        index_df[['月份', '收盘价']],
        on='月份',
        how='inner'
    )
    
    # 重命名月份列为日期
    merged_df = merged_df.rename(columns={'月份': '日期'})
    merged_df = merged_df.sort_values('日期')
    
    print(f"合并后数据，共 {len(merged_df)} 条记录")
    print(f"数据范围: {merged_df['日期'].min()} 至 {merged_df['日期'].max()}")
    
    return merged_df


def create_dual_axes_chart(df: pd.DataFrame, output_path: str):
    """
    创建双Y轴折线图，参考 Ant Design Charts 样式
    
    Args:
        df: 包含日期、M1、收盘价的DataFrame
        output_path: 输出文件路径
    """
    # 创建图表，参考 Ant Design Charts 的简洁风格
    chart_dpi = 200
    width_inches = 3840 / chart_dpi  # 19.2英寸
    height_inches = 2160 / chart_dpi  # 10.8英寸（16:9比例）
    fig, ax1 = plt.subplots(figsize=(width_inches, height_inches), dpi=chart_dpi)
    fig.patch.set_facecolor('white')
    ax1.set_facecolor('#fafafa')
    
    # 左Y轴：M1货币供应量
    color_m1 = '#1890ff'  # Ant Design主色（蓝色）
    ax1.set_xlabel('日期', fontsize=12)
    ax1.set_ylabel('M1货币供应量（亿元）', fontsize=12, color=color_m1)
    line1 = ax1.plot(df['日期'], df['M1'], 
                     color=color_m1, 
                     linewidth=2.5,
                     alpha=0.9,
                     label='M1货币供应量')
    ax1.tick_params(axis='y', labelcolor=color_m1)
    
    # 填充M1区域（浅色背景）
    ax1.fill_between(df['日期'], df['M1'], 
                    alpha=0.1, 
                    color=color_m1)
    
    # 右Y轴：大盘指数
    ax2 = ax1.twinx()
    color_index = '#52c41a'  # Ant Design成功色（绿色）
    ax2.set_ylabel('大盘指数', fontsize=12, color=color_index)
    line2 = ax2.plot(df['日期'], df['收盘价'], 
                    color=color_index, 
                    linewidth=2.5,
                    alpha=0.9,
                    label='大盘指数')
    ax2.tick_params(axis='y', labelcolor=color_index)
    
    # 填充指数区域（浅色背景）
    ax2.fill_between(df['日期'], df['收盘价'], 
                    alpha=0.1, 
                    color=color_index)
    
    # 设置标题（动态显示实际数据范围）
    start_year = df['日期'].min().year
    end_year = df['日期'].max().year
    title = f'M1货币供应量 vs 大盘指数对比图（{start_year}年-{end_year}年，月度数据）'
    ax1.set_title(title, 
                 fontsize=16, 
                 fontweight='bold',
                 pad=20)
    
    # 格式化X轴日期
    ax1.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m'))
    ax1.xaxis.set_major_locator(mdates.YearLocator())
    plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
    
    # 格式化Y轴：M1（左轴）- 添加千分位
    def format_m1(value, pos):
        if value >= 10000:
            return f'{value/10000:.1f}万亿'
        elif value >= 1000:
            return f'{value/1000:.1f}千亿'
        else:
            return f'{value:.0f}亿'
    
    ax1.yaxis.set_major_formatter(FuncFormatter(format_m1))
    
    # 格式化Y轴：指数（右轴）- 保留整数
    def format_index(value, pos):
        return f'{value:.0f}'
    
    ax2.yaxis.set_major_formatter(FuncFormatter(format_index))
    
    # 增强网格线
    ax1.grid(True, 
            linestyle='--', 
            linewidth=0.5, 
            alpha=0.4,
            color='#d9d9d9',
            which='major')
    ax1.grid(True, which='major', axis='y', 
            linestyle='-', linewidth=0.3, alpha=0.2, color='#bfbfbf')
    
    # 图例：合并两个轴的图例
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, 
              loc='upper left', 
              frameon=True, 
              fancybox=True, 
              shadow=True,
              fontsize=10)
    
    # 调整布局
    plt.subplots_adjust(
        left=0.08,      # 左边距（为左Y轴标签留空间）
        right=0.92,     # 右边距（为右Y轴标签留空间）
        top=0.95,       # 上边距
        bottom=0.12,    # 下边距（为X轴标签留空间）
        hspace=0,
        wspace=0
    )
    
    # 保存图片
    plt.savefig(output_path, dpi=chart_dpi, bbox_inches='tight', 
                facecolor='white', pad_inches=0.1)
    print(f"图表已保存到: {output_path} (画布尺寸: 3840x2160像素)")
    
    plt.close()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='M1货币供应量和大盘K线对比图生成器')
    parser.add_argument('-i', '--index', 
                       type=str, 
                       default='000001',
                       help='指数代码，默认 000001 (上证指数)')
    parser.add_argument('-o', '--output', 
                       type=str, 
                       default=None,
                       help='输出图片路径（默认：仓库根 artifacts/python-utils/m1-kline-compare/m1_kline_compare.png）')
    
    args = parser.parse_args()
    
    # 确定输出路径
    if args.output:
        output_path = args.output
    else:
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        out_dir = os.path.join(repo_root, 'artifacts', 'python-utils', 'm1-kline-compare')
        os.makedirs(out_dir, exist_ok=True)
        output_path = os.path.join(out_dir, 'm1_kline_compare.png')
    
    try:
        # 获取M1数据
        m1_df = fetch_m1_data()
        
        # 获取指数数据
        index_df = fetch_index_monthly_data(args.index)
        
        # 合并数据
        merged_df = merge_data(m1_df, index_df)
        
        if merged_df.empty:
            print("错误: 合并后的数据为空")
            return
        
        # 创建图表
        create_dual_axes_chart(merged_df, output_path)
        
        print("完成!")
        
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
