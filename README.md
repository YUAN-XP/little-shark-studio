# Little Shark Studio

袁潇鹏的个人创作网站，记录软件工程、AI、机器学习与多媒体创作中的学习和实践。

网站地址：https://yuan-xp.github.io/little-shark-studio/

## 本地运行

使用 Node.js 24，安装依赖并启动预览：

```text
npm ci
npm run dev
```

本地地址为 http://127.0.0.1:5173/。

## 检查与构建

```text
npm test
npm run build -- --base=/little-shark-studio/
npm run check:release
npm run preview -- --base=/little-shark-studio/
```

项目地址预览：http://127.0.0.1:4173/little-shark-studio/ 。构建输出位于 dist。

## 发布和更新

GitHub Pages 的 Source 选择 GitHub Actions。main 分支更新后，部署流程会安装锁定的依赖、检查交互和项目内容、构建网站并发布。拉取请求运行相同检查，但不会发布。

日常修改先在本地预览，较大调整可以在独立分支完成；确认后合入 main。需要恢复旧版时，通过撤销对应提交并重新部署保留完整历史。

网站使用 React、Vite、Three.js 与 React Bits。项目详情采用对开报纸，视频按需加载；关于区使用可旋转镜头的固定三维海滩模型。减少动态与不支持 WebGL 时提供阅读回退。

本次优化记录见 [PERFORMANCE.md](./PERFORMANCE.md)，GitHub Desktop 更新步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 素材与许可

第三方组件及字体许可保存在 licenses 和 public/licenses。个人文字、照片、视频、插画及其他原创素材保留作者权利；仓库公开不代表这些素材被授予通用的再利用许可。

仓库包含网站实际使用的素材。原始简历文档、Blender 工作文件、原视频、质量检查截图及本地备份保存在网站工程之外。
