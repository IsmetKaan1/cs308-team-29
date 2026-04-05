# CS308 Team 29

## Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas + SQLite (auth)

## Kurulum

### 1. `.env` dosyasını oluştur

```bash
cp .env.example .env
```

`.env` dosyasını açıp gerçek değerleri gir (takım arkadaşlarından al).

---

### Docker ile çalıştırma

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

### Docker olmadan çalıştırma

**Gereksinimler:** Node.js 18+

**Backend:**

```bash
cd backend
npm install
npm start
```

**Frontend** (yeni terminal):

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
