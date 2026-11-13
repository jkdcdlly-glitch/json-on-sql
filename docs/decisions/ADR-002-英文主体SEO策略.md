# ADR-002：SEO 关键词策略——主打 "json to table"，品牌词 "JSON on SQL"

- **编号**：ADR-002
- **日期**：2026-11-11
- **状态**：已接受
- **体量级别**：L2

## 背景

原定位 "JSON Analyzer" 搜索量低；关键词调研显示 `json to table` 搜索量显著更高。
需要在不推翻产品形态的前提下重排关键词体系。

## 候选方案

- **方案 A**：延续 "JSON Analyzer" 定位，靠长文慢慢养
  - 优点：不动任何文案
  - 缺点：主关键词天然低量，天花板明显
- **方案 B**：全站关键词重排——title/h1/description/keywords 以 `json to table` 系列为主，`JSON on SQL` 升级为品牌词（title 首位 + 页脚 + 仓库名），中英文同步
  - 优点：蹭高量词 + 品牌词与域名/仓库一致，可信度与外链价值提升
  - 缺点：需要重写 meta/h1/subtitle 及词典文案，与旧外链锚文本（如有）短暂不一致

## 决策

采用方案 B。title 改为 `JSON on SQL - JSON to Table Converter, Viewer & SQL Query Tool`，
h1 改为 `Fast JSON Viewer & JSON to Table Converter`，keywords 以 json to table 系列优先。

## 代价与接受

- 页脚品牌、README 等需要同步改名——已执行
- 旧关键词排名清零重来——旧站尚无稳定排名，代价可接受

## 后续验证

- 新功能上线时，SEO 文档段（实战指南/FAQ）同步补充新能力关键词（如点语法、nested fields）
- 检查点：title / h1 / description / keywords 四处关键词一致
