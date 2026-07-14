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

## Docker Compose 部署（推荐）

项目根目录已经包含：

- `Dockerfile`：多阶段构建镜像；
- `docker-compose.yml`：启动容器并映射 5166 端口；
- `.dockerignore`：排除不需要复制到镜像的文件；
- `deploy/nginx.conf`：Nginx 静态站点配置。

### 1. 构建并启动

```bash
cd /Users/dull/my_project/FinPrint
docker compose up -d --build
```

### 2. 查看运行状态

```bash
docker compose ps
```

### 3. 查看日志

```bash
docker compose logs -f finprint
```

### 4. 访问系统

本机访问：

```text
http://127.0.0.1:5166/
```

同一局域网中的其他设备访问：

```text
http://服务器IP:5166/
```

服务器防火墙需要允许 TCP `5166` 端口。

### 5. 停止服务

```bash
docker compose stop
```

### 6. 重新启动

```bash
docker compose start
```

### 7. 停止并删除容器

```bash
docker compose down
```

删除容器不会删除浏览器中的 IndexedDB 工作内容。浏览器数据由访问页面的客户端浏览器管理，而不是保存在 Docker 容器中。

### 8. 更新代码后重新部署

```bash
docker compose up -d --build
```

如果希望强制重新构建且不使用旧的 Docker 构建缓存：

```bash
docker compose build --no-cache
docker compose up -d
```

## 直接使用 Docker 部署

如果不使用 Docker Compose，可以手动构建镜像：

```bash
docker build -t finprint:latest .
```

启动容器：

```bash
docker run -d \
  --name finprint \
  --restart unless-stopped \
  -p 5166:5166 \
  finprint:latest
```

查看容器状态：

```bash
docker ps --filter name=finprint
```

查看健康状态：

```bash
docker inspect --format='{{json .State.Health}}' finprint
```

查看日志：

```bash
docker logs -f finprint
```

停止并删除容器：

```bash
docker stop finprint
docker rm finprint
```

## 修改宿主机访问端口

容器内部固定监听 `5166`。如果宿主机的 `5166` 已被占用，可以只修改端口映射，不需要修改应用代码或 Nginx 配置。

例如，把宿主机端口改成 `8080`：

```yaml
ports:
  - "8080:5166"
```

然后访问：

```text
http://127.0.0.1:8080/
```

直接运行 Docker 时对应命令为：

```bash
docker run -d --name finprint -p 8080:5166 finprint:latest
```

注意：端口变化会改变浏览器网站来源。原来保存在 `127.0.0.1:5166` 下的工作内容，不会自动出现在 `127.0.0.1:8080` 下。

## Docker 镜像工作方式

`Dockerfile` 使用两阶段构建：

1. `node:22-alpine` 执行 `npm ci` 和 `npm run build`；
2. `nginx:1.27-alpine` 只复制最终的 `dist/` 静态文件并在 `5166` 端口提供服务。

因此最终运行容器中不包含 Node.js 开发服务器，也不会在容器内保存用户 PDF。

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
- Docker

## License

当前项目未声明开源许可证。如需对外分发或开源，请先补充合适的 `LICENSE` 文件。
