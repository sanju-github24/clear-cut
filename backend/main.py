"""
Background Removal API
Run: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import torch.nn as nn
import segmentation_models_pytorch as smp
import cv2
import numpy as np
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import io
import os

app = FastAPI(title="Background Removal API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ──────────────────────────────────────────────
IMG_SIZE   = 320
DEVICE     = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_PATH = os.getenv("MODEL_PATH", "bg_removal_checkpoint.pth")

# ── Load model ──────────────────────────────────────────
print(f"Loading model from {MODEL_PATH} on {DEVICE}...")

model = smp.Unet(
    encoder_name    = "resnet34",
    encoder_weights = None,
    in_channels     = 3,
    classes         = 1,
    activation      = "sigmoid",
).to(DEVICE)

checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)

# Handle both plain state_dict and full checkpoint
if "model_state" in checkpoint:
    model.load_state_dict(checkpoint["model_state"])
else:
    model.load_state_dict(checkpoint)

model.eval()
print("✅ Model loaded!")

# ── Preprocessing ────────────────────────────────────────
transform = A.Compose([
    A.Resize(IMG_SIZE, IMG_SIZE),
    A.Normalize(mean=(0.485, 0.456, 0.406),
                std =(0.229, 0.224, 0.225)),
    ToTensorV2(),
])


def predict_mask(img_rgb: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    """Run model inference, return binary mask (H, W) uint8 0/255."""
    h, w = img_rgb.shape[:2]
    aug    = transform(image=img_rgb)
    tensor = aug["image"].unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        pred = model(tensor)[0, 0].cpu().numpy()   # (320, 320) float

    mask = cv2.resize(pred, (w, h))
    mask = (mask > threshold).astype(np.uint8) * 255
    return mask


def apply_background(img_rgb: np.ndarray, mask: np.ndarray, bg: str) -> Image.Image:
    """
    Composite foreground over chosen background and return a PIL RGBA image.
    bg: 'transparent' | 'white' | 'black' | '#rrggbb'
    """
    rgba = np.dstack([img_rgb, mask])           # H W 4
    pil  = Image.fromarray(rgba, "RGBA")

    if bg == "transparent":
        return pil

    if bg == "white":
        color = (255, 255, 255, 255)
    elif bg == "black":
        color = (0, 0, 0, 255)
    else:                                        # hex color
        hex_ = bg.lstrip("#")
        r, g, b = int(hex_[0:2], 16), int(hex_[2:4], 16), int(hex_[4:6], 16)
        color = (r, g, b, 255)

    canvas = Image.new("RGBA", pil.size, color)
    canvas.paste(pil, mask=pil.split()[3])
    return canvas.convert("RGB") if bg != "transparent" else canvas


# ── Endpoints ────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}


@app.post("/remove-background")
async def remove_background(
    file      : UploadFile = File(...),
    background: str        = Form("white"),    # white | black | transparent | #hex
    threshold : float      = Form(0.5),
):
    # Read image
    data    = await file.read()
    nparr   = np.frombuffer(data, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_bgr is None:
        return JSONResponse(status_code=400, content={"error": "Invalid image"})

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Predict
    mask   = predict_mask(img_rgb, threshold)
    result = apply_background(img_rgb, mask, background)

    # Stream back as PNG
    buf = io.BytesIO()
    result.save(buf, format="PNG")
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="result.png"'},
    )
