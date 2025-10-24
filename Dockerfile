# ==============================
# 🧩 Stage 1: Build source
# ==============================
FROM node:2-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json & lockfile trước để cache npm install
COPY package*.json ./

# Cài đặt dependencies (dev)
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build NestJS -> dist/
RUN npm run build


# ==============================
# 🚀 Stage 2: Run production
# ==============================
FROM node:22-alpine AS runner

WORKDIR /app

# Copy package.json để install production deps
COPY package*.json ./

# Chỉ cài deps cần cho runtime
RUN npm install --only=production

# Copy dist từ stage build
COPY --from=builder /app/dist ./dist

# Copy file env nếu có
COPY .env .env

# Cổng service lắng nghe (theo env)
EXPOSE 4888

# Lệnh khởi động app
CMD ["node", "dist/main.js"]
