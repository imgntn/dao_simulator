import re
from pathlib import Path

OUTPUT_DIR = Path('.')

PRESS_RELEASES = {
    'rq1-participation-dynamics': {'title': 'Why DAO Voter Turnout Stays Low'},
    'rq2-governance-capture': {'title': 'Which Anti-Whale Mechanisms Work in DAOs'},
    'rq3-proposal-pipeline': {'title': 'How DAOs Can Process Proposals Faster'},
    'rq4-treasury-resilience': {'title': 'How DAOs Can Protect Their Treasuries'},
    'rq5-inter-dao-cooperation': {'title': 'How DAOs Can Successfully Cooperate'}
}

CSS = """:root { --primary: #1a1a2e; --accent: #4f46e5; --text: #1f2937; --bg-alt: #f8fafc; --border: #e5e7eb; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Georgia, serif; font-size: 18px; line-height: 1.8; color: var(--text); background: #fff; }
.header { position: relative; height: 50vh; min-height: 400px; overflow: hidden; }
.header-image { width: 100%; height: 100%; object-fit: cover; }
.header-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.85)); padding: 60px 40px 40px; }
.container { max-width: 780px; margin: 0 auto; padding: 0 24px; }
.press-badge { display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; background: rgba(79,70,229,0.2); padding: 8px 16px; border-radius: 4px; margin-bottom: 16px; }
.header h1 { font-size: 32px; font-weight: 700; color: white; line-height: 1.3; max-width: 700px; }
.key-findings { background: var(--bg-alt); padding: 50px 0; border-bottom: 1px solid var(--border); }
.key-findings h2 { font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin-bottom: 24px; }
.findings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.finding-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1px solid var(--border); display: flex; gap: 14px; }
.finding-number { font-size: 13px; font-weight: 700; color: var(--accent); background: rgba(79,70,229,0.1); width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.finding-card p { font-size: 14px; line-height: 1.5; margin: 0; }
.content { padding: 60px 0; }
.content h2 { font-size: 26px; font-weight: 700; color: var(--primary); margin: 40px 0 20px; }
.content h3 { font-size: 20px; font-weight: 600; color: var(--primary); margin: 35px 0 16px; }
.content p { margin-bottom: 20px; }
.content strong { color: var(--primary); }
.content ul { list-style: none; margin: 20px 0; padding: 0; }
.content li { position: relative; padding-left: 24px; margin-bottom: 12px; }
.content li::before { content: ""; position: absolute; left: 0; top: 10px; width: 6px; height: 6px; background: var(--accent); border-radius: 50%; }
.content hr { border: none; height: 1px; background: var(--border); margin: 40px 0; }
.footer { background: var(--primary); color: white; padding: 50px 0; }
.footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.footer h4 { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #818cf8; margin-bottom: 14px; }
.footer p, .footer a { font-size: 14px; color: rgba(255,255,255,0.8); line-height: 1.6; }
.footer a { text-decoration: none; }
.footer-note { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 13px; color: rgba(255,255,255,0.4); text-align: center; }
@media (max-width: 640px) { .findings-grid { grid-template-columns: 1fr; } .footer-grid { grid-template-columns: 1fr; } }"""

def process_md(md):
    lines = md.split('\n')
    findings = []
    content_lines = []
    in_findings = False

    for line in lines:
        if 'Key Findings' in line:
            in_findings = True
            continue
        if in_findings and line.startswith('- '):
            findings.append(line[2:].replace('**',''))
            continue
        if in_findings and '---' in line:
            in_findings = False
            continue
        if '# PRESS RELEASE' in line: continue
        if 'FOR IMMEDIATE RELEASE' in line: continue
        if 'Key Findings:' in line: continue
        if 'Contact:' in line: break
        if '@' in line and 'jamesbpollack' in line: continue
        if 'github.com' in line: continue
        content_lines.append(line)

    content = '\n'.join(content_lines)
    content = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content)
    content = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content, flags=re.MULTILINE)
    content = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content, flags=re.MULTILINE)
    content = re.sub(r'^- (.+)$', r'<li>\1</li>', content, flags=re.MULTILINE)
    content = re.sub(r'^(\d+)\. (.+)$', r'<li><strong>\1.</strong> \2</li>', content, flags=re.MULTILINE)
    content = content.replace('---', '<hr>')

    paragraphs = content.split('\n\n')
    processed = []
    for p in paragraphs:
        p = p.strip()
        if not p: continue
        if p.startswith('<h') or p.startswith('<li') or p.startswith('<hr'):
            processed.append(p)
        else:
            processed.append('<p>' + p + '</p>')
    content = '\n'.join(processed)
    content = content.replace('<p></p>', '')

    return findings, content

for name, data in PRESS_RELEASES.items():
    with open(f'{name}.md', 'r', encoding='utf-8') as f:
        md = f.read()
    findings, content = process_md(md)
    findings_html = ''.join([f'<div class="finding-card"><div class="finding-number">{i+1}</div><p>{f}</p></div>' for i, f in enumerate(findings[:4])])
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{data['title']} | DAO Research</title>
<style>{CSS}</style>
</head>
<body>
<header class="header">
<img src="{name}.png" class="header-image" alt="{data['title']}">
<div class="header-overlay"><div class="container">
<span class="press-badge">Research Press Release</span>
<h1>{data['title']}</h1>
</div></div></header>
<section class="key-findings"><div class="container">
<h2>Key Findings</h2>
<div class="findings-grid">{findings_html}</div>
</div></section>
<main class="content"><div class="container">
{content}
</div></main>
<footer class="footer"><div class="container">
<div class="footer-grid">
<div><h4>Contact</h4><p>James Pollack<br>Independent Researcher<br><a href="mailto:james@jamesbpollack.com">james@jamesbpollack.com</a></p></div>
<div><h4>Source Code</h4><p><a href="https://github.com/imgntn/dao_simulator">GitHub Repository</a></p></div>
<div><h4>Research</h4><p>DAO Governance Simulation</p></div>
</div>
<p class="footer-note">Research conducted independently to advance decentralized governance.</p>
</div></footer></body></html>'''
    with open(f'{name}.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Generated: {name}.html')
print('Done!')
