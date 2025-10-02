#!/usr/bin/env python3
import re

# Read the file
with open('pages/findr/log.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line 1223 (index 1222)
if len(lines) > 1222:
    old_line = lines[1222]
    # Replace the problematic pattern
    new_line = old_line.replace('""&ldquo;<TranslatedText text={fishMatch.tinderBio} />&rdquo;""', '&ldquo;<TranslatedText text={fishMatch.tinderBio} />&rdquo;')
    lines[1222] = new_line
    print(f"Old line: {old_line.strip()}")
    print(f"New line: {new_line.strip()}")

# Write the file back
with open('pages/findr/log.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed the quote issue!")