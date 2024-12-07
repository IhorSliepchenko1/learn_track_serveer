# Используем официальный Node.js образ
FROM node:20.15.0-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем nc (Netcat) для проверки доступности порта
RUN apk add --no-cache netcat-openbsd

# Копируем файлы package.json и package-lock.json
COPY package*.json ./ 

# Устанавливаем зависимости
RUN npm install

# Копируем остальное приложение в контейнер
COPY . .

# Копируем Prisma schema
COPY prisma/schema.prisma ./prisma/

# Устанавливаем Prisma CLI глобально
RUN npm install -g prisma

# Ожидаем, пока база данных станет доступна
RUN prisma migrate dev --name init
RUN prisma migrate deploy

# Открываем порт для приложения
EXPOSE 3000

# Указываем команду для запуска приложения
CMD ["npm", "start"]
