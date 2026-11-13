# Changelog

> 用户可感知的变化记录。格式参考 Keep a Changelog，版本号语义化（主.次.修）。
> 面向"谁在用这个工具的人"来写，一行一条；技术细节链接 ADR / BUGLOG。

## [Unreleased]

## [0.3.0] - 2026-11-13

### Fixed
- 点击嵌套数组节点时 SQL 表名错误：`$.tasks[0].result[0].items` 曾生成 `FROM result`，导致执行结果错误；现正确生成 `FROM items`（See BUG-003, ADR-003）
- 修复 i18n 引入后点击数组节点表格空白：局部变量 `tr` 遮蔽翻译函数导致渲染中断（See BUG-002）

## [0.2.0] - 2026-11-11

### Added
- SQL 引擎支持嵌套字段点语法：`SELECT metrics.organic.etv FROM items`、WHERE/ORDER BY 均可使用
- `SELECT *` 自动平铺对象字段为子列（如 `tool.id`），不再显示 `{N个键}`（See ADR-003）
- 默认表格视图展平一层嵌套对象（`tool.id` 列 + 点语法取值，含导出）
- 实战指南新增「嵌套字段：点语法」章节与 FAQ 第 5 条（中英双语）

### Changed
- SEO 关键词重排：主打 `json to table`，品牌词升级为 `JSON on SQL`（title/h1/description/keywords/页脚）（See ADR-002）
- README 中英文仓库名修正

## [0.1.0] - 2026-11-11

### Added
- 双语国际化：页面主体英文，中文浏览器自动切换，右上角按钮手动切换并持久化（See ADR-001）
- i18n 词典（en/zh，160+ 条）覆盖静态文案、动态提示、SQL 编辑器注释、SEO 长文与 FAQ
- AI 字段翻译按钮仅中文界面展示
