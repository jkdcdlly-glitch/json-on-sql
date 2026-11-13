/* ========== i18n 多语言模块 ==========
 * 全局暴露：window.i18n = { t, getLang, setLang, toggle, applyStatic }
 * 语言判定优先级：localStorage 手动选择 > 浏览器语言（zh* 切中文）> 默认英文
 * 站点主体默认英文；data-i18n 标记的静态文案在中文环境下自动替换为中文
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'json_tool_lang';

  const STR = {
    en: {
      title: 'JSON on SQL - JSON to Table Converter, Viewer & SQL Query Tool',
      meta_desc: 'Convert JSON to Table (CSV/Excel) or query JSON with native SQL. 100% free online JSON viewer that handles large files instantly without crashing. Data stays local.',
      meta_kw: 'json to table, json to table converter, json to csv, json to excel, json viewer, json formatter, json sql query, JSON on SQL, large JSON files, online json tool',

      hero_h1: 'Fast JSON Viewer &amp; JSON to Table Converter',
      hero_sub: 'Parse 100MB files in seconds · Convert JSON to tables &amp; export · Native SQL queries · 100% local &amp; private',
      badge_big: '⚡ Handles huge files',
      badge_sql: '🔍 Built-in SQL queries',
      badge_table: '📊 Table view & export',
      badge_ai: '🌍 AI field translation',
      badge_privacy: '🔒 100% local & private',

      drop_h2: 'Drop a JSON file here',
      drop_or: 'or',
      drop_pick: 'choose a file',
      drop_divider: 'or paste text directly',
      drop_ph: '{"example": "Paste your JSON string here..."}',
      drop_parse: 'Parse pasted JSON',

      guide_h2a: 'Hands-on Guide: Query &amp; Export JSON with SQL — Skip the Throwaway Scripts',
      guide_p1: 'In day-to-day development we constantly need to inspect huge JSON files returned by third-party APIs, or extract key fields from scraped JSON data. The traditional approach is to throw together a temporary Python/Node.js script, or import everything into MySQL/MongoDB — both slow and tedious.',
      guide_p2: 'This guide shows you how to use this fully client-side tool to query JSON directly with <strong>SQL syntax</strong> — just like working with a database — and turn it into an <strong>Excel / CSV</strong> table in one click.',

      guide_h2b: '1. Core Workflow: Query JSON with SQL',
      guide_h2b_p: 'When you select an array node on the left (typically a <code>result</code> or <code>data</code> array), the SQL editor automatically appears above. The built-in lightweight SQL engine covers most of the queries you need day to day.',

      g1_h3: '1.1 Basic extraction: SELECT',
      g1_p1: 'Suppose your JSON data looks like this:',
      g1_p2: '<strong>Usage:</strong> no need to pull every redundant field — just name the columns you want with <code>SELECT</code>:',
      g1_pre: '-- extract name and role only\nSELECT name, role FROM data;',

      g2_h3: '1.2 Conditional filtering: WHERE',
      g2_p1: 'To filter out specific rows, use a <code>WHERE</code> clause. Standard comparison operators are supported: <code>=</code>, <code>!=</code>, <code>&gt;</code>, <code>&lt;</code>, <code>&gt;=</code>, <code>&lt;=</code>.',
      g2_pre: "-- users older than 30\nSELECT name, age FROM data WHERE age > 30;\n\n-- admins only\nSELECT * FROM data WHERE role = 'admin';",

      g3_h3: '1.3 Fuzzy matching: LIKE',
      g3_p1: 'When you need to search for content containing a specific keyword, <code>LIKE</code> is your best friend. Use <code>%</code> as a wildcard for any characters.',
      g3_pre: "-- names starting with 'A'\nSELECT * FROM data WHERE name LIKE 'A%';\n\n-- emails containing 'gmail'\nSELECT * FROM users WHERE email LIKE '%gmail%';",

      g4_h3: '1.4 Combining conditions: AND / OR',
      g4_p1: 'You can combine multiple filter conditions with <code>AND</code> and <code>OR</code>.',
      g4_pre: "-- older than 25 AND role is admin\nSELECT * FROM data WHERE age > 25 AND role = 'admin';",

      g5_h3: '1.5 Sorting results: ORDER BY',
      g5_p1: 'If the data is in no particular order, use <code>ORDER BY</code> to sort ascending (ASC, the default) or descending (DESC).',
      g5_pre: "-- by age, largest first\nSELECT * FROM data ORDER BY age DESC;\n\n-- by role ascending, then age descending\nSELECT * FROM data ORDER BY role ASC, age DESC;",

      g6_h3: '1.6 Pagination: LIMIT &amp; OFFSET',
      g6_p1: 'Facing thousands of rows? Preview just the first few. <code>OFFSET</code> lets you emulate pagination.',
      g6_pre: "-- first 10 rows only\nSELECT * FROM data LIMIT 10;\n\n-- skip 20, take the next 10 (page 3)\nSELECT * FROM data LIMIT 10 OFFSET 20;",

      g7_h3: '1.7 Nested fields: dot notation',
      g7_p1: 'Real-world JSON often nests values inside objects — e.g. every record carries a <code>tool</code> object holding <code>id</code>, <code>title</code> and <code>code</code>. No manual flattening needed: use dot notation (<code>tool.id</code>) anywhere a field name is accepted — SELECT, WHERE and ORDER BY.',
      g7_p2: 'With <code>SELECT *</code>, nested object fields are automatically flattened into sub-columns (<code>tool.id</code>, <code>tool.title</code>…), so you never see an unreadable <code>{3 keys}</code> cell.',
      g7_pre: "-- nested object: { \"tool\": { \"id\": \"19\", \"title\": \"Overview\", \"code\": \"keyword-overview\" } }\n\n-- pick nested fields with dot notation\nSELECT type, tool.id, tool.title FROM data;\n\n-- filter on a nested field\nSELECT * FROM data WHERE tool.code = 'keyword-overview';",

      h2c: '2. Exporting JSON to Excel or CSV',
      h2c_p: 'Deeply nested JSON is painful to read. Flattening it into a table is the most direct way to analyze it. This tool ships a complete "JSON to Excel" pipeline:',

      d1_h3: '2.1 Auto-generated tables',
      d1_p1: 'Click an array node that contains multiple records on the left, and the right panel automatically detects its structure and renders a data table. No matter how many fields there are, you can scroll horizontally to see them all.',

      d2_h3: '2.2 Pick your columns',
      d2_p1: 'JSON often carries dozens of fields when you only care about four or five. Click the <strong>⚙️ Columns</strong> button above the table and check the fields you need. This is essential for keeping wide tables readable.',

      d3_h3: '2.3 Copy or download in one click',
      d3_p1: 'Once filtered, use the toolbar buttons:',
      d3_li1: '<strong>📋 Copy (TSV)</strong>: data is copied to the clipboard tab-separated. Open Excel and paste (Ctrl+V) — every value lands perfectly aligned in its own cell.',
      d3_li2: '<strong>⬇️ CSV / TSV</strong>: need a file to send to a colleague? Hit download to get a standard spreadsheet file.',

      d4_h3: '2.4 Why exported spreadsheets never show garbled text',
      d4_p1: 'A classic problem: export a CSV, open it in Excel, and every non-ASCII character turns into mojibake. Plain UTF-8 encoding lacks a BOM header. This tool <strong>automatically prepends a BOM marker (\\uFEFF)</strong> when generating files, so Excel reliably detects UTF-8 encoding — garbled text is gone for good.',

      h2d: '3. Advanced: Deep Nesting &amp; Obscure Fields',

      a1_h3: '3.1 Unlimited depth &amp; huge-file support',
      a1_p1: 'If your JSON is deeply nested, the tree on the left expands on demand. Even with thousands of items in an array, the tool renders only 200 at a time and offers a <strong>"▼ Load more"</strong> button at the bottom. This lazy-rendering mechanism keeps the browser responsive no matter how big the file is, with memory usage staying extremely low.',

      a2_h3: '3.2 One-click locate &amp; search',
      a2_p1: 'Spot a strange error code or number on screen (say <code>47754</code>) and want to know where it lives in the JSON? Type it into the search box on the left. The tool instantly scans the entire JSON and lists every matching path (e.g. <code>$.result[728].organicTraffic</code>). Click a result to jump straight to the node and highlight it.',

      a3_h3: '3.3 AI-powered field translation',
      a3_p1: 'Inherited someone else\'s system, or scraped a foreign API? Staring at fields like <code>intentCommercialPositions</code> or <code>serpFeaturesTrafficCost</code> is brutal.',
      a3_p2: 'This tool ships with a built-in glossary. For anything it does not know, click <strong>✨ AI</strong> (top-left) and configure your own API key (DeepSeek, ChatGPT, etc.). AI identifies all obscure business terms within seconds and names them in plain language — cached in your browser permanently, hugely improving reading efficiency.',

      h2e: '4. FAQ (Frequently Asked Questions)',
      faq1_q: 'My JSON file is tens of MB. Can this tool open it? Will it freeze?',
      faq1_a: 'No freeze. Naive formatters try to render every DOM node at once and crash the browser with memory exhaustion. This tool renders only the nodes currently in view or expanded, so even huge files open smoothly.',
      faq2_q: 'Does the SQL engine support JOIN or GROUP BY aggregates?',
      faq2_a: 'Not yet. To keep the engine lightning-fast and purely client-side, it focuses on core single-table queries (SELECT — including nested fields via dot notation, WHERE, ORDER BY, LIMIT). Multi-table JOIN and SUM/COUNT aggregates are not supported yet — export the query result and aggregate in Excel.',
      faq3_q: 'My JSON contains company secrets or user privacy. Is it safe?',
      faq3_a: 'Absolutely safe. This tool runs purely in the browser with no backend server. All parsing, querying and exporting happen locally in your own browser (JavaScript engine). You can open the DevTools network panel or even disconnect from the internet and keep using it — no data is ever sent anywhere.',
      faq4_q: 'My JSON has a syntax error and refuses to parse. What now?',
      faq4_a: 'On import, the tool reports the exact location of the syntax error (line, column, missing comma, etc.). If data is already loaded, click "📝 Edit JSON" on the left, fix the text in the dialog, and hit apply to re-parse.',
      faq5_q: 'My fields are nested objects (e.g. tool.id). Can I query deep values?',
      faq5_a: "Yes. Dot notation works in SELECT, WHERE and ORDER BY — e.g. SELECT tool.id, tool.title FROM data WHERE tool.code = 'keyword-overview'. With SELECT *, object fields are automatically flattened into sub-columns, so nested data shows up as readable columns instead of {N keys}.",

      footer_text: 'JSON on SQL © 2024 — driven by the open-source community | 100% client-side',

      loader_text: 'Parsing JSON...',

      t_title: 'Structure',
      aiTrans_title: 'Translate unknown fields with AI',
      aiConfig_title: 'Configure AI access',
      edit_btn: '📝 Edit JSON',
      edit_title: 'View and edit the raw JSON',
      reload_btn: '📁 Import JSON',
      reload_title: 'Load a new file',
      toggle_title: 'Switch language',
      search_ph: '🔍 Search keys or values, e.g. 47754 or traffic',
      clear_title: 'Clear',
      path_ph: '📍 Path jump: $.result[728] or 728',
      go: 'Go',
      sql_label: 'SQL Query',
      sql_ok: '✓ Enabled',
      ex_btn: 'Example',
      ex_title: 'Insert a sample query',
      run_btn: '▶ Run',
      run_title: 'Run SQL (Ctrl+Enter)',
      splitter_title: 'Drag to resize the SQL editor and table',
      empty_view: '← Select a node on the left',

      m_h2: '📝 Edit raw JSON',
      m_cancel: 'Cancel',
      m_apply: 'Apply & re-parse (Ctrl+Enter)',
      m_tip: '⚠️ Note: for very large files (> 10MB), editing directly in this textarea may lag the browser.',
      m_ph: 'Paste or edit JSON here...',

      // ===== 动态字符串（app.js）=====
      preview_items: '[{n} items]',
      preview_keys: '{n} keys',
      err_path_fmt: 'Invalid path: {s}',
      err_bracket: 'Unclosed [',
      err_index: 'Invalid index: {s}',
      load_more: '▼ Load more ({n} left · {c} per batch)',
      all_shown: '(all {n} items shown)',
      jump_root: 'Jump to root',
      jump_to: 'Jump to {p}',
      copy_path: '📋 Copy path',
      copied: '✓ Copied',
      copy_path_title: 'Copy the full path',
      empty_obj: 'Empty object {}',
      empty_arr: 'Empty array []',
      copy_tsv: '📋 Copy (TSV)',
      copy_tsv_title: 'Copy as TSV — paste straight into Excel',
      dl_csv_title: 'Download as CSV (all rows, currently selected columns)',
      dl_tsv_title: 'Download as TSV (all rows, currently selected columns)',
      prev_page: '‹ Prev',
      next_page: 'Next ›',
      page_info: 'Page {p} of {t}',
      sel_all: 'Select all',
      sel_none: 'Deselect all',
      sel_reset: 'Reset to default',
      cancel: 'Cancel',
      apply: 'Apply',
      sel_count: '{n} / {m} selected',
      need_one_field: 'Select at least one field',
      table_info: '{total} rows · showing {cols} of {all} fields (click a cell to locate it in the tree)',
      columns_btn: '⚙️ Columns ({a}/{b})',
      value_col: 'Value (click to locate in the tree)',
      locate_tip: 'Click to locate this node in the tree on the left',
      sql_tbl_comment: '-- Table: {t} (showing {n} fields)\n',
      sql_run_hint: '-- Edit the query, then press Ctrl+Enter or click "▶ Run"\n\n',
      sql_value_array: "-- Value array ({t}){c}\n-- Value arrays can't be queried directly — select the parent object array first\n\n",
      sql_single: '-- Selected: {p} (record #{n})\n-- Auto-targeted parent table {t}\n\n',
      sql_generic: '-- Current path: {p}\n-- Guessed table: "{t}"{c}\n\n',
      sql_example: '-- Example: key columns of the latest 20 rows in "result"\nSELECT date, organicTraffic, organicTrafficCost, traffic, trafficCost\nFROM result\nORDER BY date DESC\nLIMIT 20;',
      sql_empty: 'Please enter a SQL query',
      sql_no_table: 'Table not found: "{t}"\n\nAvailable tables:\n  {list}',
      no_tables: '(none)',
      sql_not_array: '"{t}" is not an array',
      sql_error: 'SQL error:\n{m}',
      sql_result_label: '🔍 SQL result',
      sql_meta: '{r} rows / matched {m} (table {t})',
      close: '✕ Close',
      sql_no_rows: 'Query returned no rows (0 results)',
      search_none: 'No matches',
      search_trunc: 'Matched <span class="count">{total}+</span> items, showing first <span class="count">{n}</span> <span class="warn">(truncated)</span>',
      search_total: 'Matched <span class="count">{total}</span> items',
      search_nf: 'No key or value containing "{q}"',
      tag_key: 'key',
      tag_value: 'value',
      key_is: 'key = ',
      view_record: '📄 View record',
      view_record_title: 'Jump to the full record containing this value: {p}',
      parsing: 'Parsing JSON...',
      reading: 'Reading file...',
      alert_empty: 'Content is empty',
      alert_parse_fail: 'JSON parse failed:\n{m}',
      alert_read_fail: 'Failed to read the file:\n{m}',
      edit_empty: 'Content cannot be empty',
      parsing_short: 'Parsing...',
      alert_syntax: 'Invalid JSON — check the syntax:\n{m}',
      err_path: 'Invalid path:\n{m}\n\nAccepted formats:\n  $.result[728]\n  result[728]\n  728\n  $["result"][728]["date"]',
      path_nf: 'Path not found: {p}\n\nJump to the closest parent node instead?',
      se_cond: 'Cannot parse condition: {s}',
      se_syntax: 'Syntax error: expected SELECT ... FROM table',
      se_field: 'Cannot parse field: {s}',
      se_order: 'Cannot parse ORDER BY: {s}'
    },

    zh: {
      title: 'JSON on SQL - JSON 转表格转换器、JSON 查看器 & SQL 查询工具 | 免费在线',
      meta_desc: 'JSON 一键转表格（CSV/Excel），或用原生 SQL 查询 JSON。100% 免费在线 JSON 查看器，超大文件秒开不卡死，数据全程留在本地浏览器。',
      meta_kw: 'json转表格, json转csv, json转excel, json查看器, json格式化, json sql查询, 大文件json, 在线json工具',

      hero_h1: '极速 JSON 查看器 &amp; JSON 转表格工具',
      hero_sub: '极速解析百兆文件 · 可视化转表格导出 · 原生 SQL 查询 · 100% 本地安全',
      badge_big: '⚡ 支持超大文件',
      badge_sql: '🔍 内置 SQL 查询',
      badge_table: '📊 表格视图与下载',
      badge_ai: '🌍 AI 中英智能翻译',
      badge_privacy: '🔒 100% 纯本地隐私',

      drop_h2: '拖放 JSON 文件到此处',
      drop_or: '或者',
      drop_pick: '点击选择文件',
      drop_divider: '或者直接粘贴文本',
      drop_ph: '{"example": "将你的 JSON 字符串粘贴到这里..."}',
      drop_parse: '解析粘贴的 JSON',

      guide_h2a: 'JSON 查询与导出实战指南：告别繁琐代码，用 SQL 玩转 JSON',
      guide_p1: '在日常开发中，我们经常需要处理第三方 API 返回的巨型 JSON 文件，或者从爬虫抓取的 JSON 数据中提取关键信息。传统的做法是写一段临时的 Python/Node.js 脚本来解析，或者将其导入 MySQL/MongoDB 数据库。但这些方式往往费时费力。',
      guide_p2: '本指南将带你了解如何利用我们这款纯前端工具，像操作数据库一样，直接用 <strong>SQL 语法</strong> 查询 JSON，并将其转化为 <strong>Excel / CSV</strong> 表格，大幅提升你的工作效率。',

      guide_h2b: '一、 核心功能实战：JSON 转 SQL 查询',
      guide_h2b_p: '当你在左侧选中一个数组节点（例如数据中常见的 <code>result</code> 或 <code>data</code> 数组）时，上方会自动出现 SQL 查询编辑器。我们的工具内置了轻量级 SQL 引擎，支持绝大多数日常所需的查询语法。',

      g1_h3: '1. 基础提取：SELECT',
      g1_p1: '假设你的 JSON 数据长这样：',
      g1_p2: '<strong>用法：</strong> 你不需要提取所有的冗余字段，只需要用 <code>SELECT</code> 指定你需要的列名即可：',
      g1_pre: '-- 只提取姓名和角色\nSELECT name, role FROM data;',

      g2_h3: '2. 条件过滤：WHERE',
      g2_p1: '如果你想筛选出特定的数据，可以使用 <code>WHERE</code> 子句。支持标准的比较运算符：<code>=</code>、<code>!=</code>、<code>&gt;</code>、<code>&lt;</code>、<code>&gt;=</code>、<code>&lt;=</code>。',
      g2_pre: "-- 找出年龄大于 30 岁的用户\nSELECT name, age FROM data WHERE age > 30;\n\n-- 找出角色为管理员 (admin) 的用户\nSELECT * FROM data WHERE role = 'admin';",

      g3_h3: '3. 模糊匹配：LIKE',
      g3_p1: '当你需要搜索包含特定关键字的内容时，<code>LIKE</code> 是绝佳选择。使用 <code>%</code> 代表任意字符。',
      g3_pre: "-- 找出名字以 'A' 开头的用户\nSELECT * FROM data WHERE name LIKE 'A%';\n\n-- 找出邮箱包含 'gmail' 的用户\nSELECT * FROM users WHERE email LIKE '%gmail%';",

      g4_h3: '4. 多条件组合：AND / OR',
      g4_p1: '你可以使用 <code>AND</code> 和 <code>OR</code> 组合多个过滤条件。',
      g4_pre: "-- 找出年龄大于 25 且角色是 admin 的用户\nSELECT * FROM data WHERE age > 25 AND role = 'admin';",

      g5_h3: '5. 结果排序：ORDER BY',
      g5_p1: '如果数据是杂乱无章的，你可以使用 <code>ORDER BY</code> 进行升序（ASC，默认）或降序（DESC）排列。',
      g5_pre: "-- 按年龄从大到小排序\nSELECT * FROM data ORDER BY age DESC;\n\n-- 按角色升序，如果角色相同则按年龄降序\nSELECT * FROM data ORDER BY role ASC, age DESC;",

      g6_h3: '6. 分页限制：LIMIT 与 OFFSET',
      g6_p1: '面对上万条数据，你可以只取前几条进行预览。<code>OFFSET</code> 可以用于实现类似分页的效果。',
      g6_pre: "-- 只看前 10 条记录\nSELECT * FROM data LIMIT 10;\n\n-- 跳过前 20 条，取接下来的 10 条（第 3 页）\nSELECT * FROM data LIMIT 10 OFFSET 20;",

      g7_h3: '7. 嵌套字段：点语法（深层取值）',
      g7_p1: '真实业务数据里，值经常藏在嵌套对象中——比如每条记录都带一个 <code>tool</code> 对象，里面有 <code>id</code>、<code>title</code>、<code>code</code>。不需要手动拍平：在 SELECT、WHERE、ORDER BY 任何接受字段名的地方，都可以直接用点语法（<code>tool.id</code>）引用嵌套字段。',
      g7_p2: '使用 <code>SELECT *</code> 时，嵌套对象字段会自动平铺成子列（<code>tool.id</code>、<code>tool.title</code>…），不会再出现看不懂的 <code>{3个键}</code>。',
      g7_pre: "-- 嵌套对象：{ \"tool\": { \"id\": \"19\", \"title\": \"关键词概览\", \"code\": \"keyword-overview\" } }\n\n-- 用点语法提取嵌套字段\nSELECT type, tool.id, tool.title FROM data;\n\n-- 对嵌套字段进行条件过滤\nSELECT * FROM data WHERE tool.code = 'keyword-overview';",

      h2c: '二、 如何将 JSON 导出为 Excel 或 CSV？',
      h2c_p: 'JSON 嵌套复杂的结构往往让人头疼，而将其扁平化并导出为表格，是进行数据分析最直接的方式。本工具提供了一套完整的“JSON 转 Excel”流水线：',

      d1_h3: '1. 智能识别并生成表格',
      d1_p1: '你只需要在左侧点击包含多条记录的数组节点，右侧面板会自动识别其结构并渲染成数据表格。无论字段有多少个，都可以通过横向滚动查看。',

      d2_h3: '2. 勾选与过滤（专属列）',
      d2_p1: '很多时候，JSON 里有几十个字段，但你只关心其中的四五个。点击表格上方的 <strong>「⚙️ 列」</strong> 按钮，在弹出的面板中，勾选你需要的字段。这对于减少表格宽度、提高阅读体验极其重要。',

      d3_h3: '3. 一键复制或下载',
      d3_p1: '筛选完毕后，点击上方的工具栏按钮：',
      d3_li1: '<strong>📋 复制 (TSV)</strong>：直接将数据以制表符（Tab）分隔的形式复制到剪贴板，你只需要打开 Excel 粘贴（Ctrl+V），数据就会完美对齐到各个单元格中。',
      d3_li2: '<strong>⬇️ CSV / TSV</strong>：如果你需要生成文件发给同事，点击下载即可获得一个标准的表格文件。',

      d4_h3: '4. 为什么下载的表格中文不乱码？',
      d4_p1: '很多开发者遇到过：导出的 CSV 文件用 Excel 打开后，中文全部变成了乱码。这是因为普通的 UTF-8 编码没有包含 BOM 头。我们的工具在生成文件时，<strong>自动在文件开头加入了 BOM 标记（\\uFEFF）</strong>，确保 Excel 能准确识别 UTF-8 编码，从此告别乱码烦恼。',

      h2d: '三、 进阶技巧：处理复杂嵌套与生僻字段',

      a1_h3: '1. 无限层级展开与大文件支持',
      a1_p1: '如果你的 JSON 层级极深，左侧的结构树支持按需展开。即使数组有几千条，工具每次也只渲染 200 条，并在底部提供一个 <strong>“▼ 加载更多”</strong> 的按钮。这种“懒加载”机制保证了无论文件多大，浏览器都不会卡死，内存占用始终保持在极低水平。',

      a2_h3: '2. 一键定位与搜索',
      a2_p1: '如果你在页面上看到一个奇怪的报错码或者数字（比如 <code>47754</code>），想要知道它在 JSON 的哪个位置。你可以直接将这个数字输入到左侧的搜索框。工具会瞬间扫描整个 JSON，并列出所有匹配的路径（如 <code>$.result[728].organicTraffic</code>）。点击结果，即可精准跳转并高亮该节点。',

      a3_h3: '3. AI 智能字段翻译',
      a3_p1: '如果你接手了别人写的系统，或者抓取了国外的接口，你可能会看到满屏幕的 <code>intentCommercialPositions</code>、<code>serpFeaturesTrafficCost</code>。这太折磨人了！',
      a3_p2: '本工具内置了基础词汇库。如果你发现有些词不认识，点击左上角的 <strong>「✨ AI 翻译」</strong>，配置你自己的 API Key（支持 DeepSeek、ChatGPT 等），AI 会在几秒钟内识别出所有生僻的业务词汇，并将其翻译为符合行业语境的中文，永久缓存在你的浏览器中，极大地提升了阅读效率。',

      h2e: '四、 常见问题解答 (FAQ)',
      faq1_q: 'Q: 我的 JSON 文件有几十 MB，这个工具能打开吗？会卡死吗？',
      faq1_a: 'A: 不会卡死。传统的格式化工具会尝试一次性渲染所有 DOM 节点，导致浏览器内存溢出崩溃。本工具只渲染你当前视野内和已展开的节点，所以打开超大文件依然十分流畅。',
      faq2_q: 'Q: SQL 查询支持 JOIN 或 GROUP BY 聚合函数吗？',
      faq2_a: 'A: 目前内置的引擎为了保证极速的纯前端体验，专注于单表的核心查询功能（SELECT 含点语法嵌套字段、WHERE、ORDER BY、LIMIT）。暂不支持多表 JOIN 和 SUM/COUNT 等聚合操作。你可以将查询结果导出后，在 Excel 中进行聚合计算。',
      faq3_q: 'Q: 我的 JSON 数据包含公司机密或用户隐私，安全吗？',
      faq3_a: 'A: 绝对安全。本工具纯前端运行，没有后端服务器，所有解析、查询、导出均在你的浏览器（JavaScript 引擎）本地完成。你甚至可以按 F12 打开网络面板，或者断开网络连接使用，没有任何数据会被发送出去。',
      faq4_q: 'Q: 如果 JSON 格式有语法错误无法解析怎么办？',
      faq4_a: 'A: 在导入时工具会明确提示语法错误的具体位置（如第几行第几列缺少逗号）。如果你已经加载了数据，可以点击左侧的「📝 编辑 JSON」，在弹出的代码框中进行修改，修改完毕后点击应用即可重新解析。',
      faq5_q: 'Q: 我的字段是嵌套对象（比如 tool.id），能查询到深层数据吗？',
      faq5_a: "A: 可以。点语法在 SELECT、WHERE、ORDER BY 中均可使用，例如 SELECT tool.id, tool.title FROM data WHERE tool.code = 'keyword-overview'。使用 SELECT * 时，对象字段会自动平铺成子列，嵌套数据会以可读的列展示，而不是 {N个键}。",

      footer_text: 'JSON on SQL © 2024 - 由开源社区驱动 | 纯前端技术栈',

      loader_text: '正在解析 JSON...',

      t_title: '结构',
      aiTrans_title: '使用 AI 翻译未收录的字段',
      aiConfig_title: '配置 AI 接口',
      edit_btn: '📝 编辑 JSON',
      edit_title: '查看并修改原始 JSON',
      reload_btn: '📁 导入 JSON',
      reload_title: '重新导入新文件',
      toggle_title: '切换中英显示',
      search_ph: '🔍 搜索字段名或值，如 47754 或 traffic',
      clear_title: '清空',
      path_ph: '📍 路径直达：$.result[728] 或 728',
      go: '跳转',
      sql_label: 'SQL 查询',
      sql_ok: '✓ 已启用',
      ex_btn: '示例',
      ex_title: '填入示例查询',
      run_btn: '▶ 运行',
      run_title: '执行 SQL（Ctrl+Enter）',
      splitter_title: '上下拖动可调整 SQL 和表格的高度',
      empty_view: '← 请从左侧选择一个节点',

      m_h2: '📝 编辑原始 JSON',
      m_cancel: '取消',
      m_apply: '应用并重新解析 (Ctrl+Enter)',
      m_tip: '⚠️ 注意：如果文件过大（> 10MB），直接在文本框中编辑可能会导致浏览器卡顿。',
      m_ph: '在此粘贴或修改 JSON...',

      preview_items: '[{n} 项]',
      preview_keys: '{n} 个键',
      err_path_fmt: '路径格式错误：{s}',
      err_bracket: '未闭合的 [',
      err_index: '无效索引: {s}',
      load_more: '▼ 加载更多（还有 {n} 项，每次 {c}）',
      all_shown: '（已全部展示 {n} 项）',
      jump_root: '跳到根节点',
      jump_to: '跳到 {p}',
      copy_path: '📋 复制路径',
      copied: '✓ 已复制',
      copy_path_title: '复制当前完整路径',
      empty_obj: '空对象 {}',
      empty_arr: '空数组 []',
      copy_tsv: '📋 复制(TSV)',
      copy_tsv_title: '复制表格数据为 TSV 格式（可直接粘贴到 Excel）',
      dl_csv_title: '下载为 CSV 文件（包含所有记录及当前选择的列）',
      dl_tsv_title: '下载为 TSV 文件（包含所有记录及当前选择的列）',
      prev_page: '‹ 上一页',
      next_page: '下一页 ›',
      page_info: '第 {p} / {t} 页',
      sel_all: '全选',
      sel_none: '全不选',
      sel_reset: '恢复默认',
      cancel: '取消',
      apply: '应用',
      sel_count: '已选 {n} / {m}',
      need_one_field: '请至少选择一个字段',
      table_info: '共 {total} 条记录，显示 {cols} / {all} 个字段（点击单元格定位左侧树）',
      columns_btn: '⚙️ 列 ({a}/{b})',
      value_col: '值（点击可定位到左侧树）',
      locate_tip: '点击在左侧树定位到此节点',
      sql_tbl_comment: '-- 表: {t}（当前显示 {n} 个字段）\n',
      sql_run_hint: '-- 修改后按 Ctrl+Enter 或点「▶ 运行」执行\n\n',
      sql_value_array: '-- 当前是值数组（{t}）{c}\n-- 值数组不能直接 SQL 查询，请先选中上级的对象数组\n\n',
      sql_single: '-- 当前选中：{p} (第 {n} 条记录)\n-- 自动定位到父表 {t}\n\n',
      sql_generic: '-- 当前路径: {p}\n-- 表名推测: "{t}"{c}\n\n',
      sql_example: '-- 示例：查看 result 表最近的 20 条记录的关键字段\nSELECT date, organicTraffic, organicTrafficCost, traffic, trafficCost\nFROM result\nORDER BY date DESC\nLIMIT 20;',
      sql_empty: '请输入 SQL',
      sql_no_table: '找不到表 "{t}"\n\n可用表名：\n  {list}',
      no_tables: '（无）',
      sql_not_array: '"{t}" 不是数组',
      sql_error: 'SQL 错误：\n{m}',
      sql_result_label: '🔍 SQL 查询结果',
      sql_meta: '{r} 行 / 匹配 {m} 条（表 {t}）',
      close: '✕ 关闭',
      sql_no_rows: '查询结果为空（0 行）',
      search_none: '没有匹配项',
      search_trunc: '匹配 <span class="count">{total}+</span> 项，显示前 <span class="count">{n}</span> 项 <span class="warn">（已截断）</span>',
      search_total: '匹配 <span class="count">{total}</span> 项',
      search_nf: '未找到包含「{q}」的字段名或值',
      tag_key: '字段',
      tag_value: '值',
      key_is: '字段名 = ',
      view_record: '📄 查看所在记录',
      view_record_title: '跳转并查看这个值所属的完整记录：{p}',
      parsing: '正在解析 JSON...',
      reading: '正在读取文件...',
      alert_empty: '内容为空',
      alert_parse_fail: 'JSON 解析失败：\n{m}',
      alert_read_fail: '读取文件失败：\n{m}',
      edit_empty: '内容不能为空',
      parsing_short: '解析中...',
      alert_syntax: 'JSON 格式错误，请检查语法：\n{m}',
      err_path: '路径解析失败：\n{m}\n\n支持格式：\n  $.result[728]\n  result[728]\n  728\n  $["result"][728]["date"]',
      path_nf: '路径未找到：{p}\n\n是否跳到最接近的父节点？',
      se_cond: '无法解析条件: {s}',
      se_syntax: '语法错误：需要 SELECT ... FROM 表名',
      se_field: '无法解析字段: {s}',
      se_order: '无法解析 ORDER BY: {s}'
    }
  };

  let currentLang = 'en';

  function detectLang() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved === 'zh' || saved === 'en') return saved;
    const nav = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase();
    return nav.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function t(key, params) {
    let s = (STR[currentLang] && STR[currentLang][key]) ??
            (STR.en[key] !== undefined ? STR.en[key] : key);
    if (params) {
      for (const k in params) s = s.split('{' + k + '}').join(String(params[k]));
    }
    return s;
  }

  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  function applyLang(lang) {
    currentLang = (lang === 'zh') ? 'zh' : 'en';
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('lang-zh', currentLang === 'zh');
    document.body.classList.toggle('lang-en', currentLang === 'en');
    document.title = t('title');
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', t('meta_desc'));
    const metaKw = document.querySelector('meta[name="keywords"]');
    if (metaKw) metaKw.setAttribute('content', t('meta_kw'));
    const toggleBtn = document.getElementById('toggleCNBtn');
    if (toggleBtn) toggleBtn.textContent = currentLang === 'zh' ? 'EN' : '中文';
    applyStatic();
  }

  function getLang() { return currentLang; }

  function setLang(lang, persist) {
    applyLang(lang);
    if (persist !== false) {
      try { localStorage.setItem(STORAGE_KEY, currentLang); } catch (e) {}
    }
    return currentLang;
  }

  function toggle() {
    return setLang(currentLang === 'zh' ? 'en' : 'zh');
  }

  applyLang(detectLang());

  window.i18n = { t, getLang, setLang, toggle, applyStatic };
})();
