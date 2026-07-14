# ORIS workspace rules

## Encoding safety rule

Never rewrite text files with PowerShell pipelines such as:

```powershell
Get-Content file | Set-Content file
```

Do not use `Set-Content` or `Out-File` to rewrite HTML, JS, CSS, JSON or Markdown files in this project.

Reason: this project contains UTF-8 French text, SVG symbols and emoji. PowerShell can reinterpret UTF-8 files with the wrong encoding and corrupt characters such as `é`, `▶`, `⌄`, `🛋️`.

Allowed editing methods:

- `apply_patch` for normal code edits.
- Python with explicit `encoding="utf-8"` for mechanical replacements.

When using Python, always read and write like this:

```python
from pathlib import Path

path = Path("index.html")
text = path.read_text(encoding="utf-8")
path.write_text(text, encoding="utf-8", newline="")
```

After editing `index.html`, `script.js`, `styles.css`, or any module, run an encoding scan before reporting success:

```python
from pathlib import Path

bad = [
    "\u00c3\u0083",
    "\u00c3\u00a9",
    "\u00c3\u00a8",
    "\u00c3\u00b4",
    "\u00c3\u00a0",
    "\u00c3\u00a2",
    "\u00e2\u20ac",
    "\u00f0\u0178",
    "\ufffd",
    "???",
]

for name in ["index.html", "script.js", "styles.css"]:
    path = Path(name)
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    hits = [(repr(marker), text.count(marker)) for marker in bad if marker in text]
    print(name, hits or "ok")
```

If the edit touches JavaScript, also run:

```powershell
node --check script.js
```

