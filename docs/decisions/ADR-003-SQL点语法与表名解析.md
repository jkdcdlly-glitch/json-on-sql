# ADR-003：SQL 引擎支持嵌套字段点语法 + 表名按节点自身推断

- **编号**：ADR-003
- **日期**：2026-11-11 决策（点语法）/ 2026-11-13 增补（表名推断修复）
- **状态**：已接受
- **体量级别**：L2

## 背景

JSON 数据普遍存在嵌套对象（如 `{ tool: { id, title } }`）。
原引擎只能取单层字段，嵌套数据显示为 `{N个键}`，用户需要手动拍平。
另外点击嵌套数组节点（`$.tasks[0].result[0].items`）时，自动生成的 SQL 表名取成了祖先数组 `result`，执行结果错误。

## 候选方案

- **方案 A**：只支持一层展平，嵌套取值由用户先在表格里手动操作
  - 优点：引擎改动最小
  - 缺点：深层字段（`metrics.organic.etv`）永远取不到
- **方案 B**：引擎全链路支持点语法
  - 新增 `getValueByField(obj, fieldPath)` 递归取值（null/非对象安全返回 undefined）
  - WHERE / ORDER BY / SELECT 列取值全部替换
  - `SELECT *` 通过 `flattenObjectKeys` 自动平铺对象字段（数组不展开、空对象保留、深度 ≤ 3）
  - 正则放宽为 `[\w\u4e00-\u9fa5.]+`（含 ORDER BY 字段）
  - 表名推断：路径末段为键名字符串 → 表名 = 节点自身键名；末段为数字 → 向前找所属数组

## 决策

采用方案 B（全链路点语法 + 节点自身表名推断）。

## 代价与接受

- 字段名本身含 `.` 的 JSON key 无法用点语法引用——真实业务数据中极罕见，接受
- 表格默认视图只展平一层（`metrics.organic` 仍显示 `{22 keys}`）——深层取值由 SQL 多级点语法覆盖，暂不为表格做递归展平（列数爆炸风险），未来若有需求再评估

## 后续验证

- `SELECT metrics.organic.etv FROM items` 返回数值（多级点语法）
- `SELECT *` 列含 `tool.id` 等子列，不含 `{N个键}`
- 点击 items 数组生成 `FROM items`；点击 result[0] 生成 `FROM result LIMIT 1 OFFSET 0`
- 相关 bug：BUG-003（表名推断）
