"""
Maps DXF section-view X coordinates → canvas coord_x for FRN-10 / UTL-01 objects.

DXF is a longitudinal section (elevation):
  - DXF X = position along building length → maps to canvas coord_x
  - DXF Y = floor height (used only to determine floor, not canvas Y)
  - Canvas Y is set to building centre (no perpendicular section available)

FRN-10 canvas: bounds_x=9300, bounds_w=8200  (cm)
DXF X range for FRN-10: 3,146,000 – 3,355,000 mm
UTL-01 canvas: bounds_x=9300, bounds_y=4375, bounds_w=8200, bounds_h=1300
DXF X range for UTL-01 panels: 3,157,000 – 3,267,000 mm
"""

import csv, statistics

# ── DXF → canvas linear mapping ──────────────────────────────────────────────
# FRN-10  (and UTL-01 shares same longitudinal axis)
DXF_X_MIN = 3_146_000   # mm – left edge (Lahti cullet start)
DXF_X_MAX = 3_355_000   # mm – right edge (cold end)
DXF_SPAN_MM = DXF_X_MAX - DXF_X_MIN          # 209 000 mm

CANVAS_X_MIN = 9_300    # cm (FRN-10 / UTL-01 share the same X origin)
CANVAS_X_MAX = 17_500   # cm
CANVAS_SPAN  = CANVAS_X_MAX - CANVAS_X_MIN   # 8 200 cm

def dxf_to_canvas_x(dxf_x):
    t = (dxf_x - DXF_X_MIN) / DXF_SPAN_MM
    return round(CANVAS_X_MIN + t * CANVAS_SPAN)

# Building centre Y (canvas) — used when we have no perpendicular info
FRN10_Y  = 5675 + 3150 // 2   # 7250 cm
UTL01_Y  = 4375 + 1300 // 2   # 5025 cm

# ── Label → DB code mapping ───────────────────────────────────────────────────
LABEL_TO_CODE = {
    # FRN-10 — drawing uses "F1-" prefix instead of "F10-"
    'F1-ADP':       'F10-ADP',
    'F1-AUP':       'F10-AUP',
    'F1-DPG.1':     'F10-DPG1',
    'F1-DPG.2':     'F10-DPG2',
    'F1-DPG.3':     'F10-DPG-3',
    'F1-DPG.4':     'F10-DPG-4',
    'F1-DPG.5':     'F10-DPG-5',
    'F1-DPG.6':     'F10-DPG-6',
    'F1-DPG.7':     'F10-DPG-7',
    'F1-FP':        'F10-FP',
    'F1-FU-MCC':    'F10-FU-MCC',
    'F1-GEN-DP':    'F10-GEN-DP',
    'F1-GEN-UP':    'F10-GEN-UP',
    'F1-MCC.1':     'F10-MCC-1',
    'F1-MCC.2':     'F10-MCC2',
    'F1-MCC.3':     'F10-MCC3',
    'F1-MCC.4':     'F10-MCC4',
    'F1-MDP-1':     'F10-MDP-1',
    'F1-MDP-2':     'F10-MDP-2',
    'F1-MDP-3':     'F10-MDP-3',
    'F1-MDP-7':     'F10-MDP-7',
    'F1-MDP-8':     'F10-MDP-8',
    'F1-MDP-9':     'F10-MDP-9',
    'F1-MZ-DP':     'F10-MZ-DP',
    'F1-UO-DP':     'F10-UO-DP',
    'F1-UP1.1':     'F10-UP1-1',
    'F1-DP1.3':     'F10-DP1-3',
    'F1-DP1.5':     'F10-DP1-5',
    'F1-DP1.6':     'F10-DP1-6',
    'FCP10.2':      'F10-FCP10.2',
    'HOT-10':       'F10-HOT10',
    'HOT10':        'F10-HOT10',
    'LAHTI-MCC.06': 'F10-LAHTI-MCC-06',
    'LAHTI-MCC.07': 'F10-LAHTI-MCC-07',
    'MS-DP':        'F10-MS-DP',
    'OUTLETS':      'F10-OTHER-OUTLETS',
    'PW-DP':        'F10-PW-DP',
    'PDC700.1(F1-HP-1)': 'F10-HP-1',
    'PDC700.2(F1-HP-2)': 'F10-HP-2',
    'PDC700.3(F1-HP-3)': 'F10-HP-3',
    'PDC700.4(F1-HP-4)': 'F10-HP-4',
    # New objects (inserted via insert-frn10-missing-objects.sql)
    'IDC-FUR10-2':                    'F10-IDC-2',
    'IDC-FUR10-6/3':                  'F10-IDC-6-3',
    'F10-PLC-2 (PLC40-2 41-42 FAN)': 'F10-PLC-2',
    'Lufttechnik':                    'F10-LUFTTECH',
    # UTL-01
    'UT-UP':    'UTL-UP',
    'UT-FMCC':  'UTL-FMCC',
    'UT-DP1.1': 'UTL-DP1-1',
    'UT-DP1.2': 'UTL-DP1-2',
}

BUILDING_Y = {
    'FRN-10': FRN10_Y,
    'UTL-01': UTL01_Y,
}

# ── Read CSV and aggregate X per label ───────────────────────────────────────
import os
csv_path = os.path.join(os.path.dirname(__file__), 'dxf-objects-export.csv')

xs_by_label = {}   # label -> list of dxf_x values
bldg_by_label = {}

with open(csv_path, newline='', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        label = row['Label'].strip()
        if not label or label not in LABEL_TO_CODE:
            continue
        dxf_x = int(row['DXF_X'])
        bldg   = row['Building'].strip()
        xs_by_label.setdefault(label, []).append(dxf_x)
        bldg_by_label[label] = bldg

# ── Generate SQL ──────────────────────────────────────────────────────────────
lines = [
    '-- ================================================================',
    '-- Set coord_x / coord_y for FRN-10 and UTL-01 objects from DXF',
    '-- coord_x mapped from DXF section-view X position',
    '-- coord_y set to building centre (plan view has no cross-section)',
    '-- ================================================================',
    '',
]

for label, code in sorted(LABEL_TO_CODE.items(), key=lambda kv: kv[1]):
    if label not in xs_by_label:
        continue
    avg_x = statistics.median(xs_by_label[label])
    cx = dxf_to_canvas_x(avg_x)
    bldg = bldg_by_label.get(label, 'FRN-10')
    cy = BUILDING_Y.get(bldg, FRN10_Y)
    lines.append(
        f"UPDATE objects SET coord_x = {cx}, coord_y = {cy} WHERE code = '{code}';"
    )

lines.append('')
sql = '\n'.join(lines)
out = os.path.join(os.path.dirname(__file__), 'update-dxf-coords.sql')
with open(out, 'w', encoding='utf-8') as f:
    f.write(sql)

print(f'Generated {sql.count("UPDATE")} UPDATE statements -> {out}')
