// ==UserScript==
// @name         Discourse 个人资料页旧版导航回退
// @name:en      Discourse Profile Tabs Restore
// @namespace    https://github.com/mtgpublic/discourse-menu
// @version      0.3.2
// @description  关闭 Discourse 实验性 sidebar_user_navigation，恢复个人资料页顶部横向 Tab 与常规侧边栏。自动在所有疑似 Discourse 站点生效，可用脚本菜单按站点禁用。
// @description:en  Disable Discourse's experimental sidebar_user_navigation to restore the classic horizontal profile tabs and the regular sidebar. Active on any suspected Discourse site automatically; exclude sites via the userscript menu.
// @author       mtgpublic
// @match        *://*/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/mtgpublic/discourse-menu
// @supportURL   https://github.com/mtgpublic/discourse-menu/issues
// @updateURL    https://raw.githubusercontent.com/mtgpublic/discourse-menu/main/discourse-profile-tabs-restore.user.js
// @downloadURL  https://raw.githubusercontent.com/mtgpublic/discourse-menu/main/discourse-profile-tabs-restore.user.js
// @license      MIT
// ==/UserScript==

/*
 * 原理（2026-09 于 linux.do 实机验证）：
 * 上游 PR https://github.com/discourse/discourse/pull/44050 引入站点设置 sidebar_user_navigation
 * （client: true 的 upcoming change）。开启后：
 *   1) 进入 /u/* 时 UserNavSidebarStateManager.forceUserNavSidebar() 把侧边栏强制切换为用户导航面板；
 *   2) body.user-nav-panel-active 触发 CSS 隐藏 .user-navigation-primary/secondary（旧 Tab 仍在 DOM 中，
 *      user.gjs 模板始终渲染 UserNav，仅被 CSS 隐藏）。
 * 本脚本在客户端把该设置翻转为 false 并复位侧边栏状态，应用即自行渲染旧版导航；
 * 之后所有读取（含 SPA 路由切换）都看到 false。若上游移除/改名该设置，脚本静默退出。
 *
 * 站点判定：全站注入（@match 通配全部 http/https 页面）后按特征预筛——
 * head 里的 <meta name="generator" content="Discourse ..."> 或 #data-preloaded 容器。
 * 非 Discourse 页面在 DOM 就绪仍无特征时退出，几乎零开销；禁用列表（黑名单）可按域排除。
 */

(() => {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const BODY_FLAG = 'user-nav-panel-active';
  const SETTING = 'sidebar_user_navigation';
  const LS_PREFIX = 'dptr.';

  // ---- 存取：优先 GM 存储，缺失时回落 localStorage ----
  const loadBlacklist = () => {
    try {
      if (typeof GM_getValue === 'function') {
        const v = GM_getValue('blacklist');
        if (v !== undefined) return v;
      }
    } catch { /* 沙箱异常时走回落 */ }
    try {
      const raw = localStorage.getItem(LS_PREFIX + 'blacklist');
      if (raw) return JSON.parse(raw);
    } catch { /* 忽略 */ }
    return [];
  };
  const saveBlacklist = (sites) => {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue('blacklist', sites); return; }
    } catch { /* 沙箱异常时走回落 */ }
    try { localStorage.setItem(LS_PREFIX + 'blacklist', JSON.stringify(sites)); } catch { /* 忽略 */ }
  };
  const normalizeHost = (input) => String(input || '').trim()
    .replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '').toLowerCase();

  // ---- 站点规则面板（禁用列表；任何站点上都可打开）----
  const openConfig = () => {
    const old = document.getElementById('dptr-config');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'dptr-config';
    panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;color:#222;'
      + 'border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);'
      + 'padding:12px;width:280px;font:13px/1.6 system-ui,sans-serif;';
    const render = () => {
      const sites = loadBlacklist();
      panel.innerHTML = '';
      const title = document.createElement('div');
      title.textContent = 'Discourse 导航回退 · 禁用站点';
      title.style.cssText = 'font-weight:600;margin-bottom:8px;';
      panel.appendChild(title);
      if (!sites.length) {
        const empty = document.createElement('div');
        empty.textContent = '（空）脚本在所有疑似 Discourse 站点生效';
        empty.style.cssText = 'color:#777;';
        panel.appendChild(empty);
      }
      const list = document.createElement('div');
      for (const s of sites) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        const name = document.createElement('span');
        name.textContent = s;
        const del = document.createElement('button');
        del.textContent = '✕';
        del.style.cssText = 'border:none;background:none;color:#c00;cursor:pointer;font-size:14px;';
        del.onclick = () => { saveBlacklist(loadBlacklist().filter((x) => x !== s)); render(); };
        row.append(name, del);
        list.appendChild(row);
      }
      panel.appendChild(list);
      const addRow = document.createElement('div');
      addRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      const input = document.createElement('input');
      input.placeholder = '添加禁用域名，例如 forum.example.com';
      input.style.cssText = 'flex:1;border:1px solid #ccc;border-radius:4px;padding:3px 6px;';
      const add = document.createElement('button');
      add.textContent = '添加';
      add.style.cssText = 'border:1px solid #ccc;border-radius:4px;padding:3px 10px;cursor:pointer;background:#f6f6f6;';
      add.onclick = () => {
        const host = normalizeHost(input.value);
        if (!host) return;
        const sites = loadBlacklist();
        if (!sites.includes(host)) { sites.push(host); saveBlacklist(sites); }
        render();
      };
      addRow.append(input, add);
      input.onkeydown = (e) => { if (e.key === 'Enter') add.click(); };
      panel.appendChild(addRow);
      const tip = document.createElement('div');
      tip.textContent = '脚本自动在疑似 Discourse 站点生效；此列表中的域名被排除。添加后刷新该站点页面生效。';
      tip.style.cssText = 'color:#777;font-size:11px;margin-top:8px;';
      panel.appendChild(tip);
      const close = document.createElement('div');
      close.textContent = '关闭';
      close.style.cssText = 'color:#0078d4;cursor:pointer;text-align:right;margin-top:4px;';
      close.onclick = () => panel.remove();
      panel.appendChild(close);
    };
    render();
    document.body.appendChild(panel);
  };

  if (typeof GM_registerMenuCommand === 'function') {
    try { GM_registerMenuCommand('站点规则管理', openConfig); } catch { /* 忽略 */ }
  }
  // 调试/验收钩子：默认不暴露，避免页面脚本借此检测脚本存在；
  // 需要验收时在站点 URL 后追加 dptr-debug 查询参数（任意值）才挂到 window 上
  // mode 标记脚本在本页的最终状态（active / blacklisted / inactive-non-discourse）
  const hook = { openConfig, sites: loadBlacklist, mode: 'starting' };
  try { if (new URLSearchParams(location.search).has('dptr-debug')) win.__dptr = hook; } catch { /* 忽略 */ }

  // ---- 主逻辑：翻转设置；已发生的接管就地复位 ----
  // done 与 restore 仅被 startMainLogic 内的观察器回调与轮询引用，随其一起定义，
  // 使 restore 对 stopObserving 的调用处于同一作用域
  const startMainLogic = () => {
    // 比较端同样归一化：兼容旧版本存入的、带端口的黑名单条目
    if (loadBlacklist().some((s) => normalizeHost(s) === location.hostname)) {
      hook.mode = 'blacklisted';
      return;
    }
    hook.mode = 'active';
    let done = false;
    const restore = () => {
      if (done) return;
      const container = win.Discourse && win.Discourse.__container__;
      if (!container) return;
      let siteSettings;
      try { siteSettings = container.lookup('service:site')?.siteSettings; } catch { return; }
      if (!siteSettings) return;
      // 站点设置在 boot 后经 /site.json 异步装载，键未出现前不能判定上游已移除，继续等待
      if (!(SETTING in siteSettings)) return;
      // 本次页面加载里接管可能已经发生（脚本注入晚于路由激活）：
      // 必须在翻转前读取 enabled——翻转后它恒为 false，会漏掉复位
      let sm = null;
      try { sm = container.lookup('service:user-nav-sidebar-state-manager'); } catch { /* 服务不存在则无需复位 */ }
      const takeoverActive = !!(sm && sm.enabled);
      siteSettings[SETTING] = false;
      if (takeoverActive) {
        try { sm.stopForcingUserNavSidebar(); } catch { /* 忽略 */ }
      }
      document.body && document.body.classList.remove(BODY_FLAG);
      done = true;
      stopObserving();
    };

    // body class 变化只发生在 <body> 上：body 出现后仅监听其 class 属性，
    // 避免 document-start 阶段对整棵树的逐变更回调；documentElement 在此刻可能尚为 null
    let bodyObserver = null;
    const onMut = () => {
      if (done) return;
      if (document.body && document.body.classList.contains(BODY_FLAG)) restore();
    };
    const docObserver = new MutationObserver(() => {
      if (!document.body) return;
      docObserver.disconnect();
      bodyObserver = new MutationObserver(onMut);
      bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      onMut();
    });
    docObserver.observe(document, { childList: true, subtree: true });
    const stopObserving = () => {
      docObserver.disconnect();
      if (bodyObserver) bodyObserver.disconnect();
    };

    const poll = setInterval(() => {
      if (done) { clearInterval(poll); return; }
      restore();
      if (done) clearInterval(poll);
    }, 50);
    setTimeout(() => clearInterval(poll), 30000);
  };

  // ---- 站点预筛：generator meta（head 内，最早出现）或 #data-preloaded ----
  // DOM 解析完毕仍无 Discourse 特征则静默退出
  const looksLikeDiscourse = () => {
    const gen = document.querySelector('meta[name="generator"]');
    if (gen && /discourse/i.test(gen.content || '')) return true;
    if (document.getElementById('data-preloaded')) return true;
    return false;
  };
  const prefilter = setInterval(() => {
    if (looksLikeDiscourse()) {
      clearInterval(prefilter);
      startMainLogic();
    } else if (document.readyState !== 'loading') {
      clearInterval(prefilter);
      hook.mode = 'inactive-non-discourse';
    }
  }, 100);
})();
