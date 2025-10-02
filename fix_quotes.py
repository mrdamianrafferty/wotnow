#!/usr/bin/env python3
import re

with open('pages/findr/log.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic Unicode quotes with HTML entities
content = content.replace('""<TranslatedText text={fishMatch.tinderBio} />""', '&ldquo;<TranslatedText text={fishMatch.tinderBio} />&rdquo;')

with open('pages/findr/log.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed JSX quote escaping')