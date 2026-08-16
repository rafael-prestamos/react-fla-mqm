#!/usr/bin/env python3
"""
Script: process-logo.py
Sprint 7a-3: Procesa el logo original para uso en PDFs react-pdf.

Pasos:
  1. Cargar logo-source-1024.png desde src/assets/branding/
  2. Quitar fondo blanco si no tiene transparencia
  3. Agregar borde blanco siguiendo el contorno del alpha channel (NO circular)
  4. Agregar drop-shadow sutil detras del contorno
  5. Exportar a:
     - public/logo-pdf.png  (para servir como asset estatico)
     - src/assets/logo-pdf.png  (para import estatico de Vite en react-pdf)
"""

from pathlib import Path

try:
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError:
    print("ERROR: Pillow y numpy son necesarios.")
    print("  Instalar con: pip install Pillow numpy")
    raise SystemExit(1)

# Rutas
REPO_ROOT   = Path(__file__).resolve().parent.parent
SRC_LOGO    = REPO_ROOT / "src" / "assets" / "branding" / "logo-source-1024.png"
OUT_PUBLIC  = REPO_ROOT / "public" / "logo-pdf.png"
OUT_ASSETS  = REPO_ROOT / "src" / "assets" / "logo-pdf.png"

# Parametros
OUTPUT_SIZE     = 256
OUTLINE_PX      = 3
SHADOW_OFFSET_X = 0
SHADOW_OFFSET_Y = 2
SHADOW_BLUR     = 4
SHADOW_OPACITY  = 0.28
WHITE_THRESHOLD = 235


def remove_white_background(img, threshold=WHITE_THRESHOLD):
    img = img.convert("RGBA")
    data = np.array(img, dtype=np.uint8)
    r, g, b, a = data[..., 0], data[..., 1], data[..., 2], data[..., 3]
    white_mask = (r >= threshold) & (g >= threshold) & (b >= threshold) & (a >= 200)
    data[..., 3] = np.where(white_mask, 0, a)
    return Image.fromarray(data, "RGBA")


def add_outline(img, outline_px):
    alpha = np.array(img.split()[3], dtype=np.uint8)
    alpha_img = Image.fromarray(alpha, "L")
    kernel_size = outline_px * 2 + 1
    dilated_img = alpha_img.filter(ImageFilter.MaxFilter(kernel_size))
    dilated = np.array(dilated_img, dtype=np.uint8)
    ring_mask = (dilated > 100) & (alpha < 100)
    outline_data = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    outline_data[ring_mask] = [255, 255, 255, 255]
    outline_layer = Image.fromarray(outline_data, "RGBA")
    result = Image.new("RGBA", img.size, (0, 0, 0, 0))
    result = Image.alpha_composite(result, outline_layer)
    result = Image.alpha_composite(result, img)
    return result


def add_drop_shadow(img, offset_x, offset_y, blur_radius, opacity):
    ox, oy = offset_x, offset_y
    margin = blur_radius * 2
    canvas_w = img.width  + abs(ox) + margin * 2
    canvas_h = img.height + abs(oy) + margin * 2
    img_x = margin + (abs(ox) if ox < 0 else 0)
    img_y = margin + (abs(oy) if oy < 0 else 0)
    shadow_x = img_x + ox
    shadow_y = img_y + oy
    alpha_arr = np.array(img.split()[3], dtype=np.uint8)
    shadow_data = np.zeros((*alpha_arr.shape, 4), dtype=np.uint8)
    mask = alpha_arr > 10
    shadow_data[mask] = [0, 0, 0, int(255 * opacity)]
    shadow_img = Image.fromarray(shadow_data, "RGBA")
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    canvas.paste(shadow_blurred, (shadow_x, shadow_y), shadow_blurred)
    canvas.paste(img, (img_x, img_y), img)
    return canvas


def main():
    print("Fuente: {}".format(SRC_LOGO))
    if not SRC_LOGO.exists():
        raise FileNotFoundError("No se encontro el logo fuente: {}".format(SRC_LOGO))

    img = Image.open(SRC_LOGO)
    print("  Tamano original: {}  modo: {}".format(img.size, img.mode))

    img.thumbnail((OUTPUT_SIZE, OUTPUT_SIZE), Image.LANCZOS)
    img = img.convert("RGBA")
    print("  Tamano tras resize: {}".format(img.size))

    alpha_arr = np.array(img.split()[3])
    has_real_transparency = bool((alpha_arr < 250).any() and (alpha_arr > 5).any())
    print("  Alpha channel util: {}".format(has_real_transparency))

    if not has_real_transparency:
        print("  Quitando fondo blanco...")
        img = remove_white_background(img)

    print("  Agregando borde blanco ({}px)...".format(OUTLINE_PX))
    img = add_outline(img, OUTLINE_PX)

    print("  Agregando drop-shadow...")
    img = add_drop_shadow(img, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_BLUR, SHADOW_OPACITY)

    for out_path in (OUT_PUBLIC, OUT_ASSETS):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(out_path, "PNG", optimize=True)
        print("Exportado -> {}  {}".format(out_path, img.size))

    print("process-logo.py completado sin errores.")


if __name__ == "__main__":
    main()
