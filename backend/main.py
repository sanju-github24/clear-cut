"""
ClearCut Background Removal API
Run: uvicorn main:app --host 0.0.0.0 --port $PORT

Uses ONNX runtime instead of PyTorch for low memory usage (~150MB).
Fits Render free tier (512MB RAM).
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
import cv2
import numpy as np
from PIL import Image
import io
import os

# ── App ──────────────────────────────────────────────────
app = FastAPI(title="ClearCut API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ───────────────────────────────────────────────
IMG_SIZE   = 320
MODEL_PATH = os.getenv("MODEL_PATH", "model.onnx")

# ── Load ONNX model ──────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(
        f"\n❌ ONNX model not found at '{MODEL_PATH}'.\n"
        f"   Run export_onnx.py first to convert your .pth to model.onnx\n"
    )

print(f"🔧 Loading ONNX model from {MODEL_PATH} ...")
sess_options = ort.SessionOptions()
sess_options.intra_op_num_threads = 2   # limit CPU threads on free tier
session = ort.InferenceSession(
    MODEL_PATH,
    sess_options=sess_options,
    providers=["CPUExecutionProvider"],
)
INPUT_NAME  = session.get_inputs()[0].name
OUTPUT_NAME = session.get_outputs()[0].name
print("✅ Model ready!")

# ── Mean/std for normalization (ImageNet) ────────────────
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


# ── Inference ────────────────────────────────────────────
def predict_mask(img_rgb: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    h, w = img_rgb.shape[:2]

    # Preprocess
    resized = cv2.resize(img_rgb, (IMG_SIZE, IMG_SIZE))
    tensor  = (resized.astype(np.float32) / 255.0 - MEAN) / STD  # H W C
    tensor  = tensor.transpose(2, 0, 1)[np.newaxis]               # 1 C H W

    # Run
    pred = session.run([OUTPUT_NAME], {INPUT_NAME: tensor})[0]    # 1 1 H W
    pred = pred[0, 0]                                              # H W

    # Resize back & binarize
    mask = cv2.resize(pred, (w, h))
    return (mask > threshold).astype(np.uint8) * 255


def apply_background(img_rgb: np.ndarray, mask: np.ndarray, bg: str) -> Image.Image:
    rgba = Image.fromarray(np.dstack([img_rgb, mask]), "RGBA")
    if bg == "transparent":
        return rgba
    color = {"white": (255, 255, 255, 255), "black": (0, 0, 0, 255)}.get(bg)
    if color is None:                   # hex color e.g. #ff0000
        h = bg.lstrip("#")
        color = (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
    canvas = Image.new("RGBA", rgba.size, color)
    canvas.paste(rgba, mask=rgba.split()[3])
    return canvas


# ── Routes ───────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH}


@app.post("/remove-background")
async def remove_background(
    file:       UploadFile = File(...),
    background: str        = Form("transparent"),
    threshold:  float      = Form(0.5),
):
    data    = await file.read()
    img_bgr = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)

    if img_bgr is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image file."})

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    mask    = predict_mask(img_rgb, threshold)
    result  = apply_background(img_rgb, mask, background)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": 'attachment; filename="result.png"'},
    )