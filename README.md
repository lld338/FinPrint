# FinPrint 报销打印台

FinPrint 是一个在浏览器中运行的 A4 / A5 报销材料拼版、预览、导出与打印工具。它支持 PDF、JPG、JPEG、PNG、WEBP 和 BMP，适合把电子发票、行程报销单、费用报销单、扫描件和手机照片等材料按照整页、上下两联或左右两联的方式排到标准纸张上。

项目是纯前端应用：PDF 和图片的读取、预览、裁切、拼版及新 PDF 生成都在当前浏览器中完成，部署端只负责提供静态网页，不接收或保存用户选择的报销文件。

默认访问地址：`http://127.0.0.1:5166/`

## 主要功能

- 批量导入 PDF、JPG、JPEG、PNG、WEBP 和 BMP 文件。
- 图片会在浏览器本地转换成单页 PDF 材料，可与 PDF 一起拼版和导出。
- 识别 PDF 页面框对应的 A4、A5 或自定义尺寸。
- 支持 A4、A5 纸张。
- 支持纵向和横向纸张。
- 支持整页、上下两联、左右两联三种版式。
- 支持调整分割比例、页边距和中间留白。
- 可从“01 · 原始材料”拖拽文件到“02 · 拼版预览”的目标版位。
- 上下版位或左右版位之间可以拖拽互换位置。
- 每个版位可以单独选择 PDF 或图片材料及页码。
- 每个版位可以独立设置完整显示、铺满区域、内容缩放及水平/垂直偏移。
- 横向页面支持靠左、居中、靠右快捷定位。
- 自动检测 PDF 页面下方的大面积空白，可选择自动裁掉或保留整页。
- 预览和最终导出使用相同的裁切、缩放与偏移计算。
- 导出时保留原 PDF 内容的矢量清晰度；图片按适合打印的分辨率嵌入。
- 浏览器刷新后自动恢复已经导入的文件、拼版页面和版面设置。
- 顶部提供“清空全部”按钮，可主动删除浏览器中保存的所有工作内容。

## 页面区域说明

### 01 · 原始材料

用于导入和管理 PDF 与图片报销材料。可以点击选择文件，也可以把多个文件直接拖入上传区域。

PDF 文件卡片中的“PDF 页面 A4 / A5”表示 PDF 页面框的实际尺寸，不代表页面中有效内容占用了整张纸。图片没有可靠的物理纸张尺寸，文件卡片会显示“图片 JPG / PNG”等格式；导入后可在右侧自行选择 A4、A5、整页、上下或左右排版。

例如，一个 PDF 的内容可能只在上半页，但它的页面框仍然是 A4，此时仍会显示“PDF 页面 A4”。是否裁掉下方空白，应在右侧“原稿空白处理”中设置。

### 02 · 拼版预览

用于查看当前打印纸张和版位内容。可以：

- 从左侧拖入材料；
- 点击版位后在右侧选择文件和页码；
- 拖动两个版位互换位置；
- 添加、复制、删除或调整打印页顺序。

### 03 · 打印设置

用于设置当前打印页和当前版位，包括：

- A4 / A5；
- 纵向 / 横向；
- 整页 / 上下 / 左右；
- 分割位置、页边距和中间留白；
- 自动去下方空白 / 保留整页；
- 完整显示 / 铺满区域；
- 内容缩放和水平、垂直偏移。

## 数据与隐私

FinPrint 不包含上传报销材料的后端接口。选择的 PDF 和图片只在浏览器本地处理；图片转换为打印 PDF 页面的过程同样在本地完成。

工作内容使用浏览器的 IndexedDB 保存，因此：

- 刷新页面或重启 Docker 容器后，当前浏览器通常仍能恢复工作内容；
- 清除浏览器网站数据、使用无痕模式或点击“清空全部”后，内容会被删除；
- 浏览器按照“协议 + 域名/IP + 端口”隔离数据；
- `http://127.0.0.1:5166/`、`http://localhost:5166/` 和 `http://192.168.1.10:5166/` 会被视为三个不同的网站，各自保存独立数据；
- 更换电脑或浏览器不会自动同步数据。

如果材料敏感，建议部署在可信内网，或在公网域名前启用 Cloudflare Access，不要在没有身份验证的情况下直接公开。

## 环境要求

### 本地开发

- Node.js 20 或更高版本；
- npm 10 或兼容版本；
- 支持 IndexedDB、Canvas 和现代 JavaScript 的浏览器。

### Cloudflare Workers 部署

- Cloudflare 账号；
- 已接入 Cloudflare 的域名（绑定自定义域名时需要）；
- Node.js 20 或更高版本；
- npm 10 或兼容版本。

### Docker 部署

- Docker Engine；
- 可选：Docker Compose v2。

## 本地开发

进入项目目录：

```bash
cd FinPrint
```

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

打开浏览器访问：

```text
http://127.0.0.1:5166/
```

项目已在 `vite.config.ts` 中固定开发端口为 `5166`。如果提示端口已被占用，通常表示已有 FinPrint 开发服务正在运行，不需要重复启动。

查看占用端口的进程：

```bash
lsof -nP -iTCP:5166 -sTCP:LISTEN
```

## 测试和生产构建

运行单元测试：

```bash
npm test
```

生成生产文件：

```bash
npm run build
```

构建结果位于 `dist/`。

本地预览生产构建：

```bash
npm run preview
```

## Cloudflare Workers 远程部署（推荐）

项目已经配置 Cloudflare Workers Static Assets，配置文件为 `wrangler.jsonc`。部署时会把 `npm run build` 生成的 `dist/` 作为静态资源发布，不需要额外的后端服务。

PDF 与图片的读取、转换、拼版和导出仍然在用户浏览器中完成，Cloudflare Workers 只负责提供网页静态文件，不保存用户导入的报销材料。

### 1. 安装依赖

克隆项目后执行：

```bash
npm install
```

项目已经把 Wrangler 加入开发依赖，不需要全局安装。

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

命令会打开浏览器，选择需要部署 FinPrint 的 Cloudflare 账号并完成授权。

查看当前登录状态：

```bash
npx wrangler whoami
```

### 3. 部署到 Workers

```bash
npm run deploy:cloudflare
```

该命令会先执行生产构建，然后运行 `wrangler deploy`。为了避免绕过自定义域名上的访问验证，项目默认关闭公开的 `workers.dev` 地址和 Preview URLs；首次部署会先创建 Worker，之后需要绑定自己的域名。

后续更新代码时重新执行同一命令即可：

```bash
npm install
npm run deploy:cloudflare
```

### 4. 绑定自己的域名

推荐使用独立子域名，例如：

```text
print.example.com
```

在 Cloudflare 控制台中打开 FinPrint Worker，进入 **Domains** 或域名与路由设置，添加 **Custom Domain**，然后填写准备使用的子域名。域名必须位于当前 Cloudflare 账号管理的站点中。绑定域名后应立即完成下一节的 Cloudflare Access 配置，再正式投入使用。

不建议直接占用网站主域名，使用 `print.example.com`、`invoice.example.com` 等独立子域名更方便管理。

### 5. 添加访问验证

报销工具建议通过 Cloudflare Access 限制访问。不要把固定密码写在 React、JavaScript、`localStorage` 或 `wrangler.jsonc` 中，因为前端代码和公开配置都可能被访问者查看。

推荐使用指定邮箱加一次性验证码：

1. 打开 Cloudflare **Zero Trust**；
2. 进入 **Access controls → Applications**；
3. 新建一个 Self-hosted 应用；
4. Public hostname 填写 FinPrint 的自定义域名；
5. 新建 `Allow` 策略，只填写允许访问的邮箱；
6. 身份验证方式选择 One-time PIN，或接入 Google、Microsoft 等现有账号；
7. 使用无痕窗口访问域名，确认未登录用户会先进入验证页面。

如果只有一个人使用，只允许自己的邮箱即可；如果多人使用，应分别添加成员邮箱，不建议多人共用一个固定密码。

Cloudflare Access 在网页加载前完成验证，不需要修改 FinPrint 的业务代码。`wrangler.jsonc` 已设置 `workers_dev: false` 和 `preview_urls: false`，避免访问者通过公开的 `workers.dev` 或预览地址绕过自定义域名上的验证。

### 6. 浏览器数据说明

FinPrint 的文件和拼版状态保存在浏览器 IndexedDB 中，并按照“协议 + 域名 + 端口”隔离。

因此从本地地址切换到 Cloudflare 域名后：

```text
http://127.0.0.1:5166/
```

和：

```text
https://print.example.com/
```

会被视为两个不同的网站。原来在本地地址导入的文件不会自动出现在 Cloudflare 域名下，需要重新导入。

## Docker Compose 部署（自建服务器）

当前 `docker-compose.yml` 不在服务器上构建源码，而是直接拉取 GHCR 镜像：

```yaml
services:
  finprint:
    image: ghcr.io/lld338/finprint:latest
    pull_policy: always
    container_name: finprint
    restart: always
    ports:
      - "127.0.0.1:5166:5166"
```

这种方式不要求服务器安装 Node.js，也不需要在服务器运行 `npm install` 或 `docker build`。

### 1. 获取部署文件

可以克隆仓库：

```bash
git clone https://github.com/lld338/FinPrint.git
cd FinPrint
```

服务器只需要 `docker-compose.yml`。克隆仓库主要是为了方便后续同步部署配置。

### 2. 拉取镜像并启动

```bash
docker compose pull
docker compose up -d
```

也可以直接执行：

```bash
docker compose up -d
```

配置中的 `pull_policy: always` 会要求 Docker Compose 检查并拉取最新镜像。正式更新时仍建议显式执行 `docker compose pull`，便于观察拉取结果。

### 3. 查看状态和健康检查

```bash
docker compose ps
```

Dockerfile 内置健康检查。正常启动一段时间后，容器状态应显示为 `healthy`。

### 4. 查看日志

```bash
docker compose logs -f finprint
```

### 5. 访问系统

默认端口配置为：

```yaml
ports:
  - "127.0.0.1:5166:5166"
```

这表示只有服务器本机可以直接访问：

```text
http://127.0.0.1:5166/
```

推荐通过 Nginx、Caddy、宝塔等反向代理提供域名和 HTTPS。

如果需要让局域网中的其他设备直接访问，将端口改为：

```yaml
ports:
  - "5166:5166"
```

然后访问：

```text
http://服务器IP:5166/
```

### 6. 更新服务器上的 FinPrint

GHCR 中的 `latest` 镜像更新后，在服务器执行：

```bash
docker compose pull
docker compose up -d
```

Docker Compose 会拉取新的 `latest` 镜像并重新创建容器。浏览器中的报销文件和拼版状态保存在客户端 IndexedDB 中，正常更换容器不会清除这些内容。

查看当前容器使用的镜像：

```bash
docker inspect --format='{{.Config.Image}}' finprint
```

### 7. 停止或删除容器

停止服务：

```bash
docker compose stop
```

重新启动：

```bash
docker compose start
```

停止并删除容器：

```bash
docker compose down
```

## 发布版本标签

如果准备发布 `v1.0.0`：

```bash
git tag v1.0.0
git push origin v1.0.0
```

可使用以下版本标签：

```text
ghcr.io/lld338/finprint:1.0.0
ghcr.io/lld338/finprint:1.0
```

服务器可以固定使用该版本：

```yaml
services:
  finprint:
    image: ghcr.io/lld338/finprint:1.0.0
```

固定版本不会自动切换到新的 `latest`，更适合需要可控升级和快速回滚的正式环境。

## 本地构建 Docker 镜像

项目根目录提供了 `Dockerfile`，开发人员可以在本地构建：

```bash
docker build -t finprint:local .
```

运行本地镜像：

```bash
docker run -d \
  --name finprint-local \
  --restart unless-stopped \
  -p 5166:5166 \
  finprint:local
```

本地构建主要用于开发验证；正式服务器推荐直接拉取 GHCR 镜像。

## 修改宿主机访问端口

容器内部固定监听 `5166`。例如，把宿主机本地端口改成 `8080`：

```yaml
ports:
  - "127.0.0.1:8080:5166"
```

访问地址变为：

```text
http://127.0.0.1:8080/
```

注意：端口或域名变化会改变浏览器网站来源。原来保存在 `127.0.0.1:5166` 下的 IndexedDB 工作内容，不会自动出现在新地址下。

## Docker 镜像工作方式

`Dockerfile` 使用两阶段构建：

1. `node:22-alpine` 执行 `npm ci` 和 `npm run build`；
2. `nginx:1.27-alpine` 只复制最终的 `dist/` 静态文件并监听 `5166`。

最终运行容器不包含 Node.js 开发服务器，也不会在容器中保存用户 PDF。

Nginx 配置包括：

- 单页应用路由回退；
- HTML 禁止长期缓存；
- 带哈希的 JS、CSS、PDF Worker 等静态资源长期缓存；
- gzip 压缩；
- 基础安全响应头；
- Docker 健康检查地址 `/`。

## 打印操作建议

生成 PDF 后，在浏览器或系统 PDF 查看器的打印窗口中选择：

1. 与当前打印页一致的纸张，例如 A4 或 A5；
2. “实际大小”或 `100%`；
3. 不要再次选择“适合页面”“缩小超大页面”或其他二次缩放选项；
4. 如果输出同时包含 A4 和 A5 页面，确认打印机驱动是否支持根据 PDF 页面尺寸自动选择纸盒；
5. 不支持自动选纸时，可以分别导出或在打印窗口中按页面范围打印；
6. A4 / A5 整页默认使用 `0 mm` 页边距，避免原稿在目标纸张内被再次缩小。需要为打印机保留白边时，可在“03 · 打印设置”中手动增加页边距。

## 常见问题

### 1. 启动开发服务时提示 `Port 5166 is already in use`

说明该端口已经有服务监听。先访问 `http://127.0.0.1:5166/`，如果页面可正常打开，就不需要再次运行 `npm run dev`。

如需关闭旧进程：

```bash
lsof -nP -iTCP:5166 -sTCP:LISTEN
kill <PID>
```

不要在未确认进程用途时使用强制结束命令。

### 2. Docker 启动时报端口冲突

把 `docker-compose.yml` 中的宿主机端口改为其他未占用端口，例如：

```yaml
ports:
  - "8080:5166"
```

### 3. 刷新页面后文件没有恢复

检查以下情况：

- 是否切换了 `localhost`、`127.0.0.1` 或服务器 IP；
- 是否修改了访问端口；
- 是否使用了无痕窗口；
- 是否清除了浏览器网站数据；
- 浏览器是否禁用了 IndexedDB 或网站存储。

### 4. 更新容器后页面看起来仍是旧版本

先普通刷新页面。仍未更新时，可以执行强制刷新，或清理该网站的 HTTP 缓存。不要误删 IndexedDB，否则已导入的工作内容也会被清除。

### 5. “PDF 页面 A4”但内容只占上半页

该标识判断的是 PDF 页面框尺寸，而不是内容范围。请在“03 · 打印设置”中选择“自动去下方空白”，系统会使用检测出的有效内容区域进行拼版和导出。

### 6. 图片无法导入或方向不正确

当前支持 JPG、JPEG、PNG、WEBP 和 BMP。HEIC、TIFF、SVG 等格式暂不支持，请先使用系统图片工具转换为 JPG 或 PNG。

图片导入后会显示为单页材料，并默认参与 A4 上下拼版。图片本身通常没有可信的 A4 / A5 物理尺寸，可在“03 · 打印设置”中手动选择纸张、方向、整页 / 上下 / 左右，并调整缩放和位置。

现代浏览器通常会自动应用手机照片的 EXIF 方向。如果个别旧浏览器仍显示方向错误，请先旋转并另存为 JPG / PNG 后再导入。

### 7. Docker 容器是否需要挂载数据目录

不需要。FinPrint 没有服务器端数据库，PDF、图片和工作状态保存在客户端浏览器中。挂载 Nginx 目录不会备份浏览器中的工作内容。

### 8. PDF 查看器里的打印按钮没有反应

部分应用内置浏览器（例如 ChatGPT / Codex 内置浏览器）的 PDF 查看器可能无法调出系统打印窗口。这是内置浏览器对 PDF 打印能力的限制，不代表生成的 PDF 有问题。

FinPrint 会优先使用同源打印地址，以提高内置浏览器的兼容性。如果仍然没有反应，请使用以下任一方式：

- 在普通 Chrome、Edge、Safari 等浏览器中打开 FinPrint 后重新点击“生成并打印”；
- 点击“导出 PDF”，再使用系统“预览”、Adobe Acrobat 或其他 PDF 查看器打印。

为了避免打印版面被再次缩放，请在系统打印窗口中选择“实际大小”或 `100%`。

## 项目目录结构

```text
FinPrint/
├── .github/
│   └── workflows/
│       └── docker-publish.yml # Actions 自动构建并发布 GHCR 镜像
├── deploy/
│   └── nginx.conf          # Docker 容器中的 Nginx 配置
├── public/
│   └── finprint-print-sw.js # 为生成的 PDF 提供同源打印地址
├── src/
│   ├── App.tsx             # 主界面与交互逻辑
│   ├── files.ts            # PDF / 图片文件类型识别
│   ├── files.test.ts       # 文件类型识别测试
│   ├── layout.ts           # 拼版尺寸与位置计算
│   ├── layout.test.ts      # 布局单元测试
│   ├── pdf.ts              # PDF / 图片读取、转换、预览、裁切与导出
│   ├── print.ts            # 打印地址与内置浏览器兼容处理
│   ├── storage.ts          # 浏览器 IndexedDB 持久化
│   ├── styles.css          # 页面样式
│   └── types.ts            # TypeScript 类型
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── wrangler.jsonc         # Cloudflare Workers 静态资源部署配置
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts
```

## 技术栈

- React 18
- TypeScript
- Vite 6
- PDF.js
- pdf-lib
- Vitest
- Nginx
- Docker / Docker Compose
- Cloudflare Workers / Wrangler
- GitHub Actions / GHCR

## License

当前项目未声明开源许可证。如需对外分发或开源，请先补充合适的 `LICENSE` 文件。
