# discourse-menu

**Discourse 个人资料页旧版导航回退**（Discourse Profile Tabs Restore）——一个让 Discourse 站点恢复个人资料页顶部横向 Tab 导航的油猴脚本，自动适配所有疑似 Discourse 的站点。

## 背景

2026-09 起 linux.do 启用了 Discourse 实验性 upcoming change **`sidebar_user_navigation`**
（[PR #44050](https://github.com/discourse/discourse/pull/44050)，[官方公告](https://meta.discourse.org/t/experimental-user-sidebar-navigation/413150)）：
个人资料页顶部的横向 Tab（总结/活动/通知/消息/邀请/徽章…）被 CSS 隐藏，导航整体搬进左侧边栏，
侧边栏在进入资料页时被强制接管为用户导航面板。该设置为站点级，普通用户在偏好设置里**无法关闭**。

## 原理

旧导航组件从未被移除——`user.gjs` 模板始终渲染 `<UserNav>`，只是被
`body.user-nav-panel-active` 触发的 CSS 隐藏。脚本在 `document-start`
等待 Ember 容器就绪、站点设置经 `/site.json` 装载后，于客户端把
`sidebar_user_navigation` 翻转为 `false`，并复位已发生的侧边栏接管、摘掉 body class。
应用此后自行渲染旧版导航（含 SPA 路由切换），桌面端与移动端行为一并还原。
若上游移除或改名该设置，脚本静默退出，不影响页面。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)；
2. Tampermonkey → 新建脚本 → 粘贴 [`discourse-profile-tabs-restore.user.js`](discourse-profile-tabs-restore.user.js) 全文并保存；
3. 打开任意 Discourse 站点即可生效（脚本菜单出现「站点规则管理」）。

## 站点规则

- 脚本全站注入，运行时按特征预筛（`<meta name="generator">` 含 Discourse，或存在 `#data-preloaded` 容器），仅在疑似 Discourse 站点激活；其他页面在 DOM 就绪前即静默退出，几乎零开销。
- 排除某个站点：脚本菜单 →「站点规则管理」→ 添加域名（存于 Tampermonkey 存储），刷新该站生效；从列表移除即恢复。
- 配置面板可在任何站点的脚本菜单中打开。

## 开发环境

- [`debug/start-edge.cmd`](debug/start-edge.cmd)：启动独立的 Edge 调试实例（CDP 端口 9222、
  用户数据目录 `debug/edge-profile/`，不污染日常浏览器配置，登录态与 Tampermonkey 均持久化）；
- `tmp/`：调研与验收用临时产物（已 gitignore），验收覆盖硬加载、SPA、移动端与多站点场景。

## 已知限制

- 该设置当前为 experimental，上游可能改名或调整行为；脚本检测不到设置时会静默退出。
- 若站点管理员关闭了该 upcoming change，脚本自动成为空操作，无需卸载。
- 个别未携带 generator meta 与 preloaded 容器的 Discourse 定制版可能无法被识别为疑似站点。

## 致谢

- 感谢 [linux.do](https://linux.do) ——「新的理想型社区」。本脚本的问题来源、思路调研与全部实机验证均在 linux.do 完成，没有这个社区就没有这个脚本。

## 许可证

[MIT](https://opensource.org/licenses/MIT)
