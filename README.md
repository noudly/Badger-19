# PROJECT BADGER · 19

正式网站：[https://noudly.github.io/Badger-19/](https://noudly.github.io/Badger-19/)。已通过匿名访问与手机画幅音乐播放检查。

二维码：[PNG](qr/BADGER-19-QR.png) · [印刷SVG](qr/BADGER-19-QR.svg)。打印至少3cm宽并保留白边；网页首次触碰后播放音乐。

为十九岁留下的一个互动小世界。BADGER 和熊会在同一座立体街角相遇、拍照、穿过碎裂的世界，最后一起看雪。手机和电脑均可打开；故事自动推进，触碰能得到额外回应。

配乐采用用户提供的 **方大同《好不容易》MP3**，已验证完整解码：44.1kHz双声道、320kbps、380.108秒。另一份.mgg2.flac无法作为标准FLAC解码。原曲已嵌入网页和离线副本，旧合成背景旋律已禁用；交互与快门音效保留。

网站现按06:20的[导演时间轴](docs/SONG-TIMELINE.zh-CN.md)运行十二个章节，镜头和短动作分别采样：末次副歌握住，03:54后世界展开，05:45进入雪景，06:02合照，06:08生日揭晓。声音播放时以原曲位置为时钟；晚触碰、取消静音会对齐当前故事，后台与缓冲时暂停，结尾不自动循环。人声锚点仍是LRC参考，尾奏剪辑已参考实际音量变化，并未宣称全部实听校准。另有[交互时间轴工作台](docs/timeline-preview.html)可拖动审阅。

## 加入歌曲

将 MP3 文件放到 `assets/audio/hao-bu-rong-yi.mp3`。构建会把歌曲与三维场景一起写入单文件 HTML，网页和离线副本都可使用。也可用 `BADGER_AUDIO_FILE=/绝对路径/歌曲.m4a npm run build --prefix rebuild`。

## 本地构建

```sh
npm ci --prefix rebuild
npm test --prefix rebuild
npm run build --prefix rebuild
```

网页输出：`dist/index.html`。离线副本：`exports/PROJECT-BADGER-19-offline.html`。若主动移除录音，故事仍可静音推进并显示“音乐未载入”。

## GitHub Pages

`.github/workflows/pages.yml` 在推送 `main` 时检查和构建，然后发布 Pages。首次需在仓库 Settings → Pages 将 Source 设置为 GitHub Actions。详见 [部署说明](github/README.md)。

二维码编码的是实际的 Pages 网址；后续更新故事或补入歌曲后，无需更换二维码。打印建议保留白色边框，二维码至少 3 cm 宽。

## 保存与纪念

结尾可以保存两张照片，或点击「收藏小世界」下载完整离线 HTML。音乐包含在构建中时，离线 HTML 也包含录音。浏览器需要首次触碰才能启动声音。

作品没有编造私人回忆；祝福与角色故事仍可继续调整。
