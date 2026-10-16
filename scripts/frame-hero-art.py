"""Frame original pixels in identical SVG canvases without resampling the artwork."""
import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Measured alpha bounds: (source width, source height, left, top, right, bottom).
BOUNDS = {
    "c7": (800, 719, 102, 1, 752, 719),
    "c0": (468, 667, 0, 0, 468, 667),
    "c2": (800, 719, 0, 2, 640, 719),
    "c5": (800, 719, 143, 0, 728, 719),
}
for character, (width, height, left, top, right, bottom) in BOUNDS.items():
    scale = 860 / (bottom - top)
    x = 400 - (left + right) * scale / 2
    y = 20 - top * scale
    pixels = base64.b64encode((ROOT / "dist/assets/heroes" / (character + ".webp")).read_bytes()).decode()
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900">'
           f'<image x="{x:.3f}" y="{y:.3f}" width="{width * scale:.3f}" height="{height * scale:.3f}" '
           f'href="data:image/webp;base64,{pixels}"/></svg>')
    (ROOT / "dist/assets/heroes" / (character + "-framed.svg")).write_text(svg)
