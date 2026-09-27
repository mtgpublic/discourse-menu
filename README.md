# discourse-menu

**Discourse 个人资料页旧版导航回退**（Discourse Profile Tabs Restore）——一个让 Discourse 站点（默认 [linux.do](https://linux.do)）恢复个人资料页顶部横向 Tab 导航的油猴脚本。

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
3. 打开 linux.do 任意页面即可生效（脚本菜单出现「启用站点管理」）。

## 配置站点

- 默认仅启用 `linux.do`；
- 脚本菜单 →「启用站点管理」可添加/删除站点（存于 Tampermonkey 存储）；
- 新站点还需在脚本头部追加一行 `@match https://<域名>/*`，否则脚本不会在该站注入。

## 开发环境

- [`debug/start-edge.cmd`](debug/start-edge.cmd)：启动独立的 Edge 调试实例（CDP 端口 9222、
  用户数据目录 `debug/edge-profile/`，不污染日常浏览器配置，登录态与 Tampermonkey 均持久化）；
- `tmp/`：调研与验收用临时产物（已 gitignore），验收脚本以
  `Page.addScriptToEvaluateOnNewDocument` 注入并验证硬加载与 SPA 两个场景。

## 已知限制

- 该设置当前为 experimental，上游可能改名或调整行为；脚本检测不到设置时会静默退出。
- 若站点管理员关闭了该 upcoming change，脚本自动成为空操作，无需卸载。

## 致谢

- 感谢 [linux.do](https://linux.do) ——「新的理想型社区」。本脚本的问题来源、思路调研与全部实机验证均在 linux.do 完成，没有这个社区就没有这个脚本。
- 感谢 [Discourse](https://github.com/discourse/discourse) 团队持续以 upcoming change 的形式透明地灰度实验性功能，使客户端侧的回退成为可能。

## 许可证

[MIT](https://opensource.org/licenses/MIT)
