# 🌐 Network Monitoring Dashboard

A fullstack **Network Monitoring Dashboard** that lets you track the health of servers, routers, switches, and websites in real time — with both real (ICMP/port-based) monitoring and simulated demo data.

![Status](https://img.shields.io/badge/status-in--development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

- **Device Management** — Add, edit, delete, and group devices/hosts (servers, routers, switches, websites)
- **Two Monitoring Modes**
  - **Real mode** — actual ICMP ping and TCP port checks (80, 443, 22, etc.)
  - **Simulated mode** — realistic fake latency/uptime/packet-loss data, toggled per device via `is_simulated`
- **Background Monitoring Engine** — scheduled checks (APScheduler/Celery) storing historical results in PostgreSQL
- **Live Dashboard**
  - Overview card grid with UP / DOWN / WARNING status, latency, and last-checked time
  - Color-coded status (🟢 up, 🔴 down, 🟡 warning)
  - Device detail page with latency history charts (1h / 24h / 7d) and packet loss charts
  - Global summary widgets (total devices, up/down count, average latency)
- **Alerting** — configurable thresholds per device, alert history log, in-app down notifications
- **Authentication** — JWT-based login with a seeded admin user
- **Real-time updates** via WebSockets (Flask-SocketIO) or polling

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|--------------------------------------|
| Frontend   | Vue 3 (Composition API) + Vite       |
| State      | Pinia                                |
| Charts     | Chart.js (via vue-chartjs)           |
| Backend    | Python + Flask (REST API)            |
| Realtime   | Flask-SocketIO / polling             |
| Database   | PostgreSQL + SQLAlchemy + Alembic    |
| Scheduler  | APScheduler / Celery                 |
| Auth       | JWT                                  |
| Deployment | Docker + Docker Compose              |

---

## 📁 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # API blueprints
│   │   └── services/        # ping_service.py, simulation_service.py, scheduler.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── composables/     # useDevices.js, useWebSocket.js
│   │   └── router/
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🗄️ Database Schema

```sql
devices (id, name, ip_address, type, group_name, is_simulated, ping_interval_sec, latency_threshold_ms, created_at)
device_checks (id, device_id FK, timestamp, status, latency_ms, packet_loss_pct)
alerts (id, device_id FK, triggered_at, resolved_at, message, severity)
users (id, username, password_hash, created_at)
```

---

## 🔌 API Endpoints

| Method | Endpoint                          | Description                  |
|--------|------------------------------------|-------------------------------|
| POST   | `/api/auth/login`                 | Authenticate and get JWT     |
| GET    | `/api/devices`                     | List all devices             |
| POST   | `/api/devices`                     | Add a new device              |
| PUT    | `/api/devices/:id`                | Update a device               |
| DELETE | `/api/devices/:id`                | Remove a device               |
| GET    | `/api/devices/:id/history?range=24h` | Get historical metrics    |
| GET    | `/api/devices/:id/status`         | Get current status            |
| GET    | `/api/alerts`                      | List alert history            |
| GET    | `/api/dashboard/summary`          | Global dashboard summary      |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ (or use Docker Compose below)
- Docker & Docker Compose (optional but recommended)

### Option 1 — Run with Docker Compose (recommended)

```bash
git clone https://github.com/<your-username>/network-monitoring-dashboard.git
cd network-monitoring-dashboard
cp backend/.env.example backend/.env
docker-compose up --build
```

The app will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Option 2 — Run manually

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # set DATABASE_URL, JWT_SECRET, etc.
flask db upgrade           # run migrations
python run.py              # seeds an admin user on first run
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env       # set VITE_API_BASE_URL
npm run dev
```

---

## ⚙️ Environment Variables

**backend/.env.example**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/netmon
JWT_SECRET=change-me
PING_INTERVAL_SEC=15
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me
```

**frontend/.env.example**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🧭 Roadmap / Build Order

1. Backend scaffolding (Flask app factory, blueprints, SQLAlchemy models, Alembic migrations)
2. Simulated monitoring service (so the app is demoable without real devices)
3. Real ping/port-check service behind the `is_simulated` flag
4. Vue frontend scaffold (Vite, Vue Router, Pinia)
5. Frontend ↔ backend integration via Axios
6. Docker Compose setup (postgres + backend + frontend)

> ⚠️ **Note:** If deploying to a cloud VM, make sure your firewall/security group allows outbound ICMP — many cloud providers block it by default, which will make real-mode ping checks fail silently.

---

## 📄 License

This project is licensed under the MIT License — feel free to use, modify, and share it.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues) if you want to contribute.