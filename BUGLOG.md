# Bug 修复日志（BUGLOG）

> 用途：记录项目中每个 bug 的发现/修复时间、现象、根因、修复方案与防回归要点。
> 目的：方便日后查询与分析；在修新 bug 或加新功能时，避免把老 bug 又弄出来。
>
> **记录规范**：
> - 每个 bug 一个递增编号（BUG-001、BUG-002 …），新条目加在最上面
> - 必填：日期时间、严重级别、现象、根因、修复、涉及文件、防回归要点
> - 如果某个 bug 是"改新功能时引入的"，必须在根因里写明是哪次改动引入的
> - 修复后如涉及可自动验证的逻辑，尽量附上 node 回归命令或步骤

---

## BUG-005　点语法列单元格定位路径错误 / SQL 结果单元格不可点击

- **日期时间**：2026-11-13 发现并修复
- **严重级别**：中（表格视图点了会定位到不存在的节点；SQL 结果的对象单元格完全不可点）
- **现象**：
  ① 表格视图点语法列（如 `metrics.organic`）的 `22 keys` 点击后按字面 key `metrics.organic` 拼路径，导航到错误节点；
  ② SQL 查询结果里的对象/数组单元格（如 `22 keys`）纯文本展示，不可点击定位，与表格视图体验不一致。
- **根因**：
  ① `renderRecordTable` 单元格点击用 `path.concat(i, k)`，k 含点号时被当成单段 key；
  ② `renderSQLResult` 建单元格时从未绑定导航事件；
  ③ 即使绑定，WHERE/ORDER BY/LIMIT 之后结果行号 ≠ 原数组下标，直接用行号定位会错位。
- **修复**：
  ① `renderRecordTable` 定位路径改为 `path.concat(i, ...k.split('.'))`；
  ② `executeSQL` 返回 `rowSourceIndex`（每行对应的原数组下标，WHERE/排序/LIMIT 全程同步维护）；
  ③ `renderSQLResult` 所有非空单元格绑定点击定位：`表路径 + rowSourceIndex[i] + 字段按点拆段`。
- **涉及文件**：`app.js`、`sql-engine.js`
- **防回归要点**：
  1. SQL 结果（尤其带 WHERE + ORDER BY + LIMIT 时）点击 `22 keys` 应定位到左侧树对应节点
  2. 构造乱序数据验证 `rowSourceIndex` 映射（node 断言：结果第 i 行字段值 === 原数据[rowSourceIndex[i]] 的字段值）
  3. `window.SQLEngine` 返回结构新增 `rowSourceIndex` 字段（增量变更，见 ADR-003）

---

## BUG-004　SQL 注释与提示语之间缺换行（BUG-001 修复方向错误引入的回归）

- **日期时间**：2026-11-11 引入（BUG-001 的修复）；2026-11-13 发现并修复
- **严重级别**：低（显示问题，但 BUG-001 的根因分析就是错的，值得记教训）
- **现象**：自动生成的 SQL 显示为 `-- Table: items (showing 5 fields)-- Edit the query, ...`，两行注释挤在一行。
- **根因**：
  **BUG-001 的修复方向反了。** 当时判断"zh 模板末尾多了 `\n`"并删掉，实际原始问题另有原因，
  删掉后变成两语言都缺换行。原始正确约定本应是：`sql_tbl_comment` **以 `\n` 结尾**，`sql_run_hint` **不以 `\n` 开头**。
- **修复**：en/zh 两个 `sql_tbl_comment` 模板末尾统一加回 `\n`。
- **涉及文件**：`i18n.js`
- **教训**：
  修"显示类"小问题时也要先拼接复现真实输出再动手，而不是凭描述推断；
  BUG-001 记录的"防回归要点"当时写反了，以本条为准。
- **防回归要点**：拼接验证：`t('sql_tbl_comment') + t('sql_run_hint')` 输出的前两行必须是两条独立注释。

---

## BUG-003　点击嵌套数组节点时，SQL 表名取错（生成 `FROM result` 而非 `FROM items`）

- **日期时间**：2026-11-13 发现并修复
- **严重级别**：高（SQL 执行结果完全错误，但表格视图正常，具有迷惑性）
- **现象**：
  点击 `$.tasks[0].result[0].items` 数组节点，表格视图正常（6 行数据、`metrics.organic` 展平列正常），
  但自动生成的 SQL 是 `FROM result`；点"▶ Run"执行后只返回 1 行，`year` / `month` / `metrics.organic` 全为 `—`。
  连带导致多级点语法 `SELECT metrics.organic.etv ...` 也查不到数据（表找错了，字段自然取不到）。
- **根因**：
  `app.js` 的 `updateSqlEditor(path, mode, visibleColumns)` 从路径末尾向前扫描**数字下标**来推断表名。
  路径 `['tasks', 0, 'result', 0, 'items']` 中第一个遇到的数字是 `result[0]` 的 `0`，
  于是把祖先数组名 `result` 当成了表名。而选中 `items` 节点时路径末尾是键名字符串，本不该走这个分支。
  执行时 `resolveTableSource('result')` → `findTableByName` 找到 `$.tasks[0].result`（只含 1 条记录的祖先数组），
  导致字段全部取不到。
- **修复**：
  `updateSqlEditor` 表名推断逻辑改为按路径末段类型区分：
  - 末段是**键名字符串**（选中数组/对象节点本身）→ 表名 = 节点自身键名（`items`）
  - 末段是**数字**（选中数组内某条记录，如 `result[0]`）→ 向前找所属数组名（保留旧行为，`FROM result LIMIT 1 OFFSET 0`）
- **涉及文件**：`app.js`（`updateSqlEditor`）
- **防回归要点**（改动 `updateSqlEditor` / 表名解析 / `resolveTableSource` 后必测）：
  1. 点击嵌套数组节点（如 `items`）→ SQL 应为 `FROM items`，运行结果行数与表格视图一致
  2. 点击数组内单条记录（如 `result[0]`）→ SQL 应为 `FROM result LIMIT 1 OFFSET 0`
  3. 点击顶层键名数组（如 `suggestions`）→ `FROM suggestions`
  4. 多级点语法：`SELECT metrics.organic.etv FROM items` 应返回数值

---

## BUG-002　局部变量 `tr` 遮蔽 i18n 翻译函数，点击数组节点后表格空白

- **日期时间**：2026-11-11 i18n 重构时引入；2026-11-13 发现并修复
- **严重级别**：高（核心视图直接崩溃，白屏表格区）
- **现象**：
  点击数组节点后，工具栏（"共 N 条记录"）和 SQL 编辑器正常，但下方数据表格完全不渲染。
- **根因**：
  i18n 改造时在 `app.js` 顶层定义了翻译函数 `const tr = window.i18n.t`。
  但 `renderRecordTable` / `renderValueList` 等函数里建表格行时已有同名局部变量：
  ```js
  const tr = document.createElement('tr');   // 遮蔽了翻译函数
  ...
  td.title = tr('locate_tip');               // 把 DOM 元素当函数调用 → TypeError
  ```
  循环第一次调用就抛异常，`renderTableContent` 中断，表格没有挂载。
  i18n 改造前不存在顶层 `tr` 函数，所以老代码里同名局部变量一直相安无事——
  **属于"加新功能（i18n）时把潜在冲突激活"的典型回归**。
- **修复**：
  全文件排查 4 处 `const tr = document.createElement('tr')`，行变量统一改名 `trEl`：
  - `renderRecordTable`（实际崩溃点）
  - `renderValueList`（同样在行内调 `tr('locate_tip')`，必崩）
  - `renderObject`、`renderSQLResult`（当时未在行内调 `tr()`，预防性改名）
  修复过程中还补抓了 `renderValueList` 漏改的一处 `tbody.appendChild(tr)`。
- **涉及文件**：`app.js`
- **防回归要点**：
  1. **规范：`app.js` 中禁止用 `tr` 作为任何 DOM/局部变量名**，`tr` 专属 i18n 翻译函数
  2. 新增渲染代码涉及表格行时，行变量一律用 `trEl`
  3. 改动渲染逻辑后的手测清单：点击数组节点表格能渲染、值数组视图正常、SQL 查询结果表格正常
  4. 快速自查命令：`grep -n "const tr = document" app.js`（应无输出）

---

## BUG-001　中文词典 `sql_tbl_comment` 模板末尾多余换行

- **日期时间**：2026-11-11 发现并修复（i18n 重构当日）
- **严重级别**：低（仅中文界面下 SQL 编辑器注释多一个空行，纯显示问题）
- **现象**：中文环境下自动生成的 SQL 注释与提示语之间多出一个空行。
- **根因**：
  中文模板 `sql_tbl_comment` 末尾带了 `\n`，而 `sql_run_hint` 自身已以 `\n\n` 开头，拼接后多出一行。
  英文词典当时已按"注释不带换行 + 提示语自带换行"的约定书写，中文版没对齐。
- **修复**：`i18n.js` 中文 `sql_tbl_comment` 去掉末尾 `\n`。
- **涉及文件**：`i18n.js`
- **防回归要点**：
  约定：`sql_tbl_comment` / `sql_value_array` / `sql_single` / `sql_generic` 这类首行注释模板**不带末尾换行**，
  后续衔接的模板自带开头换行。改这两个 key 时注意拼接结果。

---

## FIX-001　README clone 地址仓库名拼错（非代码 bug）

- **日期时间**：2026-11-11 修复
- **现象**：`README.md` / `README_EN.md` 中 clone 地址写成了 `jkdcjlly-glitch`（少个 `d`）。
- **修复**：统一改为正确的 `https://github.com/jkdcdlly-glitch/json-on-sql.git`。
- **涉及文件**：`README.md`、`README_EN.md`

---

## 附：常用回归自查命令

```bash
# 1. 所有 JS 语法检查
for f in i18n.js app.js sql-engine.js translate.js ai-translate.js; do node --check $f; done

# 2. i18n key 完整性（词典缺失 key 会直接显示为 key 名，页面出现英文原文即可发现）
#    动态 key：grep -oE "tr\('[a-z_0-9]+'" app.js sql-engine.js | sort -u
#    静态 key：grep -oE 'data-i18n(-ph|-title)?="[a-z_0-9]+"' index.html | sort -u
#    然后与 i18n.js 中 en/zh 两份词典逐一比对

# 3. tr 遮蔽自查（BUG-002 防回归）
grep -n "const tr = document" app.js

# 4. SQL 引擎点语法 / SELECT * 展平回归（可复用会话中的 node 测试脚本思路：
#    mock window.i18n + eval sql-engine.js，构造嵌套数据跑 executeSQL）
```

## 手测冒烟清单（每次改动后过一遍）

1. 导入嵌套 JSON → 点击叶子对象数组节点 → 表格渲染、展平列出现、SQL 为 `FROM <节点名>`
2. 点"▶ Run" → 结果与表格视图行数一致
3. 多级点语法（`a.b.c`）查询返回数值
4. `SELECT *` → 对象字段平铺为子列，数组显示 `[n 项]`
5. 单条记录点击 → `FROM xxx LIMIT 1 OFFSET n`
6. 搜索、路径跳转、列选择面板、CSV/TSV 导出（含嵌套列取值）
7. 切换中/英界面 → 全部文案与中文标注跟随切换，AI 按钮（✨/⚙️）仅中文界面可见
