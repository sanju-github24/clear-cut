<div align="center">

# ✂️ ClearCut

**AI-powered background remover — drag, drop, done.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-clear--cut.vercel.app-black?style=for-the-badge&logo=vercel)](https://clear-cut-orpin.vercel.app/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![PyTorch](https://img.shields.io/badge/PyTorch-ee4c2c?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)

</div>

---

## 🖼️ What it does

Upload any photo — ClearCut removes the background in seconds using a custom-trained deep learning model. Choose your output: transparent, white, black, or any custom colour.

**[→ Try it live](https://clear-cut-orpin.vercel.app/)**

---

## ✨ Features

- 🖱️ **Drag & drop** upload or click to browse
- 🎨 **Background options** — Transparent · White · Black · Custom hex colour
- 🎚️ **Edge sensitivity slider** — fine-tune the mask threshold
- 👁️ **Split / Original / Result** view for easy comparison
- 💾 **One-click PNG download**
- 🔁 **Re-process without re-uploading** — tweak settings and re-run instantly

---

## 🧠 Model

Custom-trained **U-Net + EfficientNet-B4** on the DUTS saliency dataset (15 k+ images).

| | |
|---|---|
| Architecture | U-Net with SCSE attention |
| Encoder | EfficientNet-B4 (ImageNet) |
| Input size | 512 × 512 |
| Inference | TTA (3-pass flip averaging) |
| Loss | BCE + Dice + Edge-aware Boundary |

---

## 🗂️ Project Structure

```
clear-cut/
├── backend/
│   ├── main.py            # FastAPI server
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 🚀 Run Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> Model downloads automatically on first run. API docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> App runs at `http://localhost:3000`

---

## 🔌 API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server + GPU status |
| `POST` | `/remove-background` | Process an image |

**POST `/remove-background`**

| Field | Type | Default | Description |
|---|---|---|---|
| `file` | File | — | PNG / JPG / WEBP |
| `background` | string | `white` | `white` · `black` · `transparent` · `#hex` |
| `threshold` | float | `0.45` | Mask sensitivity (0.1 – 0.9) |

Returns a **PNG image**.

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Model | PyTorch · segmentation-models-pytorch |
| Backend | FastAPI · OpenCV · Pillow |
| Frontend | React · Vite |
| Deploy | Vercel (frontend) |

---

<div align="center">

Made with ❤️ · [Live Demo](https://clear-cut-orpin.vercel.app/)

</div>
