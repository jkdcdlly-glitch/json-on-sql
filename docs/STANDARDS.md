# 项目约定（STANDARDS）

> 本项目：json-on-sql，纯原生 JavaScript（无构建、无框架），浏览器直接运行。
> 约定随项目演进追加，格式：`【领域】约定 + 原因 + 检查方式`。

## 1. 文件结构约定

| 文件 | 职责 | 禁止 |
|---|---|---|
| `i18n.js` | 语言检测 + 全部文案词典（en/zh） | 业务逻辑 |
| `translate.js` | 字段名中文词典（translateField） | UI 文案 |
| `sql-engine.js` | 纯 SQL 引擎，无 DOM 依赖 | 直接操作 DOM |
| `ai-translate.js` | AI 接口配置与调用 | 硬编码 UI 文案（走 i18n） |
| `app.js` | 视图渲染与交互 | 硬编码用户可见文案 |

## 2. 命名与作用域（BUG-002 教训）

- **`tr` 专属 i18n 翻译函数**（`app.js` 顶层 `const tr = window.i18n.t`）。任何 DOM/局部变量不得叫 `tr`，表格行变量用 `trEl`，单元格用 `td`/`td1`/`td2`
- 新增顶层助手函数前，先 grep 确认没有同名局部变量遮蔽
- 检查：`grep -n "const tr = document" app.js` 必须无输出

## 3. i18n 约定

- 所有用户可见文案（HTML 静态文本、JS 动态字符串、alert/confirm）一律走 i18n，禁止硬编码中文或英文
- HTML 静态：`data-i18n`（innerHTML，可含简单标签）/ `data-i18n-ph`（placeholder）/ `data-i18n-title`（title）
- JS 动态：`tr('key', { 参数 })`，占位符 `{n}` 形式
- key 命名：静态用语义名（`hero_h1`）；动态按模块前缀（`sql_*`、`search_*`）；SQL 引擎内部报错用 `se_*` 前缀
- en/zh 两份词典必须同步增删；en 为兜底词典，缺 key 会显示 key 名
- 中文界面专属功能（如 AI 字段翻译按钮）用 CSS `body:not(.lang-zh)` 隐藏
- 语言判定：localStorage `json_tool_lang` > 浏览器语言 `zh*` > 默认英文

## 4. SQL 引擎约定（sql-engine.js）

- 纯函数，输入数据输出结果，不碰 DOM；通过 `window.SQLEngine` 暴露，**接口签名变更需走 L2 流程 + ADR**
- 点语法取值统一走 `getValueByField`，禁止散落手写 `a.b.c` 链式取值
- 展平逻辑统一走 `flattenObjectKeys`（数组不展开、空对象保留原列、深度上限 3）
- 表名解析（`findTableByName`）语义：全树搜索同名数组，取第一个匹配

## 5. 表名与路径推断约定（app.js）

- 路径末段为键名字符串 = 选中数组/对象节点本身 → 表名取节点自身键名
- 路径末段为数字 = 选中数组内记录 → 表名向前找所属数组名
- `updateSqlEditor` 生成的 SQL 必须能被 `runSQL` 正确解析回同一张表（自洽性）

## 6. 验证约定（每次改动后）

```bash
# 语法检查（必过）
for f in i18n.js app.js sql-engine.js translate.js ai-translate.js; do node --check $f; done

# tr 遮蔽自查
grep -n "const tr = document" app.js   # 应无输出

# i18n key 抽查（改动词典后）：动态 key 与 en/zh 词典比对
grep -oE "tr\('[a-z_0-9]+'" app.js sql-engine.js | sort -u
```

手测冒烟清单见 `BUGLOG.md` 附录；涉及 SQL/表名的改动按 BUGLOG BUG-003 的防回归要点测。

## 7. 文档约定

- 修 bug → BUGLOG.md（顶部插入，编号递增）
- 改功能 → CHANGELOG.md（用户视角，一行一条）
- 技术决策 → docs/decisions/ADR-xxx.md
- 讨论/复盘 → docs/reviews/
- Markdown 文档用中文书写（团队即你 + AI，中文效率最高）；面向用户的 README_EN 除外

## 8. SEO 约定（内容层）

- 关键词体系以 `json to table` 为主、`json on sql` 为品牌词（见 ADR-002）
- title / h1 / description / keywords 四处必须关键词一致
- 功能更新若引入新能力（如点语法），对应 SEO 文档段落与 FAQ 需同步补充
