# 部署指南 — Linux Docker

## 前置条件

- Linux 服务器（Ubuntu 20.04+/Debian 11+ 推荐）
- 已安装 Docker 和 Docker Compose（可选）
- 服务器已开放端口 `3000`

## 1. 安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sudo bash
sudo systemctl enable --now docker
```

验证安装：

```bash
sudo docker --version
```

## 2. 部署方式

### 方式一：直接构建并运行

```bash
# 在项目根目录执行
docker build -t sgtvs .

docker run -d \
  --name sgtvs \
  -p 3000:3000 \
  --restart unless-stopped \
  sgtvs
```

### 方式二：使用 Docker Compose（推荐）

项目根目录已提供 `docker-compose.yml`（含数据持久化卷配置，见第 3 节）。

启动：

```bash
docker compose up -d
```

## 3. 数据持久化（重要）

网站的运行时数据（成员、大事年表、联系设置、上传的图片）存储在 `public/api/*.json` 与 `public/uploads/` 中。这些文件**不被 git 跟踪、不进入镜像**（见 `.dockerignore`），服务器首次启动时会从 `defaults/` 自动生成空配置。

因此必须通过卷挂载持久化，否则容器删除/重建后配置与图片会丢失。仓库内 `docker-compose.yml` 已配置好以下两个卷（无需手动修改）：

| 卷 | 挂载点 | 保存内容 |
|----|--------|----------|
| `sgtvs_api` | `/app/public/api` | 成员、大事年表、联系设置（JSON 配置） |
| `sgtvs_uploads` | `/app/public/uploads` | 后台上传的图片 |

若使用 `docker run` 直接部署，需手动加 `-v sgtvs_api:/app/public/api -v sgtvs_uploads:/app/public/uploads`。

## 4. 自定义端口

```bash
# 映射到宿主机 8080 端口
docker run -d -p 8080:3000 --name sgtvs --restart unless-stopped sgtvs
```

## 5. 查看日志

```bash
docker logs -f sgtvs
```

## 6. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose down
docker compose up -d --build
```

> 更新不会影响已有数据：`public/api/*.json` 与 `public/uploads/` 存放在 Docker 卷中，重建容器、拉取代码均不会覆盖客户在后台修改的配置与上传的图片。新部署（首次启动）才会从 `defaults/` 生成空配置。

## 7. Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `docker ps` | 查看运行中的容器 |
| `docker stop sgtvs` | 停止容器 |
| `docker start sgtvs` | 启动容器 |
| `docker restart sgtvs` | 重启容器 |
| `docker rm sgtvs` | 删除容器 |
| `docker logs -f sgtvs` | 跟踪日志 |
