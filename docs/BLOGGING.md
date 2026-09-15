# 博客写作与发布

博客入口：<https://zlatanwic.github.io/acad-homepage.github.io/blog/>

这是站内原生 Jekyll 博客，不需要额外服务器、数据库或管理后台。技术笔记与个人随笔共用文章列表，支持搜索、标签筛选、文章目录、代码高亮和 Atom 订阅。界面默认英文，正文可以中文或英文。

## 发布第一篇文章

1. 打开仓库的 `_drafts/your-first-post.md`，复制其中内容。
2. 在 `_posts` 下新建 `2026-09-15-my-first-post.md`。文件名必须为 `YYYY-MM-DD-英文短标题.md`；日期不要晚于实际发布日期。以后发布时换成当天日期。
3. 修改文件顶部的配置和正文，并把 `published: false` 改为 `published: true`。
4. 提交到仓库的 `main` 分支。可以直接使用 GitHub 网页的 Add file / Create new file，不必在本地安装工具。
5. 等待 Actions 中的 **pages build and deployment** 成功，然后刷新博客页面。

```yaml
---
title: "文章标题"
description: "文章摘要，用于列表、搜索和分享。"
category: "Technical notes"
tags: [MLSys, CUDA]
lang: zh-CN
published: true
---
```

- 技术笔记可使用 `category: "Technical notes"`；个人随笔可使用 `category: "Personal writing"`，也可以自定义。
- `tags` 为标签列表，会自动进入 Topic 筛选。`lang: en` 用于英文文章，`zh-CN` 用于中文文章。
- `##` 和 `###` 标题自动出现在文章页目录。文章主标题由 `title` 生成，正文一般从二级标题开始。
- 代码块使用三个反引号并标注语言，例如 `python`、`cpp`、`bash`。
- 标签和搜索在浏览器端处理，不向第三方发送查询。关闭 JavaScript 后仍能阅读所有文章。

## 图片和附件

把图片放到 `images/blog/`（可自行创建子目录）。用带 `relative_url` 的路径兼容 GitHub Pages 子目录：

```markdown
![有意义的图片说明]({{ '/images/blog/my-diagram.png' | relative_url }})
[下载附件]({{ '/files/my-note.pdf' | relative_url }})
```

只使用你有权发布的内容。不要把密钥、尚未公开的研究材料或敏感个人信息放进文章。

## 草稿与文章地址

- `_drafts/` 中的文件不会出现在正常部署中；模板额外使用 `published: false` 防止误发布。
- `_posts/` 中设置 `published: false` 的文章也不会公开。将其改为 `true` 后发布。
- 公开地址格式为 `/blog/YYYY/MM/DD/英文短标题/`。发布后尽量不要修改文件日期和短标题，以免旧链接失效。
- 修改已发布文章时可添加 `last_modified_at: 2026-09-16 12:00:00 +0800`，让订阅中的更新时间同步变化。
- 所有草稿仍然是 Git 仓库文件；如果仓库公开，别人仍能在 GitHub 看到源文件。因此草稿隐藏不是保密机制。

## 订阅与验证

Atom 地址：<https://zlatanwic.github.io/acad-homepage.github.io/blog/feed.xml>。它是 RSS 类订阅格式，适用于支持 Atom 的阅读器，提供最近 20 篇文章。无需额外订阅服务。

开发时可以运行：

```text
npm --prefix tools/visual-effects test
ruby tools/visual-effects/blog-build.test.rb
```

第二条命令在隔离的临时目录创建测试文章和构建，不会把示例内容发布到你的博客。
