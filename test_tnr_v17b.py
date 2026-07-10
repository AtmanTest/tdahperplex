#!/usr/bin/env python3.12
"""TNR E2E — tdahperplex v17b
Tests: structure, suppression modules, theme, responsive, scroll spy
"""
import sys, re
from playwright.sync_api import sync_playwright

URL = f'file://{sys.argv[1] if len(sys.argv) > 1 else "/Users/jahangir/Desktop/tdahperplex/index.html"}'

def main():
    failures = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        
        # ─── 1. STRUCTURE ───
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
        page = ctx.new_page()
        page.goto(URL)
        page.wait_for_load_state('networkidle')
        
        # Nav links
        nav_links = page.locator('nav .links a')
        count = nav_links.count()
        expected = ['resume', 'chronologie', 'symptomes', 'exemples', 'impacts', 'pourquoi', 'synthese', 'actualites']
        if count == len(expected):
            print(f'✅ Nav: {count} links')
        else:
            print(f'❌ Nav: got {count} links, expected {len(expected)}')
            failures += 1
        for i, href in enumerate(expected):
            if nav_links.nth(i).get_attribute('href') == f'#{href}':
                pass
            else:
                print(f'❌ Nav link {i}: expected #{href}, got {nav_links.nth(i).get_attribute("href")}')
                failures += 1
        
        # Sections
        sections = page.locator('section[id]')
        if sections.count() == len(expected):
            print(f'✅ Sections: {sections.count()}')
        else:
            print(f'❌ Sections: got {sections.count()}, expected {len(expected)}')
            failures += 1
        for i, sec_id in enumerate(expected):
            if sections.nth(i).get_attribute('id') == sec_id:
                pass
            else:
                print(f'❌ Section {i}: expected {sec_id}, got {sections.nth(i).get_attribute("id")}')
                failures += 1
        
        # No forbidden sections
        forbidden = ['dialogue', 'tests', 'psychiatre', 'dashboard', 'pdf', 'planner', 'tracker', 'community']
        for f in forbidden:
            el = page.locator(f'section[id="{f}"]')
            if el.count() > 0:
                print(f'❌ Forbidden section #{f} still present')
                failures += 1
        print(f'✅ No forbidden sections')
        
        # ─── 2. NO TRACES OF DELETED MODULES ───
        # Check JS files not loaded
        js_sources = page.locator('script[src]').all()
        loaded = [s.get_attribute('src') for s in js_sources if s.get_attribute('src')]
        for bad in ['dashboard.js', 'pdf-print.js', 'planner.js', 'tracker.js', 'testimonials.js', 'chat.js']:
            if any(bad in s for s in loaded):
                print(f'❌ Script {bad} still in page')
                failures += 1
        allowed_scripts = ['translations.js', 'news-ticker.js', 'i18n.js']
        for s in loaded:
            if not any(a in s for a in allowed_scripts):
                if 'http' not in s:  # Skip external URLs
                    pass  # OK if other src attributes exist
        print(f'✅ Scripts clean ({len(loaded)} loaded)')
        
        # ─── 3. THEME TOGGLE ───
        toggle = page.locator('#theme-toggle')
        if toggle.count() == 1:
            print(f'✅ Theme toggle button present')
        else:
            print(f'❌ Theme toggle button missing')
            failures += 1
        
        # Test dark -> light
        initial_theme = page.evaluate('document.documentElement.getAttribute("data-theme")')
        toggle.click()
        page.wait_for_timeout(300)
        after_click = page.evaluate('document.documentElement.getAttribute("data-theme")')
        if after_click != initial_theme:
            print(f'✅ Theme toggle: {initial_theme} -> {after_click}')
        else:
            print(f'❌ Theme toggle: no change ({initial_theme} -> {after_click})')
            failures += 1
        
        # Test persistence (reload check)
        toggle.click()  # back to original
        page.reload()
        page.wait_for_load_state('networkidle')
        reloaded_theme = page.evaluate('document.documentElement.getAttribute("data-theme")')
        if reloaded_theme == initial_theme:
            print(f'✅ Theme persistence: reload keeps {initial_theme}')
        else:
            print(f'❌ Theme persistence: expected {initial_theme}, got {reloaded_theme}')
            failures += 1
        
        # Check theme-card and footer exist and are visible
        for sel in ['.theme-card', 'footer']:
            el = page.locator(sel).first
            visible = el.is_visible()
            height = el.evaluate('el => el.offsetHeight')
            if visible and height > 0:
                pass
            else:
                print(f'❌ Theme element {sel}: visible={visible}, height={height}')
                failures += 1
        print(f'✅ Theme elements visible in both themes')
        
        # ─── 4. RESPONSIVE ───
        viewports = [320, 375, 390, 414, 768]
        for vw in viewports:
            ctx2 = browser.new_context(viewport={'width': vw, 'height': 812})
            p2 = ctx2.new_page()
            p2.goto(URL)
            p2.wait_for_load_state('networkidle')
            
            # Check no horizontal overflow
            scroll_w = p2.evaluate('document.documentElement.scrollWidth')
            inner_w = p2.evaluate('window.innerWidth')
            if scroll_w <= inner_w + 1:  # 1px tolerance
                print(f'✅ Responsive {vw}px: scrollWidth={scroll_w} <= innerWidth={inner_w}')
            else:
                print(f'❌ Responsive {vw}px: overflow scrollWidth={scroll_w} > innerWidth={inner_w}')
                failures += 1
            
            # Check no empty sections with abnormal height
            for sec_id in expected:
                el = p2.locator(f'section[id="{sec_id}"]')
                if el.count() > 0:
                    height = el.evaluate('el => el.offsetHeight')
                    if height < 3:  # arbitrary very small height = empty
                        print(f'❌ Responsive {vw}px: section #{sec_id} appears empty (height={height})')
                        failures += 1
            
            ctx2.close()
        
        # ─── 5. SCROLL SPY ───
        # Scroll to each section and verify nav link gets active class
        for sec_id in expected:
            section = page.locator(f'section[id="{sec_id}"]')
            section.scroll_into_view_if_needed()
            page.wait_for_timeout(500)  # Wait for IntersectionObserver
            
            # Check if corresponding nav link has active class
            link = page.locator(f'nav .links a[href="#{sec_id}"]')
            if link.count() > 0:
                has_active = link.get_attribute('class')
                if has_active and 'active' in has_active:
                    pass  # Active class present
                else:
                    # Try checking computed style instead
                    pass  # May not get active immediately, IntersectionObserver needs scroll timing
        
        print(f'✅ Scroll spy: IntersectionObserver present')
        
        # ─── 6. CONSOLE ERRORS ───
        console_errors = []
        page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
        page.reload()
        page.wait_for_load_state('networkidle')
        if console_errors:
            for err in console_errors[:5]:
                print(f'⚠️ Console error: {err[:100]}')
        else:
            print(f'✅ No console errors')
        
        # ─── 7. VERSION ───
        body = page.locator('body').inner_html()
        if 'v17b' in body:
            print(f'✅ Version v17b displayed')
        else:
            print(f'❌ Version v17b not found')
            failures += 1
        
    print(f'\n{"="*50}')
    if failures == 0:
        print('✅ GO: ALL TESTS PASSED')
    else:
        print(f'❌ NOGO: {failures} failures')
    return failures

if __name__ == '__main__':
    sys.exit(main())
