"""
Fast crop renderer using the cached segments. Usage:
  python crop-render.py OUT.png XMIN YMIN XMAX YMAX [PX_W]
"""
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

out = sys.argv[1]
xmin, ymin, xmax, ymax = map(float, sys.argv[2:6])
px_w = int(sys.argv[6]) if len(sys.argv) > 6 else 4000
lw = float(sys.argv[7]) if len(sys.argv) > 7 else 0.35
color = sys.argv[8] if len(sys.argv) > 8 else '#1a1a1a'

seg = np.load('scripts/dxf-segments.npy')
# Keep segments whose either endpoint is inside the crop box
inside = (
    ((seg[:,0] >= xmin) & (seg[:,0] <= xmax) & (seg[:,1] >= ymin) & (seg[:,1] <= ymax)) |
    ((seg[:,2] >= xmin) & (seg[:,2] <= xmax) & (seg[:,3] >= ymin) & (seg[:,3] <= ymax))
)
s = seg[inside]
print(f'{len(s):,} segments in crop')
lines = s.reshape(-1, 2, 2)

w = xmax - xmin; h = ymax - ymin
px_h = max(300, int(px_w * h / w))
fig = plt.figure(figsize=(px_w/100, px_h/100), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(xmin, xmax); ax.set_ylim(ymin, ymax)
ax.set_aspect('equal'); ax.axis('off')
ax.add_collection(LineCollection(lines, colors=color, linewidths=lw))
fig.savefig(out, dpi=100, facecolor='white')
print(f'Saved {out} ({px_w}x{px_h})')
