"""
Parse the embedded CSV from docs/cabinet-locations.html,
count unique labeled objects, and cross-reference with objects-export.csv.
"""
import re, csv, os
from collections import defaultdict

# ── Extract CSV from HTML ─────────────────────────────────────────────────────
html_path = os.path.join(os.path.dirname(__file__), '..', 'docs', 'cabinet-locations.html')
with open(html_path, encoding='utf-8') as f:
    html = f.read()

m = re.search(r'const CSV = `(.*?)`', html, re.DOTALL)
csv_text = m.group(1).strip()

rows = []
for line in csv_text.split('\n')[1:]:  # skip header
    parts = line.split(',')
    if len(parts) < 6:
        continue
    label = parts[0].strip()
    floor  = parts[1].strip()
    bldg   = parts[2].strip()
    dxf_x  = parts[3].strip()
    dxf_y  = parts[4].strip()
    block  = ','.join(parts[6:]).strip()
    rows.append({'label': label, 'floor': floor, 'bldg': bldg,
                 'dxf_x': dxf_x, 'dxf_y': dxf_y, 'block': block})

# ── Summary stats ─────────────────────────────────────────────────────────────
total = len(rows)
labeled   = [r for r in rows if r['label']]
unlabeled = [r for r in rows if not r['label']]

# Unique labels per building+floor
by_bldg_floor = defaultdict(set)
for r in labeled:
    by_bldg_floor[(r['bldg'], r['floor'])].add(r['label'])

# Unique labels overall
unique_labels = {r['label'] for r in labeled}

print(f'Total INSERT rows in HTML: {total}')
print(f'  With label:    {len(labeled)}')
print(f'  Without label: {len(unlabeled)}')
print(f'  Unique labels: {len(unique_labels)}')
print()
print('Unique labels per building / floor:')
for (bldg, floor), labels in sorted(by_bldg_floor.items()):
    print(f'  {bldg:10s}  {floor:14s}  {len(labels):2d} labels')
print()

# ── Cross-reference with DB export ────────────────────────────────────────────
db_path = os.path.join(os.path.dirname(__file__), 'objects-export.csv')
db_codes = set()
if os.path.exists(db_path):
    with open(db_path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            db_codes.add(row['Code'].strip())

# Map DXF labels to DB codes (same mapping as dxf-coords-to-sql.py)
LABEL_TO_CODE = {
    'F1-ADP':'F10-ADP', 'F1-AUP':'F10-AUP',
    'F1-DPG.1':'F10-DPG1', 'F1-DPG.2':'F10-DPG2',
    'F1-DPG.3':'F10-DPG-3', 'F1-DPG.4':'F10-DPG-4',
    'F1-DPG.5':'F10-DPG-5', 'F1-DPG.6':'F10-DPG-6', 'F1-DPG.7':'F10-DPG-7',
    'F1-FP':'F10-FP', 'F1-FU-MCC':'F10-FU-MCC',
    'F1-GEN-DP':'F10-GEN-DP', 'F1-GEN-UP':'F10-GEN-UP',
    'F1-MCC.1':'F10-MCC-1', 'F1-MCC.2':'F10-MCC2',
    'F1-MCC.3':'F10-MCC3', 'F1-MCC.4':'F10-MCC4',
    'F1-MDP-1':'F10-MDP-1', 'F1-MDP-2':'F10-MDP-2', 'F1-MDP-3':'F10-MDP-3',
    'F1-MDP-7':'F10-MDP-7', 'F1-MDP-8':'F10-MDP-8', 'F1-MDP-9':'F10-MDP-9',
    'F1-MZ-DP':'F10-MZ-DP', 'F1-UO-DP':'F10-UO-DP',
    'F1-UP1.1':'F10-UP1-1', 'F1-DP1.3':'F10-DP1-3',
    'F1-DP1.5':'F10-DP1-5', 'F1-DP1.6':'F10-DP1-6',
    'FCP10.2':'F10-FCP10.2', 'HOT-10':'F10-HOT10', 'HOT10':'F10-HOT10',
    'LAHTI-MCC.06':'F10-LAHTI-MCC-06', 'LAHTI-MCC.07':'F10-LAHTI-MCC-07',
    'MS-DP':'F10-MS-DP', 'OUTLETS':'F10-OTHER-OUTLETS', 'PW-DP':'F10-PW-DP',
    'PDC700.1(F1-HP-1)':'F10-HP-1', 'PDC700.2(F1-HP-2)':'F10-HP-2',
    'PDC700.3(F1-HP-3)':'F10-HP-3', 'PDC700.4(F1-HP-4)':'F10-HP-4',
    'IDC-FUR10-2':'F10-IDC-2', 'IDC-FUR10-6/3':'F10-IDC-6-3',
    'F10-PLC-2 (PLC40-2 41-42 FAN)':'F10-PLC-2',
    'Lufttechnik':'F10-LUFTTECH',
    'UT-UP':'UTL-UP', 'UT-FMCC':'UTL-FMCC',
    'UT-DP1.1':'UTL-DP1-1', 'UT-DP1.2':'UTL-DP1-2',
}

mapped = set()
not_in_db = []
not_in_mapping = []

for label in sorted(unique_labels):
    if label in LABEL_TO_CODE:
        code = LABEL_TO_CODE[label]
        mapped.add(label)
        if code not in db_codes:
            not_in_db.append((label, code))
    else:
        not_in_mapping.append(label)

print(f'Labels mapped to DB codes: {len(mapped)}')
print(f'  Mapped codes missing in DB: {len(not_in_db)}')
for lbl, code in not_in_db:
    print(f'    {lbl:35s} -> {code}')
print()
print(f'Labels WITHOUT DB mapping yet: {len(not_in_mapping)}')
for lbl in sorted(not_in_mapping):
    # find building and floor
    bldg_floor = [(r["bldg"], r["floor"]) for r in rows if r["label"] == lbl]
    bldg = bldg_floor[0][0] if bldg_floor else '?'
    floor = bldg_floor[0][1] if bldg_floor else '?'
    print(f'    [{bldg:10s} | {floor:14s}]  {lbl}')
