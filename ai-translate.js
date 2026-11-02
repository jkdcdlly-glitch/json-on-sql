/* ========== AI 智能翻译模块 ==========
 * 功能：提取未翻译字段，调用大模型 API 翻译，本地缓存
 * 特性：动态注入 HTML/CSS，不污染主页面代码，模块化独立运行
 */

(function() {
  'use strict';

  // ===== 1. 动态注入 CSS =====
  const css = `
    .ai-modal-overlay {
      display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      z-index: 1000; align-items: center; justify-content: center; padding: 20px;
      backdrop-filter: blur(2px);
    }
    .ai-modal-content {
      background: #fff; max-width: 520px; width: 100%; border-radius: 12px;
      padding: 28px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      animation: modalIn 0.2s ease-out;
    }
    @keyframes modalIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .ai-modal-header h2 { font-size: 20px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .ai-tip { font-size: 12px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; line-height: 1.5; }
    .ai-form-group { margin-bottom: 16px; }
    .ai-form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #334155; }
    .ai-form-group input, .ai-form-group select {
      width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px;
      outline: none; font-size: 13.5px; transition: all 0.2s; background: #fff; color: #1e293b;
    }
    .ai-form-group input:focus, .ai-form-group select:focus {
      border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
    }
    .ai-form-group input:read-only { background: #f1f5f9; color: #64748b; cursor: not-allowed; border-color: #e2e8f0; }
    
    /* 新增：API Key 小眼睛样式 */
    .ai-key-wrapper { position: relative; display: flex; align-items: center; }
    .ai-key-wrapper input { padding-right: 40px; }
    .ai-eye-btn {
      position: absolute; right: 10px; background: none; border: none;
      cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center;
      padding: 4px; border-radius: 4px; transition: color 0.2s, background 0.2s;
    }
    .ai-eye-btn:hover { color: #475569; background: #f1f5f9; }
    .ai-eye-btn svg { width: 18px; height: 18px; }

    .ai-modal-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
    .ai-footer-right { display: flex; gap: 12px; }
    .ai-btn { padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
    .ai-btn-cancel { background: #f1f5f9; color: #475569; }
    .ai-btn-cancel:hover { background: #e2e8f0; }
    .ai-btn-save { background: #8b5cf6; color: #fff; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.2); }
    .ai-btn-save:hover { background: #7c3aed; }
    .ai-btn-clear { background: transparent; color: #ef4444; padding: 10px 0; }
    .ai-btn-clear:hover { color: #b91c1c; }
    
    #aiLoading { display: none; position: fixed; inset: 0; background: rgba(255,255,255,0.8); z-index: 1100; flex-direction: column; align-items: center; justify-content: center; }
    #aiLoading .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #8b5cf6; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ===== 2. 动态注入 HTML =====
  const html = `
    <div id="aiModal" class="ai-modal-overlay">
      <div class="ai-modal-content">
        <div class="ai-modal-header">
          <h2>✨ 配置 AI 翻译引擎</h2>
        </div>
        <div class="ai-tip">
          🔒 <b>安全承诺：</b> API Key 仅保存在您的浏览器本地（LocalStorage），绝不经过任何服务器。本地字典不认识的生僻词，将由 AI 智能补全并缓存。
        </div>
        <div class="ai-form-group">
          <label>选择 AI 服务商</label>
          <select id="aiProvider">
            <option value="deepseek">DeepSeek (推荐 · 极快且便宜)</option>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="kimi">Kimi (月之暗面)</option>
            <option value="qwen">阿里云 (通义千问)</option>
            <option value="zhipu">智谱 (GLM-4-Flash 免费)</option>
            <option value="custom">自定义 (兼容 OpenAI 接口)</option>
          </select>
        </div>
        
        <div class="ai-form-group">
          <label>API Key</label>
          <div class="ai-key-wrapper">
            <input type="password" id="aiKey" placeholder="sk-xxxxxxxxxxxxxxxx">
            <button type="button" id="aiToggleKeyBtn" class="ai-eye-btn" title="显示/隐藏 Key">
              <!-- 默认是闭眼图标（隐藏密码） -->
              <svg id="eyeClosedIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
              <!-- 睁眼图标（显示密码），默认隐藏 -->
              <svg id="eyeOpenIcon" style="display:none;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </button>
          </div>
        </div>

        <div class="ai-form-group">
          <label>Base URL (接口地址)</label>
          <input type="text" id="aiUrl" placeholder="https://api.xxx.com/v1/chat/completions" readonly>
        </div>
        <div class="ai-form-group">
          <label>Model (模型名称)</label>
          <input type="text" id="aiModel" placeholder="deepseek-chat" readonly>
        </div>
        <div class="ai-modal-footer">
          <button id="aiClearBtn" class="ai-btn ai-btn-clear">清除本地配置</button>
          <div class="ai-footer-right">
            <button id="aiCloseBtn" class="ai-btn ai-btn-cancel">取消</button>
            <button id="aiSaveBtn" class="ai-btn ai-btn-save">保存并翻译</button>
          </div>
        </div>
      </div>
    </div>
    <div id="aiLoading">
      <div class="spinner"></div>
      <div style="margin-top:16px; font-weight:bold; color:#8b5cf6;">AI 正在飞速翻译中，请稍候...</div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  // ===== 3. 配置字典 =====
  const AI_PROVIDERS = {
    deepseek: { url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
    openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
    kimi: { url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
    qwen: { url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-turbo' },
    zhipu: { url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' },
    custom: { url: '', model: '' }
  };

  // ===== 4. 业务逻辑 =====
  const $ = id => document.getElementById(id);
  const aiProvider = $('aiProvider'), aiKey = $('aiKey'), aiUrl = $('aiUrl'), aiModel = $('aiModel');
  const aiModal = $('aiModal'), aiLoading = $('aiLoading');

  // 小眼睛逻辑：切换密码显示/隐藏
  const aiToggleKeyBtn = $('aiToggleKeyBtn');
  const eyeClosedIcon = $('eyeClosedIcon');
  const eyeOpenIcon = $('eyeOpenIcon');

  aiToggleKeyBtn.addEventListener('click', () => {
    if (aiKey.type === 'password') {
      aiKey.type = 'text';
      eyeClosedIcon.style.display = 'none';
      eyeOpenIcon.style.display = 'block';
    } else {
      aiKey.type = 'password';
      eyeClosedIcon.style.display = 'block';
      eyeOpenIcon.style.display = 'none';
    }
  });

  // 服务商切换联动
  aiProvider.addEventListener('change', () => {
    const cfg = AI_PROVIDERS[aiProvider.value];
    aiUrl.value = cfg.url;
    aiModel.value = cfg.model;
    if (aiProvider.value === 'custom') {
      aiUrl.removeAttribute('readonly');
      aiModel.removeAttribute('readonly');
    } else {
      aiUrl.setAttribute('readonly', true);
      aiModel.setAttribute('readonly', true);
    }
  });

  // 读取本地配置并回显
  function loadConfigToModal() {
    const savedProvider = localStorage.getItem('json_tool_ai_provider') || 'deepseek';
    aiProvider.value = savedProvider;
    aiKey.value = localStorage.getItem('json_tool_ai_key') || '';
    aiProvider.dispatchEvent(new Event('change'));
    
    if (savedProvider === 'custom') {
      aiUrl.value = localStorage.getItem('json_tool_ai_url') || '';
      aiModel.value = localStorage.getItem('json_tool_ai_model') || '';
    }
    
    // 每次打开弹窗，密码默认隐藏
    aiKey.type = 'password';
    eyeClosedIcon.style.display = 'block';
    eyeOpenIcon.style.display = 'none';
  }

  // 递归提取 JSON 中的所有 Key
  function extractAllKeys(obj) {
    const keys = new Set();
    function walk(node) {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node !== null && typeof node === 'object') {
        for (const k of Object.keys(node)) { keys.add(k); walk(node[k]); }
      }
    }
    walk(obj);
    return Array.from(keys);
  }

  // 事件：点击边栏按钮
  document.addEventListener('click', (e) => {
    if (!e.target) return;

    // 点击 ⚙️ 按钮：纯打开配置
    if (e.target.id === 'aiConfigBtn') {
      loadConfigToModal();
      aiModal.style.display = 'flex';
    }
    
    // 点击 ✨ AI 翻译 按钮
    if (e.target.id === 'aiTransBtn') {
      if (!window.jsonAppData || !window.jsonAppData.getData()) {
        return alert('请先加载 JSON 数据');
      }
      
      const allKeys = extractAllKeys(window.jsonAppData.getData());
      const untranslatedKeys = allKeys.filter(k => !window.translateField(k));

      if (untranslatedKeys.length === 0) {
        return alert('太棒了！当前 JSON 的所有字段已被本地词典完美覆盖，无需 AI 翻译。');
      }

      loadConfigToModal();

      // 如果没配置过 Key，弹窗提示；如果配置过，直接开始翻译
      if (!aiKey.value) {
        aiModal.style.display = 'flex';
      } else {
        doAiTranslate(untranslatedKeys, aiUrl.value, aiKey.value, aiModel.value);
      }
    }
  });

  $('aiCloseBtn').addEventListener('click', () => aiModal.style.display = 'none');

  // 清除配置
  $('aiClearBtn').addEventListener('click', () => {
    if (confirm('确定要清除本地保存的 AI 配置吗？')) {
      localStorage.removeItem('json_tool_ai_provider');
      localStorage.removeItem('json_tool_ai_key');
      localStorage.removeItem('json_tool_ai_url');
      localStorage.removeItem('json_tool_ai_model');
      loadConfigToModal();
      alert('已清除配置');
    }
  });

  // 保存配置并翻译
  $('aiSaveBtn').addEventListener('click', () => {
    const p = aiProvider.value;
    const k = aiKey.value.trim();
    const u = aiUrl.value.trim();
    const m = aiModel.value.trim();
    
    if (!k) return alert('请填写 API Key');
    if (!u || !m) return alert('请填写完整的 URL 和 模型名称');

    localStorage.setItem('json_tool_ai_provider', p);
    localStorage.setItem('json_tool_ai_key', k);
    localStorage.setItem('json_tool_ai_url', u);
    localStorage.setItem('json_tool_ai_model', m);
    aiModal.style.display = 'none';
    
    // 提取并开始翻译
    const allKeys = extractAllKeys(window.jsonAppData.getData());
    const untranslated = allKeys.filter(key => !window.translateField(key));
    if (untranslated.length > 0) {
      doAiTranslate(untranslated, u, k, m);
    } else {
      alert('保存成功！当前数据没有需要补全的字段。');
    }
  });

  // 执行翻译
  async function doAiTranslate(keys, apiUrl, apiKey, aiModelName) {
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      batches.push(keys.slice(i, i + BATCH_SIZE));
    }

    aiLoading.style.display = 'flex';
    const aiDict = window.jsonDict.getAiDict();
    let total = 0;

    try {
      for (const batch of batches) {
        const prompt = `你是一个数据字典翻译助手。请将以下英文变量名（驼峰或下划线）翻译为符合开发/业务语境的中文。请严格输出 JSON 对象，Key为原英文，Value为中文翻译，不要输出任何 markdown 标记。\n\n字段:\n${JSON.stringify(batch)}`;
        
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${apiKey.trim()}` 
          },
          body: JSON.stringify({
            model: aiModelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || errData.message || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }

        const data = await res.json();
        let content = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const resultObj = JSON.parse(content);
        Object.assign(aiDict, resultObj);
        total += Object.keys(resultObj).length;
      }

      window.jsonDict.saveAiDict(aiDict);
      alert(`翻译成功！补全了 ${total} 个字段并缓存到本地。`);
      
      if (window.jsonAppData) window.jsonAppData.refreshView();

    } catch (err) {
      console.error(err);
      alert(`AI 翻译失败：\n${err.message}\n\n请检查您的 API Key 或额度。`);
    } finally {
      aiLoading.style.display = 'none';
    }
  }

})();