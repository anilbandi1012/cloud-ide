FROM node:20-bullseye

# Install compilers
RUN apt-get update && apt-get install -y \
    python3 \
    openjdk-17-jdk \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---------- FRONTEND ----------
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client .
RUN npm run build

# ---------- BACKEND ----------
WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

EXPOSE 5000
CMD ["node", "app.js"]
