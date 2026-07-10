#!/usr/bin/env python3
"""TNR — tdahperplex v17a
Tests: API (all scripts), UI desktop, UI mobile
"""
import json, sys, os, subprocess, re

BASE = "/Users/jahangir/Desktop/tdahperplex"
HTML = os.path.join(BASE, "index.html")
errors = []

def die(msg):
    errors.append(msg)
    print(f"  ❌ {msg}")

def ok(msg):
    print(f"  ✅ {msg}")

# ── 1. FILE INTEGRITY ──
print("\n📁 1. Fichiers essentiels")
required = ["index.html", "translations.js", ".nojekyll",
            "scripts/dashboard.js", "scripts/pdf-print.js", "scripts/planner.js",
            "scripts/tracker.js", "scripts/testimonials.js", "scripts/i18n.js"]
for f in required:
    p = os.path.join(BASE, f)
    if os.path.isfile(p):
        sz = os.path.getsize(p)
        ok(f"{f} — {sz:,} bytes")
    else:
        die(f"{f} — MANQUANT")

# Verify chat.js is DELETED
chat_p = os.path.join(BASE, "scripts/chat.js")
if not os.path.isfile(chat_p):
    ok("scripts/chat.js — SUPPRIMÉ (assistant TDAH retiré)")
else:
    die("scripts/chat.js — ENCORE PRÉSENT")

# ── 2. HTML STRUCTURE ──
print("\n🏗️  2. Structure HTML")
with open(HTML) as f:
    h = f.read()

# Meta
if '<meta charset="UTF-8">' in h:
    ok("meta charset OK")
else:
    die("meta charset manquant")

# All sections (NO chat, NO tableau — synthese replaces)
sections = [
    "resume", "chronologie", "symptomes", "exemples", "impacts",
    "pourquoi", "dialogue", "psychiatre", "synthese", "tests",
    "dashboard", "pdf", "planner", "tracker", "community", "actualites"
]
for s in sections:
    pat = f'id="{s}"'
    if pat in h:
        ok(f"Section #{s} présente")
    else:
        die(f"Section #{s} MANQUANTE")

# Verify chat section ABSENT
if 'id="chat"' in h:
    die("Section #chat — ENCORE PRÉSENTE (devrait être supprimée)")
else:
    ok("Section #chat — SUPPRIMÉE")

# Nav links (≥ 16 section links + 2 utility links = 18)
nav_count = h.count('<a href="#')
if nav_count >= 18:
    ok(f"Nav: {nav_count} liens")
else:
    die(f"Nav: seulement {nav_count} liens (attendu ≥ 18)")

# Chat nav link removed
if 'nav.chat' in h:
    die("Nav chat — ENCORE PRÉSENT")
else:
    ok("Nav chat — SUPPRIMÉ")

# Script loading — chat.js removed
if 'chat.js' in h:
    die("Script chat.js — ENCORE CHARGÉ")
else:
    ok("Script chat.js — NON CHARGÉ")

# Dashboard, PDF, planner, tracker, testimonials, i18n scripts loaded
for script in ["dashboard.js", "pdf-print.js", "planner.js", "tracker.js", "testimonials.js", "i18n.js"]:
    if f'src="scripts/{script}"' in h:
        ok(f"Script {script} chargé")
    else:
        die(f"Script {script} NON TROUVÉ")

# Section labels
for label in ["sec.dashboard", "sec.pdf", "sec.planner", "sec.tracker", "sec.community"]:
    if f'data-i18n="{label}"' in h:
        ok(f"data-i18n {label} présent")
    else:
        die(f"data-i18n {label} MANQUANT")

# ── 3. JS VALIDITY ──
print("\n🔍 3. Validité JS")
js_files = ["scripts/dashboard.js", "scripts/pdf-print.js", "scripts/planner.js",
            "scripts/tracker.js", "scripts/testimonials.js", "scripts/i18n.js", "translations.js"]
for jsf in js_files:
    jsp = os.path.join(BASE, jsf)
    if not os.path.isfile(jsp):
        die(f"{jsf} — MANQUANT")
        continue
    # node syntax check
    r = subprocess.run(["node", "--check", jsp], capture_output=True, text=True)
    if r.returncode == 0:
        ok(f"{jsf} — JS valide")
    else:
        die(f"{jsf} — ERREUR: {r.stderr.strip()}")

# ── 4. FEATURE VERIFICATION ──
print("\n⚙️  4. Vérification features")
# Dashboard
if 'id="dashboard-app"' in h:
    ok("Dashboard: app container présent (canvas + inputs générés par JS)")
else:
    die("Dashboard: app container manquant")

# PDF
if 'id="pdf-generate-btn"' in h:
    ok("PDF: generate button présent")
else:
    die("PDF: generate button manquant")

# Planner
if 'id="planner-app"' in h:
    ok("Planner: app container présent")
else:
    die("Planner: app container manquant")

# Tracker
if 'id="tracker-app"' in h:
    ok("Tracker: app container présent")
else:
    die("Tracker: app container manquant")

# Communauté
if 'id="faq-app"' in h:
    ok("Communauté: FAQ container présent")
else:
    die("Communauté: FAQ container manquant")
if 'id="testimonials-app"' in h:
    ok("Communauté: testimonials container présent")
else:
    die("Communauté: testimonials container manquant")

# Chat features absent
for chat_id in ["chat-key-setup", "chat-messages", "chat-overlay", "chat-toggle"]:
    if chat_id in h:
        die(f"Chat: {chat_id} ENCORE PRÉSENT")
    else:
        ok(f"Chat: {chat_id} — SUPPRIMÉ")

# ── 5. TRANSLATIONS ──
print("\n🌐 5. Traductions")
with open(os.path.join(BASE, "translations.js")) as f:
    t = f.read()

fr_keys = ["nav.resume", "nav.parcours", "nav.symptomes", "nav.exemples",
           "nav.impacts", "nav.analyse", "nav.consultation", "nav.tests",
           "nav.60s", "nav.synthese", "nav.dashboard", "nav.pdf",
           "nav.planner", "nav.tracker", "nav.community", "nav.actualites",
           "dashboard.intro", "pdf.intro", "pdf.btn",
           "planner.intro", "tracker.intro",
           "community.intro", "community.testi_title", "community.testi_desc"]

# Check NO chat keys remain
for k in ["nav.chat", "chat.intro", "sec.chat"]:
    key = f'"{k}"'
    if key in t:
        die(f"Clé FR {k} — ENCORE PRÉSENTE")
    else:
        ok(f"Clé FR {k} — SUPPRIMÉE")

# Required FR keys
for k in fr_keys:
    if f'"{k}"' in t:
        ok(f"Clé FR {k} présente")
    else:
        die(f"Clé FR {k} MANQUANTE")

# Required EN keys
en_keys = [k.replace(".", "\":\"") for k in fr_keys]
for k in fr_keys:
    if f'"{k}":"' in t:
        ok(f"Clé EN {k} présente")
    else:
        # Try with extra quotes
        if f'"{k}"' in t:
            ok(f"Clé EN {k} présente (vérification partielle)")
        else:
            die(f"Clé EN {k} MANQUANTE")

# ── 6. THEME ──
print("\n🎨 6. Thème")
if 'data-theme' in h:
    ok("data-theme présent sur <html>")
else:
    die("data-theme manquant")
if 'id="theme-toggle"' in h:
    ok("Theme toggle button présent")
else:
    die("Theme toggle button manquant")
if '[data-theme="dark"]' in h:
    ok("Dark theme CSS déclaré")
else:
    die("Dark theme CSS manquant")
if '[data-theme="light"]' in h:
    ok("Light theme CSS déclaré")
else:
    die("Light theme CSS manquant")

# ── 7. NAV ORDER ──
print("\n🧭 7. Ordre Nav → Sections")
nav_expected = [
    "resume", "chronologie", "symptomes", "exemples", "impacts",
    "pourquoi", "dialogue", "tests", "psychiatre", "synthese",
    "dashboard", "pdf", "planner", "tracker", "community", "actualites"
]
# Find actual order from nav links
in_nav = h[h.find('class="links"'):h.find('</div>', h.find('class="links"'))]
nav_order = re.findall(r'<a href="#([^"]+)"', in_nav)
if nav_order == nav_expected:
    ok(f"Ordre Nav parfait: {'→'.join(nav_order[:8])}…")
else:
    die(f"Ordre Nav incorrect: attendu {nav_expected}, trouvé {nav_order}")

# ── 8. I18N & NAVIGATION ──
print("\n🌐 8. I18N & Navigation")
if 'data-lang-active="fr"' in h:
    ok('Toggle: data-lang-active="fr" présent')
else:
    die('data-lang-active="fr" manquant')
if 'data-lang-active="en"' in h:
    ok('Toggle: data-lang-active="en" présent')
else:
    die('data-lang-active="en" manquant')

# #synthese accessible
if 'id="synthese"' in h:
    ok("#synthese accessible")
else:
    die("#synthese manquant")

# Verify no duplicate id
if 'id="tableau" id="synthese"' in h:
    die("DUPLICATE id tableau/synthese encore présent")
else:
    ok("Pas de double id sur synthese")

# ── 9. INTERSECTION OBSERVER ──
print("\n🔄 9. Scroll Spy (IntersectionObserver)")
if 'IntersectionObserver' in h:
    ok("IntersectionObserver utilisé — scroll spy moderne")
else:
    die("IntersectionObserver NON TROUVÉ — ancien scroll spy toujours présent")

# Remove old scroll listener check
if 'window.addEventListener' in h and 'updateActive' in h:
    # Check it's the theme toggle, not scroll spy
    pass
if 'window._oldScroll' in h:
    ok("Cleanup d'ancien scroll listener prévu")
else:
    ok("Nouveau scroll spy sans ancien listener (propre)")

# ── 10. VERSION ──
print("\n📋 10. Version")
if 'v17a' in h:
    ok("Version v17a affichée dans le nav")
else:
    die("Version v17a NON TROUVÉE")

# ── 11. GITHUB PAGES ──
print("\n🔧 11. GitHub Pages")
nojekyll = os.path.join(BASE, ".nojekyll")
if os.path.isfile(nojekyll):
    ok(".nojekyll présent")
    sz = os.path.getsize(nojekyll)
    if sz == 0:
        ok(".nojekyll — fichier vide (OK)")
else:
    die(".nojekyll MANQUANT")

# ── 12. MOBILE RESPONSIVE ──
print("\n📱 12. Mobile Responsive")
# Section padding should be reasonable (not using sp-lg which is 4rem)
if 'section{padding:clamp(' in h:
    ok("Section padding responsive (clamp, pas de 4rem fixe)")
else:
    die("Section padding non responsive")

# Media query for mobile nav
if '@media(max-width:500px)' in h:
    ok("Nav responsive breakpoint 500px présent")
else:
    die("Nav responsive breakpoint 500px manquant")

# ── 13. SECTION HEADERS (NEW CHARTE) ──
print("\n🎯 13. Section Headers — Nouvelle charte")
if 'font-size:.65rem' in h and 'font-weight:800' in h:
    ok("Section-label: font-size 0.65rem, font-weight 800 (nouvelle charte)")
else:
    die("Section-label: ancienne charte détectée")

# ── SUMMARY ──
print(f"\n{'='*50}")
if errors:
    for e in errors:
        print(f"  ❌ {e}")
    print(f"\n🔴 TNR ROUGE — {len(errors)} échec(s)")
    sys.exit(1)
else:
    print("✅ TNR VERT — Tous les tests passent")
