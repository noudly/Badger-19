# 当前2D插画版本

- `main.js`：原曲时钟、十二章节、探索、两张纪念图、生日揭晓与重播。
- `stage.js`：Canvas2D背景、独立角色、动作姿势、纸页转场和低动态显示；不使用WebGL或3D几何。
- `template.html`：极简暖纸界面、声音按钮、祝福和相册，没有操作教程或章节页脚。
- `build.mjs`：把11份优化后的插画和原曲内嵌进同一个HTML。
- `stage-verify.mjs`：状态、源图裁切、像素预算、照片与重播合同。
- `release-verify.mjs`：资源校验值、裁切边界、界面接线和2D入口检查。
- `archive-roundtrip.mjs`：完整离线源码逐字节一致性。

沿用仓库的构建命令：`npm ci --prefix rebuild`，`npm test --prefix rebuild`，`npm run build --prefix rebuild`。

插画PNG原稿保留在 `assets/illustrations/`；网页使用同目录WebP。`manifest.json`中的alpha裁切矩形用于透明角色，不会破坏源图。重新生成角色后，应重新计算裁切并核对手机全身轮廓。
