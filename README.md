# ClearCut — Background Remover

Full-stack background removal app using your trained U-Net model.

## Project Structure

```
bg-remover/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt
│   └── bg_removal_checkpoint.pth   ← put your model here
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Setup & Run

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Place your trained model in backend/
cp /path/to/bg_removal_checkpoint.pth .

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API will be live at → http://localhost:8000
Docs at → http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App will be live at → http://localhost:3000

---

## Features

- Drag & drop or click to upload image
- Background options: White (default) · Black · Transparent
- Edge sensitivity slider (threshold control)
- Split / Original / Result view toggle
- Download result as PNG
- Re-process with different settings without re-uploading

## API Endpoints

| Method | Path                 | Description              |
|--------|----------------------|--------------------------|
| GET    | /health              | Check server + GPU status|
| POST   | /remove-background   | Process image            |

### POST /remove-background

Form fields:
- `file`       — image file (PNG/JPG/WEBP)
- `background` — `white` | `black` | `transparent` | `#rrggbb`
- `threshold`  — float 0.1–0.9 (default 0.5)

Returns PNG image.

---

## Production Build

```bash
cd frontend
npm run build       # outputs to frontend/dist/
```

Serve `dist/` with nginx or any static host.
For backend, use `gunicorn` with `uvicorn` workers:

```bash
pip install gunicorn
gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
