# Base OS
FROM node:20-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openjdk-17-jdk \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend
COPY backend ./backend

# Copy frontend build
COPY client/build ./client/build

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "app.js"]
