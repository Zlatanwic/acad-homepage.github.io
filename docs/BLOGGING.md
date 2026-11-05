# 博客写作与发布

博客入口：<https://zlatanwic.github.io/acad-homepage.github.io/blog/>

个人主页和博客都由 **Jekyll** 生成：一次构建、一个引擎，没有 Astro、没有 Node 依赖。GitHub Actions 只做 Jekyll build 并部署到 GitHub Pages，不需要服务器或数据库。博客支持 Markdown、数学公式、搜索、标签筛选、目录、代码高亮和 Atom 订阅。界面默认英文，正文可以中文或英文。

## 发布第一篇文章

1. 打开仓库的 `_drafts/your-first-post.md`，复制其中内容。
2. 在 `_posts` 下新建 `2026-09-15-my-first-post.md`。文件名必须为 `YYYY-MM-DD-英文短标题.md`；日期不要晚于实际发布日期。以后发布时换成当天日期。
3. 修改文件顶部的配置和正文，并把 `published: false` 改为 `published: true`。
4. 提交到仓库的 `main` 分支。可以直接使用 GitHub 网页的 Add file / Create new file，不必在本地安装工具。
5. 等待 Actions 中的 **Build and deploy website** 成功，然后刷新博客页面。

```yaml
---
title: "文章标题"
description: "文章摘要，用于列表、搜索和分享。"
category: "Technical notes"
tags: [MLSys, CUDA]
lang: zh-CN
published: true
mathjax: true   # 只有需要公式时才加
---
```

- 技术笔记可使用 `category: "Technical notes"`；个人随笔可使用 `category: "Personal writing"`，也可以自定义。
- `tags` 为标签列表，会自动进入 Topic 筛选。`lang: en` 用于英文文章，`zh-CN` 用于中文文章。
- `##` 和 `###` 标题自动出现在文章页目录。文章主标题由 `title` 生成，正文一般从二级标题开始。
- 代码块使用三个反引号并标注语言，例如 `python`、`cpp`、`bash`。
- 标签和搜索在浏览器端处理，不向第三方发送查询。关闭 JavaScript 后仍能阅读所有文章。
- 公式需要在前言写 `mathjax: true`（页面会从 CDN 加载 MathJax）。行内用 `$...$`，独立公式用 `$$...$$`；不加这个字段时公式不会渲染。
- 只支持 Markdown，不再支持 MDX/React 组件。需要交互效果时写成普通 HTML（Jekyll 会原样输出）。

## 图片和附件

把图片放到 `images/blog/`（可自行创建子目录）。在 Markdown 里推荐用 Liquid 生成带 baseurl 的地址，这样本地和线上都正确：

```markdown
![有意义的图片说明]({{ '/images/blog/my-diagram.png' | relative_url }})
[下载附件]({{ '/files/my-note.pdf' | relative_url }})
```

也可以直接写死完整子路径 `/acad-homepage.github.io/images/blog/my-diagram.png`，效果相同，但换域名或 baseurl 时要手动改。

只使用你有权发布的内容。不要把密钥、尚未公开的研究材料或敏感个人信息放进文章。

## 草稿与文章地址

- `_drafts/` 中的文件不会出现在构建产物里（`jekyll build` 默认不处理草稿）；模板额外使用 `published: false` 防止误发布。
- `_posts/` 中设置 `published: false` 的文章也不会公开。将其改为 `true` 后发布。
- 公开地址格式为 `/blog/YYYY/MM/DD/英文短标题/`（由 `_config.yml` 里 posts 的 `permalink` 决定）。发布后尽量不要修改文件日期和短标题，以免旧链接失效。
- 修改已发布文章时可添加 `last_modified_at: 2026-09-16 12:00:00 +0800`，让订阅中的更新时间同步变化。
- 所有草稿仍然是 Git 仓库文件；如果仓库公开，别人仍能在 GitHub 看到源文件。因此草稿隐藏不是保密机制。

## 本地预览

需要 Ruby + Bundler：

```bash
bundle install              # 首次
bundle exec jekyll serve    # 或 bash run_server.sh
```

打开 <http://127.0.0.1:4000/acad-homepage.github.io/>。改 `_config.yml` 后需要重启服务。带草稿预览用 `bundle exec jekyll serve --drafts`。

如果 Windows 上 Bundler 解析 `github-pages` 依赖失败（Ruby 3.4 与锁文件平台不匹配时常见），可以绕开 Bundler，直接用本机安装的 Jekyll 4 和插件：

```powershell
$env:JEKYLL_NO_BUNDLER_REQUIRE='true'
jekyll serve
```

需要本机已装 `jekyll`、`jekyll-feed`、`jekyll-redirect-from`、`jekyll-gist`、`jekyll-sitemap`、`jekyll-paginate`（`gem install <名字>`）。这条路径只用于本地预览，线上始终由 GitHub Actions 构建。

## 订阅与验证

Atom 地址：<https://zlatanwic.github.io/acad-homepage.github.io/blog/feed.xml>，由 `_pages/blog-feed.xml` 生成，包含最近 20 篇文章的全文。根目录的 `/feed.xml` 由 `jekyll-feed` 插件生成，只作兼容用途。

检查清单：文章出现在 `/blog/` 列表；标题、日期、标签正确；目录能跳转；`/blog/feed.xml` 里能看到该文章且 `<content>` 非空；控制台无 404。
