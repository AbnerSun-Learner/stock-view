#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
指数历史追踪器 - Streamlit 可视化

基于 stillwell_tracker.py，提供 Web 版交互界面：
- 选择 / 上传配置文件
- 在线拉取指数数据并生成图表
- 页面直接展示 PNG 图（与命令行版本风格一致）
"""

import json
import os
import tempfile
from datetime import datetime
from typing import Dict, Any

import streamlit as st

from stillwell_tracker import (
    load_config,
    get_index_name,
    fetch_index_data,
    fetch_index_all_history,
    parse_trade_points,
    find_price_for_date,
    create_chart,
)


def load_config_from_path(config_path: str) -> Dict[str, Any]:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"配置文件不存在: {config_path}")
    return load_config(config_path)


def run_tracker_with_config(config: Dict[str, Any]) -> str:
    """
    复用 stillwell_tracker 逻辑，生成 PNG 图表并返回图片路径
    """
    index_code = config["index_code"]
    start_date = config["start_date"]
    trade_points = config.get("trade_points", [])

    key_points_config = None
    if "key_points" in config and config["key_points"]:
        if isinstance(config["key_points"], list) and len(config["key_points"]) > 0:
            key_points_config = config["key_points"][0]
        elif isinstance(config["key_points"], dict):
            key_points_config = config["key_points"]

    index_name = get_index_name(index_code)

    df = fetch_index_data(index_code, start_date)
    if df.empty:
        raise ValueError("无法获取指数数据，请检查指数代码和开始日期")

    df_all_history = fetch_index_all_history(index_code)

    buy_points, sell_points = parse_trade_points(trade_points)

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

    tmp_dir = tempfile.gettempdir()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    output_path = os.path.join(tmp_dir, f"index_tracker_{index_code}_{timestamp}.png")

    create_chart(
        df,
        buy_points_with_price,
        sell_points_with_price,
        index_code,
        index_name,
        output_path,
        df_all_history=df_all_history,
        key_points=key_points_config,
    )

    return output_path


def main() -> None:
    st.set_page_config(
        page_title="指数历史追踪器 - Streamlit",
        layout="wide",
    )

    st.title("📈 指数历史追踪器（Streamlit 版）")
    st.markdown(
        "基于 AKShare + Matplotlib 的指数追踪工具，可视化展示配置中的买卖点与关键价位。"
    )

    with st.sidebar:
        st.header("配置文件")

        default_config_path = os.path.join(
            os.path.dirname(__file__), "tracker_config.json"
        )
        use_default = st.checkbox(
            "使用当前目录下的 tracker_config.json",
            value=os.path.exists(default_config_path),
        )

        uploaded_file = st.file_uploader(
            "或上传自定义配置 JSON 文件",
            type=["json"],
        )

        run_button = st.button("生成图表", type="primary")

    if not run_button:
        st.info("在左侧选择/上传配置文件后，点击「生成图表」开始计算。")
        return

    try:
        if uploaded_file is not None:
            config_data = json.loads(uploaded_file.read().decode("utf-8"))
        elif use_default:
            config_data = load_config_from_path(default_config_path)
        else:
            st.error("请勾选使用默认配置，或上传一个配置文件。")
            return
    except Exception as exc:
        st.error(f"加载配置失败：{exc}")
        return

    st.subheader("当前配置")
    st.json(config_data)

    try:
        with st.spinner("正在获取指数数据并生成图表，请稍候..."):
            image_path = run_tracker_with_config(config_data)
    except Exception as exc:
        st.error(f"生成图表失败：{exc}")
        return

    st.subheader("生成结果")
    st.image(image_path, caption=os.path.basename(image_path), use_column_width=True)


if __name__ == "__main__":
    main()

