// ==UserScript==
// @name         Discourse 个人资料页旧版导航回退
// @name:en      Discourse Profile Tabs Restore
// @namespace    https://github.com/mtgpublic/discourse-menu
// @version      0.2.1
// @description  关闭 Discourse 实验性 sidebar_user_navigation，恢复个人资料页顶部横向 Tab 与常规侧边栏。默认启用 linux.do，可经脚本菜单增删站点。
// @author       mtgpublic
// @match        https://linux.do/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
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
 * 注意：新增站点除在脚本菜单中启用外，还需在本脚本头部追加一行 @match。
 */

(() => {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const BODY_FLAG = 'user-nav-panel-active';
  const SETTING = 'sidebar_user_navigation';
  const LS_PREFIX = 'dptr.';
  const DEFAULT_SITES = ['linux.do'];

  // ---- 存取：优先 GM 存储，缺失时回落 localStorage ----
  const loadSites = () => {
    try {
      if (typeof GM_getValue === 'function') {
        const v = GM_getValue('sites');
        if (v !== undefined) return v;
      }
    } catch { /* 沙箱异常时走回落 */ }
    try {
      const raw = localStorage.getItem(LS_PREFIX + 'sites');
      if (raw) return JSON.parse(raw);
    } catch { /* 忽略 */ }
    return DEFAULT_SITES.slice();
  };
  const saveSites = (sites) => {
    try {
      if (typeof GM_setValue === 'function') { GM_setValue('sites', sites); return; }
    } catch { /* 沙箱异常时走回落 */ }
    try { localStorage.setItem(LS_PREFIX + 'sites', JSON.stringify(sites)); } catch { /* 忽略 */ }
  };
  const normalizeHost = (input) => String(input || '').trim()
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (!loadSites().length) saveSites(DEFAULT_SITES.slice());

  // ---- 站点白名单配置（无依赖的轻量面板）----
  const openConfig = () => {
    const old = document.getElementById('dptr-config');
    if (old) { old.remove(); return; }
    const panel = document.createElement('div');
    panel.id = 'dptr-config';
    panel.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;background:#fff;color:#222;'
      + 'border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);'
      + 'padding:12px;width:280px;font:13px/1.6 system-ui,sans-serif;';
    const render = () => {
      const sites = loadSites();
      panel.innerHTML = '';
      const title = document.createElement('div');
      title.textContent = 'Discourse 导航回退 · 启用站点';
      title.style.cssText = 'font-weight:600;margin-bottom:8px;';
      panel.appendChild(title);
      const list = document.createElement('div');
      for (const s of sites) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        const name = document.createElement('span');
        name.textContent = s;
        const del = document.createElement('button');
        del.textContent = '✕';
        del.style.cssText = 'border:none;background:none;color:#c00;cursor:pointer;font-size:14px;';
        del.onclick = () => { saveSites(loadSites().filter((x) => x !== s)); render(); };
        row.append(name, del);
        list.appendChild(row);
      }
      panel.appendChild(list);
      const addRow = document.createElement('div');
      addRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;';
      const input = document.createElement('input');
      input.placeholder = '例如 meta.discourse.org';
      input.style.cssText = 'flex:1;border:1px solid #ccc;border-radius:4px;padding:3px 6px;';
      const add = document.createElement('button');
      add.textContent = '添加';
      add.style.cssText = 'border:1px solid #ccc;border-radius:4px;padding:3px 10px;cursor:pointer;background:#f6f6f6;';
      add.onclick = () => {
        const host = normalizeHost(input.value);
        if (!host) return;
        const sites = loadSites();
        if (!sites.includes(host)) { sites.push(host); saveSites(sites); }
        render();
      };
      addRow.append(input, add);
      input.onkeydown = (e) => { if (e.key === 'Enter') add.click(); };
      panel.appendChild(addRow);
      const tip = document.createElement('div');
      tip.textContent = '添加后刷新该站点页面生效。若脚本未在此站注入，还须在脚本头部追加一行 @match https://域名/*。';
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

  // 菜单命令必须在白名单判断之前注册：未启用的站点上也要能打开面板添加自身
  if (typeof GM_registerMenuCommand === 'function') {
    try { GM_registerMenuCommand('启用站点管理', openConfig); } catch { /* 忽略 */ }
  }
  // 调试/验收钩子：供自动化测试与人工排查使用
  try { win.__dptr = { openConfig, sites: loadSites }; } catch { /* 忽略 */ }

  if (!loadSites().includes(location.hostname)) return;

  // ---- 主逻辑：尽早翻转设置；已发生的接管就地复位 ----
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
    let takeoverActive = false;
    try {
      const sm = container.lookup('service:user-nav-sidebar-state-manager');
      takeoverActive = !!(sm && sm.enabled);
    } catch { /* 服务不存在则无需复位 */ }
    siteSettings[SETTING] = false;
    if (takeoverActive) {
      try { container.lookup('service:user-nav-sidebar-state-manager').stopForcingUserNavSidebar(); } catch { /* 忽略 */ }
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
})();
