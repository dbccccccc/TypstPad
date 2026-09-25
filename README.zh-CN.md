# TypstPad

[English](README.md) · 简体中文

![版本](https://img.shields.io/badge/version-0.14.0-blue)
[![许可证：MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

在浏览器中编写、预览和分享 Typst 公式。直接输入表达式、改写一个模板，或从印刷体公式图片开始。保留可编辑源码，再将排版结果带到需要的地方。

## 主要功能

访问 **[typstpad.com](https://typstpad.com/)** 使用在线编辑器。[使用指南](https://typstpad.com/guide)涵盖公式导出、图片转 Typst、保存和分享。

- **实时预览。** 使用 Monaco 编辑器，支持语法高亮和 Typst 自动补全。
- **快捷选择。** 在统一面板中搜索符号、结构、函数和模板。
- **可编辑模板。** 覆盖方程、代数、微积分、线性代数、统计和概率，按 Tab 逐个填写占位内容。
- **多种导出方式。** 复制 PNG 图片，或导出 PNG、JPG、SVG、HTML 和 Typst 源码。
- **本地公式收藏。** 自动保存草稿，在浏览器中保存、加载、重命名和删除命名公式。
- **图片转 Typst。** 通过实验性的 TypLens 模型，在本地识别单个印刷体公式。
- **可调整的工作区。** 支持浅色、深色和跟随系统主题，中英文界面，上下或左右布局，以及内置和上传字体。

无需账号，也无需应用后端。

## 编写公式

**简化公式模式默认开启。** 直接输入数学表达式，无需在两侧添加 `$`：

```typst
sum_(i=1)^n i = (n (n + 1)) / 2
```

预览会随着输入自动更新。如果在设置中关闭简化公式模式，请使用标准 Typst 标记语法，并用 `$...$` 包裹数学表达式。

常用的 Typst 写法很简洁：

| 内容 | Typst 源码 |
| --- | --- |
| 分式 | `(a + b) / (c + d)` |
| 上下标 | `x_i^2` |
| 平方根 | `sqrt(x)` |
| 导数 | `(dif f) / (dif x)` |
| 积分 | `integral_a^b f(x) dif x` |
| 矩阵 | `mat(a, b; c, d)` |
| 符号与关系 | `alpha`、`pi`、`infinity`、`<=`、`!=`、`->` |

多行公式使用 `&` 标记对齐位置，用单个反斜杠换行：

```typst
a &= b + c \
x &= y + z
```

更多语法可查阅 [Typst 官方文档](https://typst.app/docs/)。

### 快捷选择与模板

| 分组 | 内容 |
| --- | --- |
| **符号** | 运算符、关系符、希腊字母、集合、逻辑和箭头 |
| **结构** | 分式、根式、上下标、括号、向量和矩阵 |
| **函数** | 积分、求和、连乘、极限和三角函数 |
| **模板** | 对齐等式、推导过程、分段函数、矩阵排版和常用公式 |

打开任意分组，按名称、符号或 Typst 代码搜索。搜索覆盖全部四组内容，快速插入栏则提供常用结构的一键入口。

插入结构或模板后，改写选中的字段，再按 **Tab** 继续。也可以先选中已有表达式：选中 `x + y` 后插入分式，会得到 `(x + y) / b`。

| 按键 | 操作 |
| --- | --- |
| Tab / Shift + Tab | 在插入的代码片段中切换占位内容 |
| 方向键 | 在打开的选择面板中浏览条目 |
| Enter | 插入当前条目，或搜索时的首个结果 |
| Esc | 关闭选择面板 |

## 保存、导出与分享

当前草稿会自动保存在浏览器中。**保存**会添加一份命名副本，**加载**可将已保存的公式打开到编辑器。数据属于当前站点和浏览器配置文件，不会跨设备同步。需要长期保留的内容，请另外下载为 Typst 文件。

通过**导出图片**或**导出代码**选择格式：

| 格式 | 适用场景 |
| --- | --- |
| PNG | 用于笔记和文档的透明背景图片，可复制或下载 |
| JPG | 白色背景图片 |
| SVG | 缩放后仍保持清晰的矢量图片 |
| Typst（`.typ`） | 可继续编辑的公式源码 |
| HTML | 内嵌公式图片的 HTML 片段或文件 |

设置中可选择 1×–4× 的位图导出倍率。

**分享**会生成包含公式源码的网址，任何获得链接的人都可以读取公式。链接不包含本地公式收藏、自定义字体或设置；如需重现相同结果，对方可能需要使用相同的字体和公式模式。

## 图片转 Typst · 实验功能

在输入区选择**图片转 Typst**，然后选择、拖入或粘贴 PNG、JPEG、WebP 图片。建议使用裁切紧凑的单个印刷体公式，支持浅色和深色背景。

识别在浏览器中运行，不会上传图片。首次使用会下载内置的 **TypLens V1.1 INT8** 模型和运行时，其中模型权重约为 33.1 MB。识别前会将图片转换为灰度、统一背景明暗方向，并围绕公式内容裁切。检查生成的源码和预览后，再选择**在编辑器中使用**；此操作会替换当前编辑器内容。该功能暂不适合手写内容或整页文档。

模型直接生成原生 Typst。未完整生成或包含无效词元的结果会被阻止插入。模型细节与来源可查阅[模型说明](public/im2typst/model/MODEL_CARD.md)、[推理规范](public/im2typst/model/INFERENCE.md)和[第三方声明](public/im2typst/THIRD_PARTY_NOTICES.md)。

## 本地开发

需要 **Node.js 20 或更新版本**及 npm。

```bash
git clone https://github.com/dbccccccc/TypstPad.git
cd TypstPad
npm ci
npm run dev
```

打开 Vite 输出的本地地址，通常为 [http://localhost:5173](http://localhost:5173)。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 检查类型、构建并预渲染不绑定域名的生产文件到 `dist/` |
| `npm run build:site` | 构建 typstpad.com 官方网站版本 |
| `npm run preview` | 在本地预览生产构建 |
| `npm test` | 运行现有 Vitest 测试 |
| `npm run lint` | 运行 ESLint |
| `npm run test:seo` | 检查不绑定域名构建的 HTML、元数据、路由和索引文件 |

编辑器、使用指南与关于页面分别位于 `/`、`/guide` 和 `/about`。这些页面使用与浏览器相同的 React 组件进行预渲染。直接访问介绍和指南页面时，不会加载 Monaco 或 Typst 编译器。Vite 和 Nginx 会将原来的导出指南与图片识别指南网址永久重定向到 `/guide`。

## 部署

### Docker

使用仓库中的 Nginx 配置，构建并运行当前代码：

```bash
docker build -t typstpad .
docker run -d --name typstpad -p 8080:80 typstpad
```

打开 [http://localhost:8080](http://localhost:8080)。

也可以使用 GitHub Container Registry 中已经发布的镜像：

```bash
docker run -d --name typstpad -p 8080:80 ghcr.io/dbccccccc/typstpad:latest
```

本地镜像和已发布镜像两种方式任选其一。如需固定版本，将 `latest` 替换为已存在的数字版本标签。GitHub Release 发布并通过验证后，工作流会从同一份源码推送两种 `linux/amd64` 镜像：

| 版本 | 版本标签 | 稳定标签 | 站点元数据 |
| --- | --- | --- | --- |
| 自托管 | `<version>` | `latest` | 不固定规范域名，不生成站点地图 |
| 官方网站 | `<version>-site` | `site-latest` | 为 typstpad.com 生成规范网址、结构化数据和站点地图 |

预发布版本只生成版本标签。该工作流负责构建和推送镜像，部署到服务器需要另行完成。

使用自定义域名时，在构建阶段设置站点地址：

```bash
docker build --build-arg SITE_URL=https://math.example.org -t typstpad .
```

官方网站使用 `--build-arg BUILD_MODE=site`。若不希望安装实例被搜索引擎索引，添加 `--build-arg SITE_INDEXABLE=false`。这些参数均在**构建时**生效，`docker run -e` 不会重写已有镜像中的静态文件。

使用 Docker Compose 时，将以下内容保存为 `compose.yaml`：

```yaml
services:
  typstpad:
    image: ghcr.io/dbccccccc/typstpad:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

然后运行 `docker compose up -d`。

### 静态托管

托管完整的 `dist/` 输出，包括页面子目录、内置字体和识别资源。将 `/about` 解析为 `/about/index.html`，将 `/guide` 解析为 `/guide/index.html`。为 `/guides/typst-to-png-svg` 和 `/guides/image-to-typst`（含结尾斜杠及 `/index.html` 形式）配置到 `/guide` 的 HTTP **301** 重定向；构建也包含即时 HTML 重定向，供静态托管回退使用。未知路径必须返回 HTTP **404**，可使用 `404.html` 作为错误页面，但需保留 404 状态码。请勿将未知路径回退到首页。添加以下跨源隔离响应头：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite 开发服务器和内置的 [Nginx 配置](nginx.conf)已经设置这些响应头。公开部署时请使用 HTTPS，以便使用浏览器剪贴板和 Service Worker 等能力。

公式编译与图片识别在本地运行，但应用仍需下载必要资源；使用 Typst 包导入时，也可能从 `packages.typst.org` 获取包。

### 网站元数据与验证

`npm run build` 默认生成自托管版本。在构建环境或对应的 Vite `.env` 文件中设置 `SITE_URL`，即可生成规范网址和站点地图。地址必须为 HTTP(S) 来源，不含子路径、查询参数或片段。`npm run build:site` 默认使用 `https://typstpad.com`，也可通过 `SITE_URL` 覆盖。设置 `SITE_INDEXABLE=false` 会为所有页面添加 `noindex` 并省略站点地图；robots.txt 仍允许抓取，以便搜索引擎读取此指令。

```bash
npm run build:site
npm run test:seo -- --site-url https://typstpad.com
```

自定义域名请向 `test:seo` 传入相同的地址。关闭索引的构建需额外添加 `--noindex`。CI 会验证两种构建，并通过 Docker 检查实际 HTTP 响应，包括未知路径及跨源隔离响应头。

部署官方网站后，在 Google Search Console 中验证域名，提交 `https://typstpad.com/sitemap.xml`，并检查首页、关于页面和指南的渲染结果。按页面和搜索词观察展示次数与点击次数。分享公式的查询参数不会加入站点地图，编辑器的规范网址保持为 `/`。

## 仓库结构

| 位置 | 职责 |
| --- | --- |
| `src/components/` | 编辑器、预览、快捷选择、导出及弹窗 |
| `src/data/` | 符号、模板和补全数据 |
| `src/services/` | Typst 编译和图片识别 |
| `src/utils/` | 本地存储、分享、导出和编辑器辅助功能 |
| `src/i18n/` | 英文与简体中文界面文案 |
| `src/pages/`、`src/navigation/` | 关于、指南、未找到页面及可抓取的导航 |
| `src/seo/`、`scripts/build.mjs` | 页面元数据与静态 HTML、站点地图生成 |
| `public/` | 字体、识别资源和静态资源缓存 |

界面使用 React、TypeScript、Vite、Tailwind CSS、Radix UI 和 Lucide 图标；Monaco 与 Shiki 提供编辑和高亮能力，typst.ts 负责浏览器端编译。

## 参与贡献

欢迎提交[问题反馈、建议](https://github.com/dbccccccc/TypstPad/issues)和 Pull Request。反馈问题时请提供可复现示例，涉及界面改动时请附上截图。调整用户可见行为时，请同步更新中英文界面文案和 README。

运行与改动相关的检查即可。CI 会执行测试、代码检查、依赖审计和生产构建。

## 许可证与致谢

TypstPad 源码采用 [MIT 许可证](LICENSE)。第三方依赖和模型资源保留各自的许可证与声明。

- [Typst](https://typst.app/) 与 [typst.ts](https://github.com/Myriad-Dreamin/typst.ts)：数学排版与浏览器端编译。
- [Monaco](https://microsoft.github.io/monaco-editor/) 与 [Shiki](https://shiki.matsu.io/)：编辑器与语法高亮。
- [TypLens](https://github.com/dbccccccc/TypLens) 与 [ONNX Runtime](https://github.com/microsoft/onnxruntime)：图片转 Typst 识别。
- [Radix UI](https://www.radix-ui.com/) 与 [Tailwind CSS](https://tailwindcss.com/)：界面基础组件与样式。
- [latexlive.com](https://www.latexlive.com/)：早期界面部分设计的灵感来源。

模型继承关系及 Pix2Text、TrOCR、IBEM、UniMER 等项目和数据集的署名信息见内置[模型声明](public/im2typst/model/NOTICE.md)。重新分发模型资源时，请保留[第三方声明](public/im2typst/THIRD_PARTY_NOTICES.md)。
