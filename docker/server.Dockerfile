FROM node:20.18-alpine

# 安装 git
RUN apk add --no-cache git

WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY server/package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY server/ ./
COPY .env ./

EXPOSE 3333

CMD ["/bin/sh", "-c", "git config --global user.name \"$GIT_USER_NAME\" && git config --global user.email \"$GIT_USER_EMAIL\" && (npm run schedule & npm run start)"]