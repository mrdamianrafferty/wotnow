"""Convert the Daisy Studio design pages (*.dc.html) into React page bodies.

Usage: python3 -I html2jsx.py <canvas project dir> <img dir> <out dir>
Writes one <Name>.tsx per page into <out dir>, each exporting a default component.
"""
import html
import json
import os
import re
import sys
from html.parser import HTMLParser

SRC, IMG, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

PAGES = {
    'Main': ('Hub', '/studio'),
    'Rise': ('RiseDaisy', '/studio/rise-daisy'),
    'Hungerford': ('Hungerford', '/studio/hungerford-fishery'),
    'Findr': ('Findr', '/studio/findr'),
    'FlyCast': ('FlyCastCoach', '/studio/fly-cast-coach'),
    'Grewp': ('Grewp', '/studio/grewp'),
    'GoDaisy': ('GoDaisy', '/studio/go-daisy'),
    'GrowDaisy': ('GrowDaisy', '/studio/grow-daisy'),
    'KittenBingo': ('KittenBingo', '/studio/kitten-bingo'),
    'Build': ('Build', '/studio/build'),
    'Partner': ('Partner', '/studio/partner'),
}
IMGS = {os.path.splitext(f)[0]: f for f in os.listdir(IMG)}
VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source'}
ATTR = {'class': 'className', 'for': 'htmlFor', 'tabindex': 'tabIndex', 'autocomplete': 'autoComplete',
        'readonly': 'readOnly', 'maxlength': 'maxLength', 'colspan': 'colSpan', 'rowspan': 'rowSpan'}


def link(href):
    m = re.match(r'^(\w+)\.dc\.html(#.*)?$', href)
    if m and m.group(1) in PAGES:
        return PAGES[m.group(1)][1] + (m.group(2) or '')
    return href


def src(v):
    m = re.match(r'^/_blob/([0-9a-f]{32})$', v)
    if m:
        return '/studio/img/' + IMGS[m.group(1)]
    return v


def style_obj(s):
    out = []
    for decl in s.split(';'):
        if ':' not in decl:
            continue
        k, v = decl.split(':', 1)
        k, v = k.strip(), html.unescape(v.strip())
        if not k.startswith('--'):
            k = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
        out.append(f'{json.dumps(k)}: {json.dumps(v)}')
    return '{{' + ', '.join(out) + '} as React.CSSProperties}'


class Conv(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.stack = []
        self.sections = 0

    def attrs(self, tag, attrs):
        parts = []
        for k, v in attrs:
            if k == 'style':
                parts.append(f'style={style_obj(v or "")}')
                continue
            name = ATTR.get(k, k)
            if v is None:
                parts.append(name)
                continue
            v = html.unescape(v)
            if k == 'href':
                v = link(v)
            if k == 'src':
                v = src(v)
            parts.append(f'{name}={json.dumps(v)}')
        return (' ' + ' '.join(parts)) if parts else ''

    def handle_starttag(self, tag, attrs):
        if tag == 'a' and link(dict(attrs).get('href') or '').startswith('/studio'):
            tag = 'Link'
            self.stack.append('Link')
        elif tag == 'a':
            self.stack.append('a')
        if tag == 'section':
            self.sections += 1
        if tag == 'img' and self.sections > 1:
            # Below the hero: let the browser fetch these as they scroll into view.
            attrs = list(attrs) + [('loading', 'lazy'), ('decoding', 'async')]
        a = self.attrs(tag, attrs)
        self.out.append(f'<{tag}{a} />' if tag in VOID else f'<{tag}{a}>')

    def handle_startendtag(self, tag, attrs):
        self.out.append(f'<{tag}{self.attrs(tag, attrs)} />')

    def handle_endtag(self, tag):
        if tag == 'a':
            tag = self.stack.pop()
        if tag not in VOID:
            self.out.append(f'</{tag}>')

    def handle_data(self, d):
        self.out.append(d.replace('{', '&#123;').replace('}', '&#125;').replace('>', '&gt;')
                        .replace("'", '&apos;').replace('"', '&quot;'))

    def handle_entityref(self, n):
        self.out.append(f'&{n};')

    def handle_charref(self, n):
        self.out.append(f'&#{n};')

    def handle_comment(self, d):
        pass


os.makedirs(OUT, exist_ok=True)
for name, (comp, _) in PAGES.items():
    s = open(os.path.join(SRC, name + '.dc.html'), encoding='utf-8').read()
    body = s[s.index('<div class="ds"'):s.rindex('</x-dc>')].rstrip()
    c = Conv()
    c.feed(body)
    jsx = ''.join(c.out)
    jsx = re.sub(r'\n{3,}', '\n\n', jsx)
    imports = "import React from 'react';\nimport Link from 'next/link';\n"
    if comp == 'Build':
        i = jsx.index('<form className="ds-form"')
        jsx = jsx[:i] + '<BriefForm />' + jsx[jsx.index('</form>', i) + len('</form>'):]
        imports += "import BriefForm from '../BriefForm';\n"
    code = ("// Generated from the Daisy Studio design canvas by scripts/studio/html2jsx.py.\n"
            "// Edit the copy here; regenerate only if the design changes wholesale.\n"
            "// Images are pre-sized WebP in public/studio/img, laid out by the design's CSS.\n"
            "/* eslint-disable @next/next/no-img-element */\n"
            + imports + "\n"
            f"export default function {comp}Body() {{\n  return (\n<>\n{jsx}\n</>\n  );\n}}\n")
    open(os.path.join(OUT, comp + '.tsx'), 'w', encoding='utf-8').write(code)
    print(comp, len(code))
