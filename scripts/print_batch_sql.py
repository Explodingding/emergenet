import re, collections
from pathlib import Path
text = Path("supabase/migrations/0012_batch_house_staging.sql").read_text(encoding="utf-8")
pat = re.compile(r"'([a-z_]+)','BTH-03'")
counts = collections.Counter(m.group(1) for m in pat.finditer(text))
for k, v in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"{v:4d}  {k}")
