#!/usr/bin/env python3
import json, urllib.request, urllib.parse, time, os, uuid, re
from pathlib import Path

COMFYUI_URL = 'http://localhost:8188'
OUTPUT_DIR = Path(__file__).parent
STEPS = 100

PRESS_RELEASES = {
    'rq1-participation-dynamics': {
        'title': 'Why DAO Voter Turnout Stays Low',
        'prompt': 'A futuristic digital governance hall with scattered holographic voting terminals, some lit and active while most remain dark and unused, symbolizing low voter participation. Ethereal blue and purple lighting, abstract blockchain patterns on walls, photorealistic digital art, 8k resolution',
        'negative': 'text, watermark, signature, blurry, low quality'
    },
    'rq2-governance-capture': {
        'title': 'Which Anti-Whale Mechanisms Work',
        'prompt': 'A balance scale made of glowing blockchain nodes, with a giant whale figure on one side being counterbalanced by many small fish, representing governance power balance. Cyberpunk aesthetic, neon accents, digital ocean backdrop, abstract technological art, 8k resolution',
        'negative': 'text, watermark, signature, blurry, low quality'
    },
    'rq3-proposal-pipeline': {
        'title': 'How DAOs Can Process Proposals Faster',
        'prompt': 'A sleek futuristic assembly line of glowing proposal documents flowing through checkpoints and filters. Clean technological aesthetic, blue and white color scheme, abstract digital art, 8k resolution',
        'negative': 'text, watermark, signature, blurry, low quality'
    },
    'rq4-treasury-resilience': {
        'title': 'How DAOs Can Protect Treasuries',
        'prompt': 'A fortified digital vault with glowing cryptocurrency symbols inside, protected by layered energy shields, with a turbulent market storm raging outside. Dramatic lighting, cyberpunk fortress aesthetic, 8k resolution',
        'negative': 'text, watermark, signature, blurry, low quality'
    },
    'rq5-inter-dao-cooperation': {
        'title': 'How DAOs Can Cooperate',
        'prompt': 'Multiple interconnected floating islands representing different DAOs, with glowing bridges of cooperation connecting some while others remain isolated. A central hub island coordinates connections. Ethereal sky, abstract digital landscape, 8k resolution',
        'negative': 'text, watermark, signature, blurry, low quality'
    }
}

def get_workflow(prompt, negative, seed=None):
    if seed is None:
        seed = int(time.time() * 1000) % (2**32)
    return {
        '3': {'inputs': {'seed': seed, 'steps': STEPS, 'cfg': 7.5, 'sampler_name': 'dpmpp_2m_sde', 'scheduler': 'karras', 'denoise': 1.0, 'model': ['4', 0], 'positive': ['6', 0], 'negative': ['7', 0], 'latent_image': ['5', 0]}, 'class_type': 'KSampler'},
        '4': {'inputs': {'ckpt_name': 'juggernautXL_ragnarokBy.safetensors'}, 'class_type': 'CheckpointLoaderSimple'},
        '5': {'inputs': {'width': 1216, 'height': 832, 'batch_size': 1}, 'class_type': 'EmptyLatentImage'},
        '6': {'inputs': {'text': prompt, 'clip': ['4', 1]}, 'class_type': 'CLIPTextEncode'},
        '7': {'inputs': {'text': negative, 'clip': ['4', 1]}, 'class_type': 'CLIPTextEncode'},
        '8': {'inputs': {'samples': ['3', 0], 'vae': ['4', 2]}, 'class_type': 'VAEDecode'},
        '9': {'inputs': {'filename_prefix': 'press_release', 'images': ['8', 0]}, 'class_type': 'SaveImage'}
    }

def queue_prompt(workflow):
    p = {'prompt': workflow, 'client_id': str(uuid.uuid4())}
    req = urllib.request.Request(f'{COMFYUI_URL}/prompt', json.dumps(p).encode('utf-8'))
    req.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(req).read())['prompt_id']

def get_history(prompt_id):
    with urllib.request.urlopen(f'{COMFYUI_URL}/history/{prompt_id}') as r:
        return json.loads(r.read())

def get_image(filename, subfolder, folder_type):
    params = urllib.parse.urlencode({'filename': filename, 'subfolder': subfolder, 'type': folder_type})
    with urllib.request.urlopen(f'{COMFYUI_URL}/view?{params}') as r:
        return r.read()

def wait_for_completion(prompt_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        history = get_history(prompt_id)
        if prompt_id in history:
            return history[prompt_id]
        time.sleep(2)
    raise TimeoutError(f'Prompt {prompt_id} did not complete')

def generate_image(name, data):
    print(f'Generating: {name} ({STEPS} steps)')
    workflow = get_workflow(data['prompt'], data['negative'])
    workflow_path = OUTPUT_DIR / f'{name}_workflow.json'
    with open(workflow_path, 'w') as f:
        json.dump(workflow, f, indent=2)
    print(f'Saved workflow: {workflow_path}')
    prompt_id = queue_prompt(workflow)
    print(f'Queued: {prompt_id}')
    result = wait_for_completion(prompt_id)
    for node_id, node_output in result.get('outputs', {}).items():
        if 'images' in node_output:
            for img_info in node_output['images']:
                img_data = get_image(img_info['filename'], img_info.get('subfolder', ''), 'output')
                img_path = OUTPUT_DIR / f'{name}.png'
                with open(img_path, 'wb') as f:
                    f.write(img_data)
                print(f'Saved: {img_path}')
                return str(img_path)
    raise RuntimeError('No image output found')

def read_md(name):
    with open(OUTPUT_DIR / f'{name}.md', 'r', encoding='utf-8') as f:
        return f.read()

def gen_html(name, data, img_path):
    """Generate a professionally styled HTML press release."""
    md_content = read_md(name)
    img_file = os.path.basename(img_path)

    # Parse markdown content into sections
    lines = md_content.split('\n')

    # Extract key findings (bullet points after "Key Findings:")
    key_findings = []
    in_findings = False
    subtitle = ""
    main_content = []
    contact_section = []
    in_contact = False

    for line in lines:
        if 'Key Findings:' in line or 'Key Finding' in line:
            in_findings = True
            continue
        if in_findings and line.startswith('- '):
            key_findings.append(line[2:].replace('**', '').replace('*', ''))
        elif in_findings and line.startswith('---'):
            in_findings = False
        elif line.startswith('**') and 'study' in line.lower() or 'research' in line.lower() and len(line) < 200:
            subtitle = line.replace('**', '')
        elif 'Contact:' in line or 'Paper:' in line or 'Code:' in line or '@' in line or 'github.com' in line:
            in_contact = True
            contact_section.append(line)
        elif in_contact:
            contact_section.append(line)
        elif not line.startswith('# PRESS') and not line.startswith('FOR IMMEDIATE'):
            main_content.append(line)

    # Process main content
    content_html = '\n'.join(main_content)
    content_html = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content_html)
    content_html = content_html.replace('### ', '</p><h3>').replace('\n\n', '</p><p>')
    content_html = content_html.replace('---', '</section><section class="content-section">')

    # Build key findings HTML
    findings_html = ''
    for i, finding in enumerate(key_findings[:4]):
        findings_html += f'<div class="finding-card"><div class="finding-number">{i+1}</div><p>{finding}</p></div>'

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{data['title']} | DAO Governance Research</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #1a1a2e;
            --accent: #4f46e5;
            --accent-light: #818cf8;
            --text: #1f2937;
            --text-light: #6b7280;
            --bg: #ffffff;
            --bg-alt: #f8fafc;
            --border: #e5e7eb;
        }}

        * {{ margin: 0; padding: 0; box-sizing: border-box; }}

        body {{
            font-family: 'Crimson Pro', Georgia, serif;
            font-size: 19px;
            line-height: 1.75;
            color: var(--text);
            background: var(--bg);
        }}

        .header {{
            position: relative;
            height: 60vh;
            min-height: 500px;
            overflow: hidden;
        }}

        .header-image {{
            width: 100%;
            height: 100%;
            object-fit: cover;
        }}

        .header-overlay {{
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
            padding: 60px 40px 40px;
        }}

        .press-badge {{
            display: inline-block;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: var(--accent-light);
            background: rgba(79, 70, 229, 0.2);
            padding: 6px 14px;
            border-radius: 4px;
            margin-bottom: 16px;
        }}

        .header h1 {{
            font-family: 'Inter', sans-serif;
            font-size: clamp(28px, 4vw, 42px);
            font-weight: 700;
            color: white;
            line-height: 1.2;
            max-width: 800px;
            margin-bottom: 12px;
        }}

        .header .subtitle {{
            font-size: 18px;
            color: rgba(255,255,255,0.85);
            max-width: 700px;
        }}

        .container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 0 24px;
        }}

        .key-findings {{
            background: var(--bg-alt);
            padding: 48px 0;
            margin-top: -30px;
            position: relative;
            z-index: 10;
        }}

        .key-findings h2 {{
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 24px;
        }}

        .findings-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }}

        .finding-card {{
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            border: 1px solid var(--border);
            display: flex;
            gap: 16px;
        }}

        .finding-number {{
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 700;
            color: var(--accent);
            background: rgba(79, 70, 229, 0.1);
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }}

        .finding-card p {{
            font-size: 16px;
            line-height: 1.5;
            color: var(--text);
        }}

        .content {{
            padding: 60px 0;
        }}

        .content h3 {{
            font-family: 'Inter', sans-serif;
            font-size: 24px;
            font-weight: 600;
            color: var(--primary);
            margin: 48px 0 20px;
        }}

        .content h3:first-of-type {{
            margin-top: 0;
        }}

        .content p {{
            margin-bottom: 24px;
            color: var(--text);
        }}

        .content strong {{
            color: var(--primary);
            font-weight: 600;
        }}

        .content ul, .content ol {{
            margin: 24px 0;
            padding-left: 24px;
        }}

        .content li {{
            margin-bottom: 12px;
        }}

        .highlight-box {{
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-left: 4px solid var(--accent);
            padding: 24px 28px;
            margin: 32px 0;
            border-radius: 0 12px 12px 0;
        }}

        .highlight-box p {{
            margin: 0;
            font-style: italic;
        }}

        .footer {{
            background: var(--primary);
            color: white;
            padding: 60px 0;
        }}

        .footer-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 40px;
        }}

        .footer h4 {{
            font-family: 'Inter', sans-serif;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: var(--accent-light);
            margin-bottom: 16px;
        }}

        .footer p, .footer a {{
            font-size: 16px;
            color: rgba(255,255,255,0.85);
            line-height: 1.6;
        }}

        .footer a {{
            text-decoration: none;
            transition: color 0.2s;
        }}

        .footer a:hover {{
            color: var(--accent-light);
        }}

        .footer-note {{
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px solid rgba(255,255,255,0.1);
            font-size: 14px;
            color: rgba(255,255,255,0.5);
            text-align: center;
        }}

        @media (max-width: 640px) {{
            .header {{ height: 50vh; min-height: 400px; }}
            .header-overlay {{ padding: 40px 20px 30px; }}
            .key-findings {{ padding: 32px 0; }}
            .content {{ padding: 40px 0; }}
            .footer {{ padding: 40px 0; }}
        }}
    </style>
</head>
<body>
    <header class="header">
        <img src="{img_file}" alt="{data['title']}" class="header-image">
        <div class="header-overlay">
            <div class="container">
                <span class="press-badge">Research Press Release</span>
                <h1>{data['title']}</h1>
                <p class="subtitle">{subtitle}</p>
            </div>
        </div>
    </header>

    <section class="key-findings">
        <div class="container">
            <h2>Key Findings</h2>
            <div class="findings-grid">
                {findings_html}
            </div>
        </div>
    </section>

    <main class="content">
        <div class="container">
            {content_html}
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-grid">
                <div>
                    <h4>Contact</h4>
                    <p>James Pollack<br>Independent Researcher<br>
                    <a href="mailto:james@jamesbpollack.com">james@jamesbpollack.com</a></p>
                </div>
                <div>
                    <h4>Resources</h4>
                    <p><a href="https://github.com/imgntn/dao_simulator">View Code on GitHub</a></p>
                </div>
                <div>
                    <h4>Paper</h4>
                    <p>DAO Governance Simulation Research</p>
                </div>
            </div>
            <p class="footer-note">This research was conducted independently and is released to advance the field of decentralized governance.</p>
        </div>
    </footer>
</body>
</html>'''

    with open(OUTPUT_DIR / f'{name}.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'HTML: {name}.html')

def gen_pdf(name, data, img_path):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, HRFlowable
        from reportlab.lib.colors import HexColor
    except ImportError:
        import subprocess
        subprocess.check_call(['pip', 'install', 'reportlab'])
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, HRFlowable
        from reportlab.lib.colors import HexColor
    
    pdf_path = OUTPUT_DIR / f'{name}.pdf'
    doc = SimpleDocTemplate(str(pdf_path), pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='PRTitle', fontSize=14, spaceAfter=12, textColor=HexColor('#666666')))
    styles.add(ParagraphStyle(name='PRHeadline', fontSize=18, spaceAfter=20, leading=22, textColor=HexColor('#222222')))
    styles.add(ParagraphStyle(name='PRSubHead', fontSize=13, spaceBefore=16, spaceAfter=8, textColor=HexColor('#444444')))
    styles.add(ParagraphStyle(name='PRBody', fontSize=10, spaceAfter=8, leading=14))
    styles.add(ParagraphStyle(name='PRBullet', fontSize=10, spaceAfter=4, leftIndent=20, leading=12))
    
    story = []
    if os.path.exists(img_path):
        story.append(Image(img_path, width=6.5*inch, height=3*inch))
        story.append(Spacer(1, 20))
    
    for line in read_md(name).split('\n'):
        line = line.strip()
        if not line:
            continue
        if line == '---':
            story.append(HRFlowable(width='100%', thickness=1, color=HexColor('#dddddd')))
        elif line.startswith('# PRESS'):
            story.append(Paragraph('PRESS RELEASE', styles['PRTitle']))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], styles['PRHeadline']))
        elif line.startswith('### '):
            story.append(Paragraph(line[4:], styles['PRSubHead']))
        elif line.startswith('- '):
            text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', line[2:])
            story.append(Paragraph('\u2022 ' + text, styles['PRBullet']))
        elif line[0].isdigit() and len(line) > 2 and line[1] == '.':
            text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', line[3:])
            story.append(Paragraph(line[0] + '. ' + text, styles['PRBullet']))
        else:
            text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', line)
            story.append(Paragraph(text, styles['PRBody']))
    
    doc.build(story)
    print(f'PDF: {name}.pdf')

def main():
    print('=' * 50)
    print('DAO Press Release Asset Generator')
    print(f'Steps: {STEPS}')
    print('=' * 50)
    
    for name, data in PRESS_RELEASES.items():
        try:
            img_path = generate_image(name, data)
            gen_html(name, data, img_path)
            gen_pdf(name, data, img_path)
            print(f'DONE: {name}\n')
        except Exception as e:
            print(f'ERROR {name}: {e}')
            import traceback
            traceback.print_exc()
    
    print('\nAll complete!')

if __name__ == '__main__':
    main()
