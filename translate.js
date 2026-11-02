/* ========== 翻译模块 ==========
 * 全局暴露：translateField(name)
 * 依赖：无
 * 被 app.js 调用，用于给字段名提供中文标注
 */
(function() {
  'use strict';

  // 拆词词典：驼峰拆分后逐词翻译（key 小写）
  const TRANSLATION_DICT = {
    // SEO / SEM
    organic: '自然', adwords: '广告', traffic: '流量', cost: '成本',
    position: '排名', positions: '排名', intent: '意图', commercial: '商业',
    informational: '信息型', navigational: '导航型', transactional: '交易型',
    unknown: '未知', branded: '品牌', non: '非', trend: '趋势', rank: '位次',
    serp: '搜索结果页', features: '特性', feature: '特性', without: '不含',
    ai: 'AI', overview: '概览',
    // 通用数据
    date: '日期', id: '标识', result: '结果', jsonrpc: 'JSON-RPC',
    name: '名称', type: '类型', value: '值', data: '数据', total: '总计',
    count: '数量', number: '数量', index: '索引', key: '键', list: '列表',
    item: '项', items: '项', user: '用户', time: '时间', status: '状态',
    message: '消息', error: '错误', code: '代码', url: '链接', link: '链接',
    title: '标题', description: '描述', content: '内容', page: '页面',
    size: '大小', length: '长度', created: '创建', updated: '更新', at: '于',
    start: '开始', end: '结束', first: '第一', last: '最后', average: '平均',
    avg: '平均', sum: '总和', min: '最小', max: '最大', price: '价格',
    amount: '金额', currency: '货币', email: '邮箱', phone: '电话',
    address: '地址', city: '城市', country: '国家', region: '地区',
    language: '语言', version: '版本', enabled: '启用', disabled: '禁用',
    active: '活跃', deleted: '已删除', public: '公开', private: '私有',
    default: '默认', config: '配置', settings: '设置', metadata: '元数据',
    meta: '元', tags: '标签', label: '标签', labels: '标签', note: '备注',
    notes: '备注', comment: '评论', comments: '评论', score: '分数',
    level: '等级', rate: '比率', ratio: '比率', percent: '百分比',
    percentage: '百分比', change: '变化', delta: '增量', diff: '差值',
    previous: '上一次', current: '当前', next: '下一个', prev: '上一个',
    old: '旧', new: '新', from: '从', to: '至', by: '按', with: '包含',
    and: '与', or: '或', not: '非', is: '是', has: '有', can: '可'
  };

  // 完整字段名精确翻译（优先级高于拆词）
  const SPECIAL_TRANSLATIONS = {
    jsonrpc: 'JSON-RPC 协议',
    aiOverviewPositions: 'AI 概览排名',
    serpFeaturesPositions: 'SERP 特性排名',
    serpFeaturesPositionsWithoutAiOverview: '不含 AI 概览的 SERP 特性排名',
    serpFeaturesPositionsBranded: '品牌 SERP 特性排名',
    serpFeaturesTraffic: 'SERP 特性流量',
    serpFeaturesTrafficBranded: '品牌 SERP 特性流量',
    serpFeaturesTrafficCost: 'SERP 特性流量成本',
    serpFeaturesTrafficNonBranded: '非品牌 SERP 特性流量',
    organicPositionsBranded: '品牌自然排名',
    organicPositionsTrend: '自然排名趋势',
    organicTrafficBranded: '品牌自然流量',
    organicTrafficCost: '自然流量成本',
    organicTrafficNonBranded: '非品牌自然流量',
    adwordsPositionsTrend: '广告排名趋势',
    adwordsTrafficCost: '广告流量成本',
    intentCommercialPositions: '商业意图排名',
    intentCommercialTraffic: '商业意图流量',
    intentCommercialTrafficCost: '商业意图流量成本',
    intentInformationalPositions: '信息型意图排名',
    intentInformationalTraffic: '信息型意图流量',
    intentInformationalTrafficCost: '信息型意图流量成本',
    intentNavigationalPositions: '导航型意图排名',
    intentNavigationalTraffic: '导航型意图流量',
    intentNavigationalTrafficCost: '导航型意图流量成本',
    intentTransactionalPositions: '交易型意图排名',
    intentTransactionalTraffic: '交易型意图流量',
    intentTransactionalTrafficCost: '交易型意图流量成本',
    intentUnknownPositions: '未知意图排名',
    intentUnknownTraffic: '未知意图流量',
    intentUnknownTrafficCost: '未知意图流量成本',
    positionsBranded: '品牌排名',
    trafficBranded: '品牌流量',
    trafficCost: '流量成本',
    trafficNonBranded: '非品牌流量'
  };
  // 获取本地存储的各类词典
  function getUserDict() {
    try { return JSON.parse(localStorage.getItem('json_tool_custom_dict') || '{}'); } catch (e) { return {}; }
  }
  function getAiDict() {
    try { return JSON.parse(localStorage.getItem('json_tool_ai_dict') || '{}'); } catch (e) { return {}; }
  }

  function splitCamelCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase().split(/\s+/).filter(Boolean);
  }

  function translateField(name) {
    if (!name) return '';
    if (!/[a-zA-Z]/.test(name)) return '';
    
    const userDict = getUserDict();
    const aiDict = getAiDict();

    // 优先级 1：用户手动配置的词典
    if (userDict[name]) return userDict[name];
    // 优先级 2：AI 批量翻译并缓存的词典
    if (aiDict[name]) return aiDict[name];
    // 优先级 3：内置精准特判词典
    if (SPECIAL_TRANSLATIONS[name]) return SPECIAL_TRANSLATIONS[name];

    // 优先级 4：内置拆词翻译
    const parts = splitCamelCase(name);
    const translated = parts.map(p => TRANSLATION_DICT[p] || p);
    const result = translated.join(' ');
    if (result === parts.join(' ')) return '';
    return result;
  }

  // 暴露全局方法
  window.translateField = translateField;
  window.jsonDict = { 
    getUserDict, 
    saveUserDict: (d) => localStorage.setItem('json_tool_custom_dict', JSON.stringify(d)),
    getAiDict,
    saveAiDict: (d) => localStorage.setItem('json_tool_ai_dict', JSON.stringify(d))
  };
})();