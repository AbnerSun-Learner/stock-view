"use client";

import { App, ConfigProvider } from "antd";

interface AntdProviderProps {
  children: React.ReactNode;
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#0052FF",
          zIndexPopupBase: 10000,
          colorBgSpotlight: "#ffffff",
          colorTextLightSolid: "#0f172a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
        },
        components: {
          InputNumber: {
            controlHeight: 48,
            fontSize: 16,
            fontWeightStrong: 600,
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
