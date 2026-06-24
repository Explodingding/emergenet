"""Detect coloured zone rectangles in zones-marked.png and map to canvas cm."""
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

im = np.asarray(Image.open('scripts/zones-marked.png').convert('RGB')).astype(int)
H, W = im.shape[:2]

# zones-marked.png (12276x6060) == cropped PDF; site plan placed on canvas at
# SITE_PLAN_RECT {x:600,y:600,w:18800,h:9280}. Uniform scale.
SCALE = 18800 / W  # ~1.5314
def to_cm(px, py):
    return (round(600 + px * SCALE), round(600 + py * (9280 / H)))

# target marker colours (R,G,B) -> building  (standard Paint palette)
COLORS = {
    'FRN-20':            (255, 242,   0),  # yellow
    'FRN-10':            (255, 127,  39),  # orange
    'UTL-01':            (237,  28,  36),  # red
    'RST-01':            (255, 174, 201),  # pink
    'AWH-01':            (185, 122,  87),  # brown  (Automated Warehouse)
    'BTH-03':            ( 34, 177,  76),  # green
    'ADB-01':            (163,  73, 164),  # purple (Administration)
    'CT':                (  0, 162, 232),  # blue   (Cullet tower x2)
}

SAT = im.max(2) - im.min(2)
def mask_for(color, tol=30):
    c = np.array(color)
    # tight colour match AND high saturation (markers sat>=70; grey plan <40)
    return (np.abs(im - c).max(2) <= tol) & (SAT >= 55)

def boxes_from_mask(mask, gap=120, min_px=1500):
    """Split into vertically-separated clusters; percentile-trim each box."""
    rowcount = mask.sum(1)
    rows = np.where(rowcount > 0)[0]
    if len(rows) == 0:
        return []
    clusters, start, prev = [], rows[0], rows[0]
    for r in rows[1:]:
        if r - prev > gap:
            clusters.append((start, prev)); start = r
        prev = r
    clusters.append((start, prev))
    out = []
    for y0, y1 in clusters:
        sub = mask[y0:y1+1]
        if sub.sum() < min_px:
            continue
        ys, xs = np.where(sub)
        # 0.5–99.5 percentile to ignore stray pixels
        x0, x1 = np.percentile(xs, [0.5, 99.5])
        yy0, yy1 = np.percentile(ys, [0.5, 99.5])
        out.append((int(x0), y0 + int(yy0), int(x1), y0 + int(yy1)))
    return out

print('building  pixel-bbox -> canvas-cm rect (x,y,w,h)')
results = {}
for code, color in COLORS.items():
    boxes = boxes_from_mask(mask_for(color))
    boxes.sort(key=lambda b: b[1])  # top to bottom
    results[code] = boxes
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        cx0, cy0 = to_cm(x0, y0); cx1, cy1 = to_cm(x1, y1)
        tag = code if len(boxes) == 1 else f'{code}#{i+1}'
        print(f'  {tag:10s} px[{x0:5d},{y0:5d},{x1:5d},{y1:5d}]  -> x={cx0:5d} y={cy0:5d} w={cx1-cx0:5d} h={cy1-cy0:5d}')

# scan for any other strong colours we didn't capture (e.g. light-purple Loading)
mx = im.max(2); mn = im.min(2); sat = mx - mn
colored = (sat > 50) & (mx > 90)
matched = np.zeros((H, W), bool)
for color in COLORS.values():
    matched |= mask_for(color)
leftover = colored & ~matched
ys, xs = np.where(leftover)
if len(xs) > 500:
    q = (im[ys, xs] // 40 * 40)
    uniq, cnt = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    print('\nUnmatched colour clusters (possible Loading area):')
    for i in np.argsort(-cnt)[:6]:
        if cnt[i] > 800:
            r, g, b = uniq[i]
            print(f'  ({r},{g},{b}) n={cnt[i]}')
