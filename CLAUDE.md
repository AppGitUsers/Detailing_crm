# Detailing CRM — Claude Code Guidelines

## CRITICAL: File Encoding Safety Rule

**Never use PowerShell `Get-Content` or `Set-Content` to read or write source files.**

All `.jsx`, `.js`, `.ts`, `.tsx`, `.py`, `.json`, and `.md` source files are UTF-8 encoded and contain multi-byte characters (₹, ·, —, ✓, ⚠, etc.). PowerShell's default code page on Windows is Windows-1252, which silently corrupts every multi-byte UTF-8 sequence.

**Symptoms of corruption:** `₹` becomes `â‚¹`, `·` becomes `Â·`, `—` becomes `â€"`, `✓` becomes `âœ"`.

**If you must use PowerShell to edit files, use only:**
```powershell
$utf8 = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, $utf8)
# ... modify $content ...
[System.IO.File]::WriteAllText($path, $content, $utf8)
```

**Prefer the built-in Edit/Write/Read tools** — they handle encoding correctly by default.

**If corruption is detected**, run the reverse-encoding fix:
```powershell
$win1252 = [System.Text.Encoding]::GetEncoding(1252)
$utf8    = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, $utf8)
# Protect any already-correct non-W1252 chars (like ₹ U+20B9) with placeholders first
$bytes   = $win1252.GetBytes($content)
$fixed   = $utf8.GetString($bytes)
[System.IO.File]::WriteAllText($path, $fixed, $utf8)
```
