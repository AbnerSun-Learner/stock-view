# 页面 PRD：指数对比 `/correlation`

**对应路由**：`/correlation`  
**摘录来源**：`/doc/2026-05-11-index-hub-prd-analysis.md` §4.3–4.4、§5.2、§5.3；`/doc/2026-05-11-index-hub-m1-requirements.md` §2.2

---

## 1. 与本功能的链接设计（纲要 §4.3–4.4，多为 M2）

- **深链**：`/correlation?a=XXX&b=YYY&period=…`（与现有 pair API 参数一致）。
- **详情页**：输入第二代码或基准一键跳转；列表双选 + 浮动条（注意移动端成本）。
- **反向**：结果区「查看该标的指数档案」→ `/indices/[code]`。

## 2. 优化方向（纲要 §5.2 + 技术文档 O1–O5）

- URL 已带 `a,b,period` 时 **RSC/服务端预取** 初始结果（O2）。
- `/api/correlation/pair` **短时缓存**（O1）。
- `loading.tsx` + Link prefetch（O4）。
- **落地 FACTS**：「100% 本地」仅描述网格；相关性走 API 的表述拆分（O5）。

## 3. 术语（纲要 §5.3）

- UI「指数对比」与路由名并存时：关于区说明对比含 **收益联动与持仓重叠**，与纯 K 线叠图竞品区分。

## 4. M1 边界

- M1 **不包含** 从列表/详情跳转本页的深链（M1 文档 §2.2）。

---

**返回索引**：[README.md](./README.md)
