/* ========== 迷你 SQL 引擎 ==========
 * 支持：SELECT 字段列表 / *、WHERE（= != <> > < >= <= LIKE AND OR）、
 *       ORDER BY、LIMIT n [OFFSET m]
 * 全局暴露：
 *   parseSQL(sql)              → AST
 *   executeSQL(sql, rows)      → { columns, rows, totalMatched, ... }
 *   findTableByName(root, n)   → { path, data } | null
 *   listArrayNames(root)       → string[]
 *   parseValue(s)              → 值解析
 * 依赖：无
 */

(function() {
  'use strict';

  // ========== 值解析 ==========
  function parseValue(s) {
    s = String(s).trim();
    if (!s) return '';
    const first = s[0], last = s[s.length - 1];
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
      return s.slice(1, -1);
    }
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return Number(s);
    const up = s.toUpperCase();
    if (up === 'NULL') return null;
    if (up === 'TRUE') return true;
    if (up === 'FALSE') return false;
    return s;
  }

  // ========== 顶层关键字拆分（支持括号、字符串保护） ==========
  function splitTopLevel(expr, keyword) {
    const parts = [];
    let depth = 0, inStr = false, quoteChar = null;
    let buf = '';
    const kwLen = keyword.length;
    const upExpr = expr.toUpperCase();
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (inStr) {
        buf += ch;
        if (ch === quoteChar) inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true; quoteChar = ch; buf += ch; continue;
      }
      if (ch === '(') { depth++; buf += ch; continue; }
      if (ch === ')') { depth--; buf += ch; continue; }
      if (depth === 0 && /\s/.test(ch)) {
        let j = i;
        while (j < expr.length && /\s/.test(expr[j])) j++;
        if (upExpr.slice(j, j + kwLen) === keyword &&
            (j + kwLen >= expr.length || /[\s(]/.test(expr[j + kwLen]))) {
          parts.push(buf);
          buf = '';
          i = j + kwLen - 1;
          continue;
        }
      }
      buf += ch;
    }
    parts.push(buf);
    return parts.length > 1 ? parts : [expr];
  }

  // ========== WHERE 解析 ==========
  function parseWhere(expr) {
    expr = expr.trim();
    const orParts = splitTopLevel(expr, 'OR');
    if (orParts.length > 1) {
      return { type: 'or', children: orParts.map(p => parseWhere(p)) };
    }
    const andParts = splitTopLevel(expr, 'AND');
    if (andParts.length > 1) {
      return { type: 'and', children: andParts.map(p => parseWhere(p)) };
    }
    const m = expr.match(
      /^\s*\(?\s*["']?([\w\u4e00-\u9fa5.]+)["']?\s*(>=|<=|!=|<>|=|>|<|LIKE)\s*([\s\S]+?)\s*\)?\s*$/i
    );
    if (!m) throw new Error('无法解析条件: ' + expr);
    const [, field, op, valuePart] = m;
    return { type: 'cond', field, op: op.toUpperCase(), value: parseValue(valuePart) };
  }

  // ========== SQL 解析 ==========
  function parseSQL(sql) {
    sql = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    sql = sql.replace(/;\s*$/, '');

    const m = sql.match(
      /^SELECT\s+([\s\S]+?)\s+FROM\s+["']?([\w\u4e00-\u9fa5.]+)["']?([\s\S]*)$/i
    );
    if (!m) throw new Error('语法错误：需要 SELECT ... FROM 表名');
    const [, selectPart, tableName, rest] = m;

    // SELECT 字段
    const selectItems = selectPart
      .split(',')
      .map(s => {
        s = s.trim();
        if (s === '*') return { type: 'star' };
        const mm = s.match(
          /^["']?([\w\u4e00-\u9fa5.]+)["']?(?:\s+AS\s+["']?([\w\u4e00-\u9fa5]+)["']?)?$/i
        );
        if (!mm) throw new Error('无法解析字段: ' + s);
        return { type: 'field', name: mm[1], alias: mm[2] || mm[1] };
      })
      .filter(Boolean);

    // WHERE / ORDER BY / LIMIT
    let wherePart = null, orderByPart = null, limitPart = null;

    const whereMatch = rest.match(/\bWHERE\b([\s\S]*?)(?=\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    if (whereMatch) wherePart = whereMatch[1].trim();

    const orderMatch = rest.match(/\bORDER\s+BY\b([\s\S]*?)(?=\bLIMIT\b|$)/i);
    if (orderMatch) orderByPart = orderMatch[1].trim();

    const limitMatch = rest.match(/\bLIMIT\s+(\d+)(?:\s+OFFSET\s+(\d+))?/i);
    if (limitMatch) {
      limitPart = {
        limit: parseInt(limitMatch[1], 10),
        offset: limitMatch[2] ? parseInt(limitMatch[2], 10) : 0
      };
    }

    const whereClause = wherePart ? parseWhere(wherePart) : null;

    let orderBy = null;
    if (orderByPart) {
      orderBy = orderByPart.split(',').map(s => {
        const mm = s.trim().match(/^["']?(\w+)["']?(\s+(ASC|DESC))?$/i);
        if (!mm) throw new Error('无法解析 ORDER BY: ' + s);
        return { field: mm[1], desc: (mm[3] || 'ASC').toUpperCase() === 'DESC' };
      });
    }

    return { selectItems, tableName, whereClause, orderBy, limit: limitPart };
  }

  // ========== 条件求值 ==========
  function evalCondition(cond, row) {
    if (cond.type === 'and') return cond.children.every(c => evalCondition(c, row));
    if (cond.type === 'or') return cond.children.some(c => evalCondition(c, row));
    if (cond.type === 'cond') {
      const cell = row[cond.field];
      const val = cond.value;
      switch (cond.op) {
        case '=': return cell === val || String(cell) === String(val);
        case '!=':
        case '<>': return cell !== val && String(cell) !== String(val);
        case '>': return Number(cell) > Number(val);
        case '<': return Number(cell) < Number(val);
        case '>=': return Number(cell) >= Number(val);
        case '<=': return Number(cell) <= Number(val);
        case 'LIKE': {
          const pattern = String(val).replace(/%/g, '.*').replace(/_/g, '.');
          try {
            return new RegExp('^' + pattern + '$', 'i').test(String(cell));
          } catch (e) { return false; }
        }
        default: return false;
      }
    }
    return true;
  }

  // ========== 执行 ==========
  function executeSQL(sql, dataSource) {
    const parsed = parseSQL(sql);
    let filtered = dataSource;

    if (parsed.whereClause) {
      filtered = filtered.filter(row => evalCondition(parsed.whereClause, row));
    }

    if (parsed.orderBy && parsed.orderBy.length > 0) {
      filtered = filtered.slice().sort((a, b) => {
        for (const { field, desc } of parsed.orderBy) {
          const va = a[field], vb = b[field];
          if (va === vb) continue;
          if (va === undefined || va === null) return desc ? 1 : -1;
          if (vb === undefined || vb === null) return desc ? -1 : 1;
          if (typeof va === 'number' && typeof vb === 'number') {
            return desc ? vb - va : va - vb;
          }
          const sa = String(va), sb = String(vb);
          return desc ? sb.localeCompare(sa) : sa.localeCompare(sb);
        }
        return 0;
      });
    }

    const totalMatched = filtered.length;

    if (parsed.limit) {
      filtered = filtered.slice(parsed.limit.offset, parsed.limit.offset + parsed.limit.limit);
    }

    // 收集所有键
    const allKeys = new Set();
    dataSource.forEach(r => {
      if (r && typeof r === 'object') Object.keys(r).forEach(k => allKeys.add(k));
    });
    const allKeysArr = [...allKeys];

    let columns = [];
    const isStar = parsed.selectItems.some(it => it.type === 'star');
    if (isStar) {
      columns = allKeysArr.map(k => ({ name: k, alias: k }));
    } else {
      columns = parsed.selectItems
        .filter(it => it.type === 'field')
        .map(it => ({ name: it.name, alias: it.alias }));
    }

    const outRows = filtered.map(row =>
      columns.map(c => {
        if (!row || typeof row !== 'object') return undefined;
        return row[c.name];
      })
    );

    return {
      columns,
      rows: outRows,
      totalMatched,
      tableName: parsed.tableName,
      parsedSQL: sql.trim()
    };
  }

  // ========== 表名解析 ==========
  function findTableByName(root, name) {
    let found = null;
    function walk(node, path) {
      if (found) return;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) walk(node[i], path.concat(i));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          const newPath = path.concat(k);
          if (!found && k === name && Array.isArray(node[k])) {
            found = { path: newPath, data: node[k] };
            return;
          }
          walk(node[k], newPath);
        }
      }
    }
    walk(root, []);
    return found;
  }

  function listArrayNames(root) {
    const names = [];
    function walk(node) {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (Array.isArray(node[k])) names.push(k);
          walk(node[k]);
        }
      }
    }
    walk(root);
    return [...new Set(names)];
  }

  // ========== 全局暴露 ==========
  window.SQLEngine = {
    parseSQL,
    executeSQL,
    findTableByName,
    listArrayNames,
    parseValue
  };
})();