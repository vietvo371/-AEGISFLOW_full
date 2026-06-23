#!/usr/bin/env python3
"""Minimal, dependency-free Markdown -> styled HTML for the AI-Use & Ethics Report.
Handles: headings, hr, tables, unordered lists, blockquotes, bold/italic/code, paragraphs."""
import html, re, sys

SRC = "/Users/vannhan/-AEGISFLOW_full/docs/AI_USE_ETHICS_REPORT.md"
OUT_HTML = "/Users/vannhan/-AEGISFLOW_full/docs/AI_USE_ETHICS_REPORT.html"

def inline(t):
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[(.+?)\]\((.+?)\)", r"\1", t)  # strip md links, keep text
    return t

lines = open(SRC, encoding="utf-8").read().splitlines()
out, i = [], 0
n = len(lines)
while i < n:
    ln = lines[i]
    s = ln.strip()
    if not s:
        i += 1; continue
    # horizontal rule
    if re.fullmatch(r"-{3,}", s):
        out.append("<hr/>"); i += 1; continue
    # headings
    m = re.match(r"(#{1,4})\s+(.*)", s)
    if m:
        lvl = len(m.group(1))
        out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
    # blockquote
    if s.startswith(">"):
        buf = []
        while i < n and lines[i].strip().startswith(">"):
            buf.append(lines[i].strip()[1:].strip()); i += 1
        out.append("<blockquote>" + inline(" ".join(buf)) + "</blockquote>"); continue
    # table
    if s.startswith("|") and i + 1 < n and re.match(r"^\|[\s:\-\|]+\|?$", lines[i+1].strip()):
        header = [c.strip() for c in s.strip("|").split("|")]
        i += 2
        rows = []
        while i < n and lines[i].strip().startswith("|"):
            rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
        thead = "".join(f"<th>{inline(c)}</th>" for c in header)
        body = ""
        for r in rows:
            body += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
        out.append(f"<table><thead><tr>{thead}</tr></thead><tbody>{body}</tbody></table>"); continue
    # unordered list
    if re.match(r"[-*]\s+", s):
        out.append("<ul>")
        while i < n and re.match(r"[-*]\s+", lines[i].strip()):
            item = re.sub(r"^[-*]\s+", "", lines[i].strip())
            out.append(f"<li>{inline(item)}</li>"); i += 1
        out.append("</ul>"); continue
    # paragraph (gather until blank)
    buf = [s]; i += 1
    while i < n and lines[i].strip() and not re.match(r"(#{1,4}\s|[-*]\s|\||>|-{3,})", lines[i].strip()):
        buf.append(lines[i].strip()); i += 1
    out.append("<p>" + inline(" ".join(buf)) + "</p>")

body_html = "\n".join(out)
CSS = """
@page { size: A4; margin: 18mm 16mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #1a202c;
       font-size: 10.6pt; line-height: 1.5; max-width: 100%; }
h1 { font-size: 19pt; color: #1E3A5F; border-bottom: 3px solid #00B4D8; padding-bottom: 6px; margin: 0 0 4px; }
h2 { font-size: 12.5pt; color: #fff; background: #1E3A5F; padding: 5px 10px; border-radius: 4px;
     margin: 18px 0 8px; page-break-after: avoid; }
h3 { font-size: 11pt; color: #1E3A5F; margin: 12px 0 4px; }
p { margin: 5px 0; text-align: justify; }
strong { color: #12263a; }
ul { margin: 5px 0 5px 0; padding-left: 20px; }
li { margin: 2px 0; }
hr { border: none; border-top: 1px solid #cbd5e0; margin: 14px 0; }
table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9.6pt; page-break-inside: avoid; }
th { background: #00B4D8; color: #fff; text-align: left; padding: 5px 8px; }
td { border: 1px solid #cbd5e0; padding: 4px 8px; vertical-align: top; }
tr:nth-child(even) td { background: #f1f5f9; }
blockquote { border-left: 4px solid #F4A261; background: #fff8f0; margin: 10px 0;
             padding: 6px 12px; color: #7a4a16; font-size: 9.8pt; }
code { background: #edf2f7; padding: 1px 4px; border-radius: 3px; font-family: 'SF Mono', Menlo, monospace; font-size: 9pt; }
em { color: #334155; }
"""
doc = f"""<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<title>AI-Use & Ethics Report — AegisFlow AI</title><style>{CSS}</style></head>
<body>{body_html}</body></html>"""
open(OUT_HTML, "w", encoding="utf-8").write(doc)
print("HTML written:", OUT_HTML)
