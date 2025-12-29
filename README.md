# CodeSphere IDE

![Node.js](https://img.shields.io/badge/Node.js-20.19.6-green)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

**CodeSphere IDE** is a cloud-based, multi-language online IDE supporting **JavaScript, Python, Java, and C++**.  
It allows users to write, edit, and execute code safely in a browser with instant feedback and error highlighting.

---

## 🌟 Features

- Run **JavaScript, Python, Java, and C++** code
- File management: **create, rename, delete**
- Syntax highlighting and error coloring using **Monaco Editor**
- Console output with **auto-scroll**
- **Auto-save** code for each file
- Theme toggle: Light / Dark mode
- Dockerized backend for **safe execution**
- Supports per-file code persistence
- Handles multi-file projects (future enhancement ready)

---

## 🚀 Installation (Local)

1. **Clone the repository**
```bash
git clone https://github.com/<your-username>/cloud-ide.git
cd cloud-ide

# Backend
cd backend
npm install

# Frontend
cd ../client
npm install
npm run build

# Run server
cd ../backend
node index.js
```

##Future Enhancements

- Add custom input support for code execution

- Add multi-file project support

- Add memory and CPU limits per execution

- Queue system for handling large programs safely

- Real-time collaboration (like VS Code Live Share)

- Support for additional languages (Ruby, Go, etc.)
