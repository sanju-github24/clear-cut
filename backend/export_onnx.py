"""
Convert bg_removal_checkpoint.pth → model.onnx
Run this ONCE on your local machine before deploying.

Usage:
  cd backend/
  python export_onnx.py
"""

import torch
import segmentation_models_pytorch as smp

MODEL_PTH  = "bg_removal_checkpoint.pth"
MODEL_ONNX = "model.onnx"
IMG_SIZE   = 320

print(f"Loading {MODEL_PTH} ...")
model = smp.Unet(
    encoder_name="resnet34", encoder_weights=None,
    in_channels=3, classes=1, activation="sigmoid",
)

ckpt = torch.load(MODEL_PTH, map_location="cpu")
model.load_state_dict(ckpt["model_state"] if "model_state" in ckpt else ckpt)
model.eval()

print(f"Exporting to {MODEL_ONNX} ...")
dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)
torch.onnx.export(
    model, dummy, MODEL_ONNX,
    opset_version    = 11,
    input_names      = ["input"],
    output_names     = ["output"],
    dynamic_axes     = {"input": {0: "batch"}, "output": {0: "batch"}},
)

import os
size_mb = os.path.getsize(MODEL_ONNX) / 1e6
print(f"✅ Exported! model.onnx → {size_mb:.1f} MB")
print(f"   (was {os.path.getsize(MODEL_PTH)/1e6:.1f} MB as .pth)")
print(f"\nNext: git add backend/model.onnx && git push")