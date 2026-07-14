# FinPrint 报销打印台

FinPrint 是一个在浏览器中运行的 A4 / A5 报销 PDF 拼版、预览、导出与打印工具。它适合把电子发票、行程报销单、费用报销单等材料按照整页、上下两联或左右两联的方式排到标准纸张上。

项目是纯前端应用：PDF 的读取、预览、裁切和新 PDF 生成都在当前浏览器中完成，部署端只负责提供静态网页，不接收或保存用户上传的报销文件。

默认访问地址：`http://127.0.0.1:5166/`

## 主要功能

- 批量导入 PDF 文件。
- 识别 PDF 页面框对应的 A4、A5 或自定义尺寸。
- 支持 A4、A5 纸张。
- 支持纵向和横向纸张。
- 支持整页、上下两联、左右两联三种版式。
- 支持调整分割比例、页边距和中间留白。
- 可从“01 · 原始材料”拖拽文件到“02 · 拼版预览”的目标版位。
- 上下版位或左右版位之间可以拖拽互换位置。
- 每个版位可以单独选择 PDF 文件和页码。
- 每个版位可以独立设置完整显示、铺满区域、内容缩放及水平/垂直偏移。
- 横向页面支持靠左、居中、靠右快捷定位。
- 自动检测 PDF 页面下方的大面积空白，可选择自动裁掉或保留整页。
- 预览和最终导出使用相同的裁切、缩放与偏移计算。
- 导出时保留原 PDF 内容的矢量清晰度。
- 浏览器刷新后自动恢复已经导入的文件、拼版页面和版面设置。
- 顶部提供“清空全部”按钮，可主动删除浏览器中保存的所有工作内容。

## 页面区域说明

### 01 · 原始材料

用于导入和管理 PDF 报销材料。文件卡片中的“PDF 页面 A4 / A5”表示 PDF 页面框的实际尺寸，不代表页面中有效内容占用了整张纸。

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

FinPrint 不包含上传 PDF 的后端接口。选择的 PDF 文件只在浏览器本地处理。

工作内容使用浏览器的 IndexedDB 保存，因此：

- 刷新页面或重启 Docker 容器后，当前浏览器通常仍能恢复工作内容；
- 清除浏览器网站数据、使用无痕模式或点击“清空全部”后，内容会被删除；
- 浏览器按照“协议 + 域名/IP + 端口”隔离数据；
- `http://127.0.0.1:5166/`、`http://localhost:5166/` 和 `http://192.168.1.10:5166/` 会被视为三个不同的网站，各自保存独立数据；
- 更换电脑或浏览器不会自动同步数据。

如果材料敏感，建议只部署在可信内网或本机，不要直接暴露到公网。

## 环境要求

### 本地开发

- Node.js 20 或更高版本；
- npm 10 或兼容版本；
- 支持 IndexedDB、Canvas 和现代 JavaScript 的浏览器。

### Docker 部署

- Docker Engine；
- 可选：Docker Compose v2。

## 本地开发

进入项目目录：

```bash
cd /Users/dull/my_project/FinPrint
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

## GitHub Actions 自动发布镜像

仓库包含 `.github/workflows/docker-publish.yml`。工作流会自动构建 Docker 镜像并发布到 GitHub Container Registry（GHCR）：

```text
ghcr.io/lld338/finprint:latest
```

工作流支持 `linux/amd64` 和 `linux/arm64`，可用于常见的 x86_64 服务器、ARM 服务器和部分 NAS。

### 自动触发条件

以下操作会触发镜像构建：

- 推送代码到 `main` 分支；
- 推送格式为 `v*.*.*` 的版本标签，例如 `v1.0.0`；
- 在 GitHub 仓库的 Actions 页面中手动运行工作流。

普通代码更新流程：

```bash
git add .
git commit -m "更新功能"
git push origin main
```

推送完成后，在 GitHub 仓库的 **Actions** 页面等待 `Build and publish Docker image` 变成绿色。成功后，`latest` 镜像会更新。

### 镜像标签

工作流会生成以下标签：

- `latest`：`main` 分支最新构建；
- `sha-xxxxxxx`：与具体 Git 提交对应，适合固定版本；
- `1.2.3`、`1.2`：推送 `v1.2.3` 标签时生成。

正式环境如果希望每次更新都使用最新版，可以使用 `latest`。如果希望部署结果长期固定，建议在 `docker-compose.yml` 中填写版本号或 `sha-` 标签。

### 第一次发布后的 GHCR 权限

GHCR 软件包第一次创建后可能不是公开状态。希望服务器无需登录即可拉取时，需要在 GitHub 中打开 FinPrint 软件包设置，将软件包可见性改为 **Public**。

如果保持私有，则服务器必须先登录 GHCR。使用具有 `read:packages` 权限的 Personal Access Token：

```bash
echo "你的_TOKEN" | docker login ghcr.io -u lld338 --password-stdin
```

不要把 Token 写入 `docker-compose.yml`、README 或 Git 仓库。

## Docker Compose 部署（推荐）

当前 `docker-compose.yml` 不在服务器上构建源码，而是直接拉取 Actions 发布的镜像：

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

代码推送到 `main` 并且 GitHub Actions 构建成功后，在服务器执行：

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

Actions 会发布：

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

GitHub Actions 使用项目根目录中的 `Dockerfile`。开发人员也可以在本地构建：

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
5. 不支持自动选纸时，可以分别导出或在打印窗口中按页面范围打印。

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

### 6. Docker 容器是否需要挂载数据目录

不需要。FinPrint 没有服务器端数据库，PDF 和工作状态保存在客户端浏览器中。挂载 Nginx 目录不会备份浏览器中的工作内容。

## 项目目录结构

```text
FinPrint/
├── .github/
│   └── workflows/
│       └── docker-publish.yml # Actions 自动构建并发布 GHCR 镜像
├── deploy/
│   └── nginx.conf          # Docker 容器中的 Nginx 配置
├── src/
│   ├── App.tsx             # 主界面与交互逻辑
│   ├── layout.ts           # 拼版尺寸与位置计算
│   ├── layout.test.ts      # 布局单元测试
│   ├── pdf.ts              # PDF 读取、预览、裁切与导出
│   ├── storage.ts          # 浏览器 IndexedDB 持久化
│   ├── styles.css          # 页面样式
│   └── types.ts            # TypeScript 类型
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
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
- GitHub Actions / GHCR

## License

当前项目未声明开源许可证。如需对外分发或开源，请先补充合适的 `LICENSE` 文件。
