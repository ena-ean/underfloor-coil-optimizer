# Underfloor Heating Coil Optimizer 🌀

Smart tool for optimizing underfloor heating coil purchases. Distributes circuit loops across coils to minimize waste and leftover material.

> 💡 AI-assisted project — built with Next.js, Bun, and Docker.

---

## ✨ Features

- **Smart Optimization** — distributes loops across coils with minimal waste
- **Purchase Planning** — helps calculate exact coil quantities needed
- **Simple Interface** — clean and intuitive web UI
- **Docker Ready** — one-command deployment

---

## 🚀 Quick Start

### Docker Run
```bash
docker pull enaresearch/underfloor-coil-optimizer:latest
docker run -d -p 3000:3000 --name coil-optimizer enaresearch/underfloor-coil-optimizer:latest
```

### Docker Compose
```yaml
version: '3.8'
services:
  coil-optimizer:
    image: enaresearch/underfloor-coil-optimizer:latest
    container_name: coil-optimizer
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
```

```bash
docker compose up -d
```

**Open:** http://localhost:3000

---

## 🛠 Build from Source

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

### Steps
```bash
git clone https://github.com/ena-ean/underfloor-coil-optimizer/
cd underfloor-coil-optimizer
docker compose up -d --build
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |


---

## 📦 Docker Hub

Pre-built images available at:  
https://hub.docker.com/r/enaresearch/underfloor-coil-optimizer

---

![App Screenshot](./app-main.png)

---


## 🤝 Contributing

This is my first GitHub project — built with AI assistance and refined with care.  
Feedback, issues, and pull requests are welcome!

---

## 📄 License

MIT License — feel free to use and modify.

---

*Built with Next.js, Bun, and Docker*
