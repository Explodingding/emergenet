"""
Stream the 1.38 GB DXF and render its geometry to a high-res PNG.
Memory-light: uses iterdxf (one entity at a time), collects raw coordinates,
plots with matplotlib LineCollection. No full document load.
"""
import time, math, sys
from ezdxf.addons import iterdxf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

t = time.time()
print('Streaming geometry...', flush=True)

doc = iterdxf.opendxf('Cinerglass Electrical Panel Locations1.dxf')
segments = []          # list of [(x0,y0),(x1,y1)] in DXF units
minx = miny = float('inf')
maxx = maxy = float('-inf')

def track(x, y):
    global minx, miny, maxx, maxy
    if x < minx: minx = x
    if y < miny: miny = y
    if x > maxx: maxx = x
    if y > maxy: maxy = y

n = 0
try:
    for e in doc.modelspace():
        et = e.dxftype()
        try:
            if et == 'LINE':
                s, en = e.dxf.start, e.dxf.end
                segments.append([(s.x, s.y), (en.x, en.y)])
                track(s.x, s.y); track(en.x, en.y)
            elif et == 'LWPOLYLINE':
                pts = [(p[0], p[1]) for p in e.get_points()]
                for i in range(len(pts) - 1):
                    segments.append([pts[i], pts[i+1]])
                if getattr(e, 'closed', False) and len(pts) > 2:
                    segments.append([pts[-1], pts[0]])
                for px, py in pts: track(px, py)
            elif et == 'POLYLINE':
                pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
                for i in range(len(pts) - 1):
                    segments.append([pts[i], pts[i+1]])
                for px, py in pts: track(px, py)
            elif et == 'ARC':
                c = e.dxf.center; r = e.dxf.radius
                a0 = math.radians(e.dxf.start_angle); a1 = math.radians(e.dxf.end_angle)
                if a1 < a0: a1 += 2*math.pi
                steps = max(4, int((a1 - a0) / 0.2))
                prev = None
                for i in range(steps + 1):
                    a = a0 + (a1 - a0) * i / steps
                    px, py = c.x + r*math.cos(a), c.y + r*math.sin(a)
                    if prev: segments.append([prev, (px, py)])
                    prev = (px, py); track(px, py)
            elif et == 'CIRCLE':
                c = e.dxf.center; r = e.dxf.radius
                prev = None
                for i in range(33):
                    a = 2*math.pi*i/32
                    px, py = c.x + r*math.cos(a), c.y + r*math.sin(a)
                    if prev: segments.append([prev, (px, py)])
                    prev = (px, py); track(px, py)
        except Exception:
            pass
        n += 1
        if n % 50000 == 0:
            print(f'  {n:,} entities, {len(segments):,} segs, {time.time()-t:.0f}s', flush=True)
finally:
    doc.close()

print(f'Collected {len(segments):,} segments from {n:,} entities in {time.time()-t:.0f}s', flush=True)
print(f'Extents X[{minx:.0f},{maxx:.0f}] Y[{miny:.0f},{maxy:.0f}]', flush=True)
w = maxx - minx; h = maxy - miny
print(f'Span: {w:.0f} x {h:.0f}  aspect={w/h:.2f}', flush=True)

# ── Plot ──────────────────────────────────────────────────────────────────────
px_w = 5000
px_h = max(400, int(px_w * h / w))
fig = plt.figure(figsize=(px_w/100, px_h/100), dpi=100)
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(minx, maxx); ax.set_ylim(miny, maxy)
ax.set_aspect('equal'); ax.axis('off')
lc = LineCollection(segments, colors='#1a1a1a', linewidths=0.3)
ax.add_collection(lc)
out = 'scripts/dwf-plan-full.png'
fig.savefig(out, dpi=100, facecolor='white')
print(f'Saved {out} ({px_w}x{px_h})', flush=True)
print(f'Total time {time.time()-t:.0f}s', flush=True)
