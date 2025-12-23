FROM node:20-bullseye

# Install compilers
RUN apt-get update && apt-get install -y \
    python3 \
    openjdk-17-jdk \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---------- FRONTEND ----------
COPY client ./client
WORKDIR /app/client
RUN npm install
RUN npm run build   # creates dist/

# ---------- BACKEND ----------
WORKDIR /app
COPY backend ./backend
WORKDIR /app/backend
RUN npm install

EXPOSE 5000
CMD ["node", "app.js"]
