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

## Ouverture business reference

Before changing business logic related to the morning Opening workflow, FOLS
`Équipement Chambre` keys, sofas, recouches, or the reception-to-housekeeping
handoff, read and follow `PRINCIPE_OUVERTURE.md`.

This requirement applies to business behavior and data interpretation. It does
not apply to purely visual or layout-only changes that leave the business logic
unchanged.

`PRINCIPE_OUVERTURE.md` describes the current business reference, not an
immutable specification. A newer explicit user instruction takes precedence;
when such an instruction changes the workflow, update the reference document
along with the implementation.
