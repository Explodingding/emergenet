"""
One streaming pass over the 1.38 GB DXF -> save all geometry as a compact
numpy array of line segments (x0,y0,x1,y1) plus text labels.
After this, any crop can be rendered in seconds without re-streaming.
"""
import time, math, json
import numpy as np
from ezdxf.addons import iterdxf

t = time.time()
doc = iterdxf.opendxf('Cinerglass Electrical Panel Locations1.dxf')
segs = []   # (x0,y0,x1,y1, layer_is_arch)
texts = []  # (x,y,height,text)

ARCH_LAYERS = {'0'}  # architectural geometry layer

def add(x0, y0, x1, y1):
    segs.append((x0, y0, x1, y1))

n = 0
try:
    for e in doc.modelspace():
        et = e.dxftype()
        try:
            if et == 'LINE':
                s, en = e.dxf.start, e.dxf.end
                add(s.x, s.y, en.x, en.y)
            elif et == 'LWPOLYLINE':
                pts = [(p[0], p[1]) for p in e.get_points()]
                for i in range(len(pts)-1):
                    add(*pts[i], *pts[i+1])
                if getattr(e, 'closed', False) and len(pts) > 2:
                    add(*pts[-1], *pts[0])
            elif et == 'POLYLINE':
                pts = [(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]
                for i in range(len(pts)-1):
                    add(*pts[i], *pts[i+1])
            elif et == 'ARC':
                c = e.dxf.center; r = e.dxf.radius
                a0 = math.radians(e.dxf.start_angle); a1 = math.radians(e.dxf.end_angle)
                if a1 < a0: a1 += 2*math.pi
                steps = max(4, int((a1-a0)/0.25))
                pa = None
                for i in range(steps+1):
                    a = a0 + (a1-a0)*i/steps
                    p = (c.x+r*math.cos(a), c.y+r*math.sin(a))
                    if pa: add(*pa, *p)
                    pa = p
            elif et == 'CIRCLE':
                c = e.dxf.center; r = e.dxf.radius
                pa = None
                for i in range(33):
                    a = 2*math.pi*i/32
                    p = (c.x+r*math.cos(a), c.y+r*math.sin(a))
                    if pa: add(*pa, *p)
                    pa = p
            elif et in ('TEXT', 'MTEXT'):
                raw = e.dxf.text if et == 'TEXT' else e.text
                ins = e.dxf.insert
                texts.append((ins.x, ins.y, float(getattr(e.dxf, 'height', 0) or 0), raw))
        except Exception:
            pass
        n += 1
finally:
    doc.close()

arr = np.array(segs, dtype=np.float32)
np.save('scripts/dxf-segments.npy', arr)
with open('scripts/dxf-texts.json', 'w', encoding='utf-8') as f:
    json.dump(texts, f)
print(f'Saved {len(segs):,} segments, {len(texts):,} texts from {n:,} entities in {time.time()-t:.0f}s')
print(f'segments.npy = {arr.nbytes/1e6:.1f} MB')
