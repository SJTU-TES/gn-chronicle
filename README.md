# 岁序 · GN

GN 的编年史：从 2022 年前序，到 2023 年 4 月操作系统课程，再到后来的相聚与旅行。保留已有 19 条记录。

这是公开的 GitHub Pages 网站，入口口令为 `202304`。口令只用于进入页面，不提供保密或组织成员身份验证。

## 首次发布

1. 在 SJTU-TES 组织下创建公开仓库 `gn-chronicle`，将此项目推送到 `main`。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. 在 Actions 中运行 **Deploy GN Chronicle**，或推送一次新提交触发发布。
4. 发布成功后访问 `https://sjtu-tes.github.io/gn-chronicle/`。

项目仓库：`SJTU-TES/gn-chronicle`。站点地址：[GN 编年史](https://sjtu-tes.github.io/gn-chronicle/)。每次发布的结果可在仓库 Actions 中查看。

## 更新记录

修改 `content/chronicle.json` 并 push，GitHub Actions 自动构建和发布。无需 Ruby、Jekyll、Cloudflare 或数据库。

事件按日期排序；`datetime` 支持 `YYYY-MM` 或 `YYYY-MM-DD`；每个事件 `id` 唯一。`style` 可选 `origin`、`travel`、`gathering`、`reflection`。页面结构在 `src/chronicle-template.html`，样式和入口脚本在 `assets/`。

如需本地生成网页，使用 Node.js 22 或以上运行：

```sh
node scripts/build.mjs
```

生成目录为 `site/`，网页资源使用相对路径，可部署在组织的项目站点路径下。不要将之前 Cloudflare 私有版的认证配置或密钥复制进此仓库。
