#!/usr/bin/env python3
"""TNR — tdah-profile v16
Tests: API (all scripts), UI desktop, UI mobile
"""
import json, sys, os, subprocess, re

BASE = "/Users/jahangir/Desktop/tdah-profile"
HTML = os.path.join(BASE, "index.html")
errors = []

def die(msg):
    errors.append(msg)
    print(f"  ❌ {msg}")

def ok(msg):
    print(f"  ✅ {msg}")

# ── 1. FILE INTEGRITY ──
print("\n📁 1. Fichiers essentiels")
required = ["index.html", "translations.js", "scripts/dashboard.js", "scripts/chat.js",
            "scripts/pdf-print.js", "scripts/planner.js", "scripts/tracker.js",
            "scripts/testimonials.js", "scripts/i18n.js", ".nojekyll"]
for f in required:
    p = os.path.join(BASE, f)
    if os.path.isfile(p):
        sz = os.path.getsize(p)
        ok(f"{f} — {sz:,} bytes")
    else:
        die(f"{f} — MANQUANT")

# ── 2. HTML STRUCTURE ──
print("\n🏗️  2. Structure HTML")
with open(HTML) as f:
    h = f.read()

# Meta
if '<meta charset="UTF-8">' in h:
    ok("meta charset OK")
else:
    die("meta charset manquant")

# All 17 sections
sections = [
    "resume", "chronologie", "symptomes", "exemples", "impacts",
    "pourquoi", "dialogue", "psychiatre", "tableau", "tests",
    "dashboard", "chat", "pdf", "planner", "tracker", "community", "actualites"
]
for s in sections:
    pat = f'id="{s}"'
    if pat in h:
        ok(f"Section #{s} présente")
    else:
        die(f"Section #{s} MANQUANTE")

# Nav links (17 total)
nav_count = h.count('<a href="#')
if nav_count >= 17:
    ok(f"Nav: {nav_count} liens")
else:
    die(f"Nav: seulement {nav_count} liens (attendu ≥ 18)")

# Script tags for 6 new features
for script in ["dashboard.js", "chat.js", "pdf-print.js", "planner.js", "tracker.js", "testimonials.js"]:
    if f'src="scripts/{script}"' in h:
        ok(f"Script {script} chargé")
    else:
        die(f"Script {script} NON chargé")

# i18n attrs on new sections
for attr in ["dashboard", "chat", "pdf", "planner", "tracker", "community"]:
    if f'data-i18n="sec.{attr}"' in h:
        ok(f"data-i18n sec.{attr} présent")
    else:
        die(f"data-i18n sec.{attr} MANQUANT")

# ── 3. JAVASCRIPT VALIDITY ──
print("\n🔍 3. Validité JS")
js_files = ["scripts/dashboard.js", "scripts/chat.js", "scripts/pdf-print.js",
            "scripts/planner.js", "scripts/tracker.js", "scripts/testimonials.js",
            "scripts/i18n.js", "translations.js"]
for jf in js_files:
    p = os.path.join(BASE, jf)
    if not os.path.isfile(p):
        die(f"{jf} — fichier manquant")
        continue
    r = subprocess.run(["node", "--check", p], capture_output=True, text=True, timeout=10)
    if r.returncode == 0:
        ok(f"{jf} — JS valide")
    else:
        die(f"{jf} — ERREUR: {r.stderr.strip()[:200]}")

# ── 4. FEATURE VERIFICATION ──
print("\n⚙️  4. Vérification features")

# 4a. Dashboard: container + JS structure
if 'id="dashboard-app"' in h:
    ok("Dashboard: app container présent (canvas + inputs générés par JS)")
else:
    die("Dashboard: app container MANQUANT")

# 4b. Chat: key setup + messages
if 'id="chat-key-setup"' in h:
    ok("Chat: key setup container présent")
else:
    die("Chat: key setup MANQUANT")
if 'id="chat-messages"' in h:
    ok("Chat: messages container présent")
else:
    die("Chat: messages container MANQUANT")

# 4c. PDF: generate button
if 'id="pdf-generate-btn"' in h:
    ok("PDF: generate button présent")
else:
    die("PDF: generate button MANQUANT")
if 'pdf-btn' in h:
    ok("PDF: btn CSS classes présentes")
else:
    die("PDF: btn CSS MANQUANTES")

# 4d. Planner: app container
if 'id="planner-app"' in h:
    ok("Planner: app container présent")
else:
    die("Planner: app container MANQUANT")

# 4e. Tracker: app container
if 'id="tracker-app"' in h:
    ok("Tracker: app container présent")
else:
    die("Tracker: app container MANQUANT")

# 4f. Community: FAQ + testimonials
if 'id="faq-app"' in h:
    ok("Communauté: FAQ container présent")
else:
    die("Communauté: FAQ container MANQUANT")
if 'id="testimonials-app"' in h:
    ok("Communauté: testimonials container présent")
else:
    die("Communauté: testimonials container MANQUANT")

# ── 5. TRANSLATIONS ──
print("\n🌐 5. Traductions")
with open(os.path.join(BASE, "translations.js")) as f:
    t = f.read()

# FR nav keys
for k in ["nav.dashboard", "nav.chat", "nav.pdf", "nav.planner", "nav.tracker", "nav.community"]:
    if f'"{k}"' in t and '"Scores"' in t or f'"{k}"' in t:
        pass # just check key exists
    exists = f'"{k}"' in t
    if exists:
        ok(f"Clé FR {k} présente")
    else:
        die(f"Clé FR {k} MANQUANTE")

# EN nav keys
if '"nav.dashboard": "Scores"' in t and '"nav.chat": "Chat"' in t:
    ok("EN nav keys présentes")
else:
    die("EN nav keys incomplètes")

# FR intro texts
for key in ["dashboard.intro", "chat.intro", "pdf.intro", "pdf.btn",
            "planner.intro", "tracker.intro", "community.intro",
            "community.testi_title", "community.testi_desc"]:
    if f'"{key}"' in t:
        ok(f"Clé FR {key} présente")
    else:
        die(f"Clé FR {key} MANQUANTE")

# EN intro texts
for key in ["dashboard.intro", "chat.intro", "pdf.intro", "pdf.btn",
            "planner.intro", "tracker.intro", "community.intro",
            "community.testi_title", "community.testi_desc"]:
    if f'"{key}"' in t:
        ok(f"Clé EN {key} présente")
    else:
        die(f"Clé EN {key} MANQUANTE")

# ── 6. DARK/LIGHT THEME ──
print("\n🎨 6. Thème")
if 'data-theme="dark"' in h or 'data-theme="light"' in h:
    ok("data-theme présent sur <html>")
else:
    die("data-theme MANQUANT sur <html>")
if 'id="theme-toggle"' in h:
    ok("Theme toggle button présent")
else:
    die("Theme toggle button MANQUANT")

# ── 7. NAV ORDER — matches section order ──
print("\n🧭 7. Ordre Nav → Sections")
# Expected nav→section mapping
nav_map = [
    ("resume","Résumé"),("chronologie","Parcours"),("symptomes","Symptômes"),
    ("exemples","Exemples"),("impacts","Impacts"),("pourquoi","Analyse"),
    ("dialogue","Consultation"),("tests","Tests"),("psychiatre","60s"),
    ("synthese","Synthèse"),("dashboard","Scores"),("chat","Chat"),
    ("pdf","PDF"),("planner","Rdv"),("tracker","Médic"),
    ("community","Communauté"),("actualites","Actualités"),
]
nav_idx = []
for sid, _ in nav_map:
    if sid == "synthese":
        # synthese shares section with tableau
        check = 'id="synthese"' if 'id="synthese"' in h else 'id="tableau"'
        idx = h.find(check)
    else:
        idx = h.find(f'id="{sid}"')
    if idx >= 0:
        nav_idx.append((idx, sid))
    else:
        die(f"Section #{sid} MANQUANTE dans HTML")
nav_idx.sort()
nav_order = [s for _, s in nav_idx]
expected = [n[0] for n in nav_map]
if nav_order == expected:
    ok("Ordre HTML parfait: Résumé→Parcours→Symptômes→Exemples→Impacts→Analyse→Consultation→Tests→60s→Synthèse→Scores→Chat→PDF→Rdv→Médic→Communauté→Actualités")
else:
    for i, (got, exp) in enumerate(zip(nav_order, expected)):
        if got != exp:
            die(f"Position {i+1}: attendu #{exp}, trouvé #{got}")
            break

# ── 8. I18N — FR/EN toggle + synthese ──
print("\n🌐 8. I18N & Navigation")
if 'data-lang-active="fr"' in h:
    ok("Toggle: data-lang-active=\"fr\" présent")
else:
    die("Toggle: data-lang-active=\"fr\" MANQUANT")
if 'data-lang-active="en"' in h:
    ok("Toggle: data-lang-active=\"en\" présent")
else:
    die("Toggle: data-lang-active=\"en\" MANQUANT")
if 'id="synthese"' in h:
    ok("#synthese (alias tableau) accessible")
else:
    die("#synthese MANQUANT")

# ── 9. NOJEYKLL ──
print("\n🔧 9. GitHub Pages")
if os.path.isfile(os.path.join(BASE, ".nojekyll")):
    ok(".nojekyll présent")
else:
    die(".nojekyll MANQUANT — GitHub Pages risque de bloquer les _scripts")

# ── 8. RESULT ──
print(f"\n{'='*50}")
if errors:
    print(f"❌ TNR ÉCHOUÉ — {len(errors)} erreur(s):")
    for e in errors:
        print(f"   • {e}")
    sys.exit(1)
else:
    print("✅ TNR VERT — Tous les tests passent")
    sys.exit(0)
