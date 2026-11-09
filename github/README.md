# GitHub Pages 部署

源文件在 `rebuild/`。工作流在 `.github/workflows/pages.yml`：推送 `main` 后，Node.js 22 会安装锁定依赖、执行检查、构建，然后部署到 GitHub Pages。也可在 Actions 中手动运行。

首次使用：将这个仓库推送至你选择的 GitHub 仓库，在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。网站的实际访问范围由 GitHub Pages 的设置和账号方案决定；仓库私有并不代表网页一定私有。

本地复现：

```sh
cd rebuild
npm ci
npm test
npm run build
cd ..
node github/stage-pages.mjs
```

最后一行会输出一个临时目录，可用任意静态服务器预览。指定输出目录时，该目录必须为空，例如 `node github/stage-pages.mjs /tmp/badger-pages`。

部署内容只有 `dist/index.html`、可选的 `dist/assets/` 和 `.nojekyll`；`dist/` 中旧版 PNG、源码、项目笔记和 Sites 配置不会进入 Pages。项目链接使用相对路径，兼容 GitHub 项目网址中的仓库路径。

当前源码包已包含用户提供的方大同《好不容易》MP3，位于仓库 `assets/audio/hao-bu-rong-yi.mp3`，或用 `BADGER_AUDIO_FILE` 指定本机的 MP3/M4A。构建会将录音嵌入 `dist/index.html` 与 `exports/PROJECT-BADGER-19-offline.html`。未提供时显示「音乐未载入」，不会启用旧背景旋律。浏览器仍需要首次触碰才能解锁声音。

二维码必须编码 **成功部署后实际打开并验证过的网址**。在 Actions 的部署结果或 Settings → Pages 复制正式网址，检查手机竖屏、触屏、音乐和两张照片保存，再生成二维码并用另一台手机扫码复核。不要根据用户名和仓库名猜网址，也不要把预览或临时地址印在卡片上。

最终交付应同时保留源码、构建产物和离线副本；二维码只保存网址，网站仍需要长期保持可访问。


Pages 部署成功后，工作流会自动读取真实的 `page_url`，验证该网址确实打开 BADGER，再生成 `badger-19-qr` Actions artifact。下载其中的 PNG 或 SVG 印刷即可；同一 artifact 内包含 URL 和解码校验记录。二维码采用黑白、高纠错和四格白边，不用额外购买二维码服务。

也可在本地执行：

```sh
node github/make-qr.mjs "从部署结果复制的实际 HTTPS 地址" exports/qr
```

创建仓库或 Pages 设置返回 403 时，需要在 GitHub 中建立目标仓库并把它授权给当前连接；无需把 Token 写入源码或发到聊天中。
