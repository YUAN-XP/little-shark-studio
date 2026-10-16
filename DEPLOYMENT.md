# 将本次版本更新到正式网站

当前工程：`D:/个人简介网站/01-website`。当前分支：`local/beach-model-review`。仓库：[YUAN-XP/little-shark-studio](https://github.com/YUAN-XP/little-shark-studio)。

本次只完成本地准备，提交和上线由你操作。

## 使用 GitHub Desktop 更新

1. 打开 GitHub Desktop，选择上述工程。确认 Current Branch 是 `local/beach-model-review`。
2. 在 Changes 中检查并提交本次全部修改，包括新图片、`ocean-web-v1`、源码、测试和构建脚本。提交说明可填：`Update portfolio content and optimize loading`，点击 **Commit to local/beach-model-review**。
3. 点击 **Current Branch**，切到 **main**。点击 **Fetch origin**；如果出现 **Pull origin**，先点击拉取。
4. 再点击 **Current Branch → Choose a branch to merge into main**，选择 `local/beach-model-review`，点击 **Merge local/beach-model-review into main**。
5. 确认当前分支为 `main`，点击 **Push origin**。
6. 打开仓库的 **Actions**，查看最新的 **Publish Little Shark Studio**。等待 build 和 deploy 均为绿色。
7. 打开[正式网站](https://yuan-xp.github.io/little-shark-studio/)，按 **Ctrl+F5** 刷新。复查首页视频、作品详情、海滩交互和手机显示。

如果合并界面显示冲突，先解决冲突再推送；保留本次版本文件，勿使用强制推送覆盖远程历史。

`node_modules`、`dist`、Blender 原文件、原海浪参照和本地专用冲浪板已在忽略或发布排除范围内。本次采用 GitHub Desktop 提交源文件，Actions 会自行生成并发布 `dist`。较大的作品视频可能显示 50 MiB 提示，当前没有文件超过 100 MiB 硬限制。

## Pages 设置

若现有站点已经使用当前工作流发布，无需更改设置。首次配置时，进入仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。工作流已配置正式路径 `/little-shark-studio/`。

## 本地复查命令

在工程文件夹打开终端，执行：

```text
npm test
npm run build -- --base=/little-shark-studio/
npm run check:release
npm run preview -- --base=/little-shark-studio/
```

预览地址：`http://127.0.0.1:4173/little-shark-studio/`。端口被占用时，先关闭之前的预览服务。

官方操作说明：[GitHub Desktop 同步与合并分支](https://docs.github.com/en/desktop/working-with-your-remote-repository-on-github-or-github-enterprise/syncing-your-branch-in-github-desktop)、[GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
