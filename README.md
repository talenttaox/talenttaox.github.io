# talenttao

灰色系、可切换中英文的个人网站。公开页面保持简洁，只包含主页、笔记、归档和关于。网址：`https://talenttaox.github.io`。已发布普通心理学讲义（16章）。

## 日常写作

用 Typora、Obsidian 或其他 Markdown 编辑器打开 `content/notes/` 下的文件。

每篇文章一个文件夹，英文小写名称，例如：

```text
content/notes/my-first-note/
  zh.md
  en.md
```

只写一种语言也可以，切换按钮会进入另一种语言的笔记目录，文章旁会提示译文尚未提供。

文章开头：

```yaml
---
title: 我的第一篇笔记
description: 一句话介绍这篇文章。
date: 2026-10-10
tags: [物理, 学习]
demo: false
draft: false
---
```

正文使用标准 Markdown。`$...$` 是行内公式，`$$` 单独占行包围独立公式。代码块、表格、图片、引用与自动章节目录均可用。

图片放在 `public/images/`，正文写 `![说明](/images/文件名.png)`。PDF 放在 `public/lectures/`，文件头添加 `pdf: /lectures/文件名.pdf` 即可出现下载按钮。建议文件名使用英文、数字和短横线。

设置 `draft: true` 可从生成网页、搜索和 RSS 中排除文章；公开 GitHub 仓库仍会公开源文件，私人草稿请保存在仓库之外。删除对应文件夹内的一个语言文件，只会移除该语言版本。

## 修改主页和个人资料

### 更新普通心理学讲义

`content/notes/general-psychology/chapters/` 保存原始讲义：`00-讲义目录.md` 为总览，`01-…md` 到 `16-…md` 为各章。直接用 Markdown 编辑器修改对应章节并提交即可。各章保持 `#` 章标题、`##` 小节标题的层级。

`zh.md` 和 `en.md` 管理笔记条目的标题、摘要和标签。`chapters: true` 会自动组合该目录里的讲义，并生成可以折叠的章节与小节目录。`contentLang: zh` 声明正文为中文；英文界面会显示中文正文及译文未提供提示。讲义在笔记列表中始终是一个条目。

章节使用固定锚点 `#chapter-01`、`#chapter-02` 等；总览中指向 Markdown 文件的链接会转换为对应章节的网页锚点。

`content/site.json` 中的 `languages.zh` 和 `languages.en` 分别管理两种语言的文案。可修改主页短句和关于我；`github` 管理 GitHub 链接，`origin` 管理网站的最终网址。

完整文章正文、标题与摘要均由 Markdown 管理；主页简短文案集中在 JSON 中，便于对应中英文内容。

## 本地预览

安装 Node.js 22 或更新版本和 pnpm 11，然后在此文件夹运行：

```text
pnpm install --frozen-lockfile
pnpm dev
```

浏览器打开 `http://127.0.0.1:4173`。预览时修改内容后需停止并重新启动，或运行 `pnpm build` 后刷新页面。

生成与检查：

```text
pnpm build
pnpm check
```

所有网页生成到 `dist/`。依赖与公式字体打包在本地，读者不需要依赖第三方 CDN 加载公式。

## 发布到 GitHub Pages

1. 登录自己的 `talenttaox` GitHub 账号，确认是否已有 `talenttaox.github.io` 仓库。如果已存在，先检查现有内容，避免覆盖原网站。
2. 若没有，创建名为 `talenttaox.github.io` 的公开仓库。
3. 上传此项目的源文件，保留隐藏的 `.github/workflows/pages.yml` 和 `pnpm-lock.yaml`；不要上传 `node_modules/`、`dist/` 或压缩包。
4. 在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
5. 主分支命名为 `main`。提交代码后，在 **Actions** 查看 `Publish GitHub Pages`，首次设置完成后也可手动执行该工作流。
6. 工作流成功后访问 `https://talenttaox.github.io`。后续提交 Markdown 就会自动重新生成并发布。

无需购买独立域名。以后绑定独立域名时，请在 GitHub Pages 中配置域名与 DNS，并修改 `content/site.json` 的 `origin`，再重新构建。不要只添加 CNAME 就假定域名已归你所有。

## 已包含

- 对应页面的中英切换、语言和主题偏好记忆。
- 手机导航、浅灰与深灰模式、词语生成的三维雕塑；支持旋转、形变、三种形态和 PNG 导出。
- 笔记搜索、标签筛选、目录、公式、代码复制、Markdown 下载与可选 PDF 附件。
- 分语言 RSS、站点地图和 404 页面。
- 兼容减少动态效果偏好的动画；离屏或隐藏标签页时暂停绘图。
- GitHub Pages 自动发布工作流与本地链接检查。

## 依赖

Markdown 渲染：markdown-it；公式：KaTeX 与 markdown-it-texmath；元信息解析：yaml。依赖版本记录于 `pnpm-lock.yaml`。三维雕塑以词语的确定性哈希生成参数，在 Canvas 中进行透视投影；相同词语、形态和形变值会产生相同几何结构。
