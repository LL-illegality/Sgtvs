# Sgtvs

深圳实验学校光明部电视台 — 着陆页 + 管理后台

## 技术栈

- **后端** Node.js + Express
- **前端** 原生 HTML / CSS / JavaScript
- **文件上传** Multer
- **部署** Docker

## 本地运行

```bash
npm install
npm start
```

服务默认监听 http://localhost:3000

## 管理后台

访问 `/admin` 进入管理后台，可对成员信息与时间线进行增删改查和排序。

## Docker 部署

```bash
docker build -t sgtvs .
docker run -d -p 3000:3000 --name sgtvs --restart unless-stopped sgtvs
```

详细部署流程请参阅 [`deploy.md`](./deploy.md)。
