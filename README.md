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

Fatura e-postaları için `.env` içinde SMTP bilgileri de olmalı:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="CS308 Store" <your-email@gmail.com>
```

Gmail kullanıyorsan normal hesap şifresi yerine uygulama şifresi kullanman gerekir. Test için Mailtrap/Ethereal gibi bir SMTP hesabı da kullanabilirsin.

---

### Çalıştırma

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
