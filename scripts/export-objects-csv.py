"""
Export all objects from Supabase with code, name, coord_x, coord_y,
building name, floor name, and active status.
"""
import urllib.request, urllib.parse, json, csv, os

SUPABASE_URL = 'https://opicdwopttlahwambyvx.supabase.co'
SUPABASE_KEY = 'sb_publishable_dESxDjADYgiawrNW7ButgQ_APFHhY_V'

def fetch(path, params=None):
    url = SUPABASE_URL + '/rest/v1/' + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# Fetch all objects with joined building and floor names (paginated)
objects = []
page_size = 1000
offset = 0
while True:
    batch = fetch('objects', {
        'select': 'code,name,coord_x,coord_y,is_active,'
                  'buildings(name),'
                  'floors!objects_primary_floor_id_fkey(name)',
        'order': 'code.asc',
        'limit': page_size,
        'offset': offset,
    })
    objects.extend(batch)
    if len(batch) < page_size:
        break
    offset += page_size

out = os.path.join(os.path.dirname(__file__), 'objects-export.csv')
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['Code', 'Name', 'Building', 'Floor', 'coord_x', 'coord_y', 'Active'])
    for o in objects:
        bldg  = (o.get('buildings') or {}).get('name', '')
        floor = (o.get('floors')    or {}).get('name', '')
        w.writerow([
            o.get('code', ''),
            o.get('name', ''),
            bldg,
            floor,
            o.get('coord_x', 0),
            o.get('coord_y', 0),
            o.get('is_active', True),
        ])

print(f'Exported {len(objects)} objects -> {out}')
