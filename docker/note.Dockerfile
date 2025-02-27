# 构建阶段
FROM node:20.18-alpine as builder

WORKDIR /app

# 复制 package.json 和 yarn.lock
COPY note/package.json note/yarn.lock ./

# 安装依赖
RUN yarn install

# 复制源代码
COPY note/ ./

# 构建项目
RUN yarn build

# 运行阶段
FROM nginx:alpine

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]