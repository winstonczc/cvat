#!/usr/bin/env python3
"""Regenerate src/i18n/resources.ts from the locale directory layout.

Usage: python3 scripts/gen-i18n-resources.py
Run after adding/removing a namespace or a language directory.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
LOCALES = os.path.join(HERE, '..', 'src', 'locales')
OUT = os.path.join(HERE, '..', 'src', 'i18n', 'resources.ts')

langs = sorted(d for d in os.listdir(LOCALES) if os.path.isdir(os.path.join(LOCALES, d)))
nss = sorted(f[:-5] for f in os.listdir(os.path.join(LOCALES, 'en')) if f.endswith('.json'))

def varname(lang, ns):
    return 'L_' + lang.replace('-', '_') + '__' + ns.replace('-', '_')

def propkey(name):
    # ESLint quote-props: only quote keys that are not valid identifiers
    return f"'{name}'" if not name.replace('_', '').isalnum() or name[0].isdigit() else name

lines = [
    "// Copyright (C) CVAT.ai Corporation",
    "//",
    "// SPDX-License-Identifier: MIT",
    "",
    "// GENERATED FILE - regenerate with cvat-ui/scripts/gen-i18n-resources.py",
    "",
]
for lang in langs:
    for ns in nss:
        path = os.path.join(LOCALES, lang, ns + '.json')
        if not os.path.exists(path):
            raise SystemExit(f'missing locale file: {path}')
        lines.append(f"import {varname(lang, ns)} from 'locales/{lang}/{ns}.json';")
lines.append("")
lines.append("export const NAMESPACES = [")
for ns in nss:
    lines.append(f"    '{ns}',")
lines.append("] as const;")
lines.append("")
lines.append("export type Namespace = typeof NAMESPACES[number];")
lines.append("")
lines.append("const resources: Record<string, Record<string, any>> = {")
for lang in langs:
    lines.append(f"    {propkey(lang)}: {{")
    for ns in nss:
        lines.append(f"        {propkey(ns)}: {varname(lang, ns)},")
    lines.append("    },")
lines.append("};")
lines.append("")
lines.append("export default resources;")
lines.append("")

with open(OUT, 'w') as f:
    f.write('\n'.join(lines))
print(f'written {OUT}: {len(langs)} languages x {len(nss)} namespaces')
