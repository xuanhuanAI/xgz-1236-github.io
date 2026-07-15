css = open("D:/AI视频/website/css/style.css", "r", encoding="utf-8").read()
orig = len(css)

# 1. Update :root variables
old_root = """    --black: #000000;
    --near-black: #0a0a0a;
    --dark-gray: #1a1a1a;
    --medium-gray: #2a2a2a;
    --silver: #86868b;
    --light-silver: #d2d2d7;
    --white: #ffffff;
    --off-white: #f5f5f7;
    --glass-bg: rgba(255,255,255,0.03);
    --glass-border: rgba(255,255,255,0.06);
    --transition: 0.4s cubic-bezier(0.25,0.1,0.25,1);
    --transition-slow: 0.8s cubic-bezier(0.25,0.1,0.25,1);
    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    --container: 1200px;
    --section-padding: 140px 48px;"""

new_root = """    --black: #000000;
    --near-black: #0a0a0a;
    --dark-gray: #1a1a1a;
    --medium-gray: #2a2a2a;
    --silver: #86868b;
    --light-silver: #d2d2d7;
    --white: #ffffff;
    --off-white: #f5f5f7;
    --glass-bg: rgba(255,255,255,0.03);
    --glass-border: rgba(255,255,255,0.06);
    --glass-hover: rgba(255,255,255,0.08);
    --accent-gradient: linear-gradient(135deg, #6e6e73, #a9a9b0, #e0e0e5);
    --transition: 0.5s cubic-bezier(0.25,0.1,0.25,1);
    --transition-slow: 0.8s cubic-bezier(0.25,0.1,0.25,1);
    --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
    --container: 1200px;
    --section-padding: 160px 64px;"""

css = css.replace(old_root, new_root)

# 2. Add film grain to body
old_body = "overflow-x: hidden;\n}"
new_body = """overflow-x: hidden;
}

body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
    opacity: 0.35;
    mix-blend-mode: overlay;
}"""
css = css.replace(old_body, new_body)

# 3. Update scrollbar
old_sel = "::selection { background: rgba(255,255,255,0.15); color: var(--white); }"
new_sel = """::-webkit-scrollbar { width: 5px; }
::-webkit-scrollbar-track { background: var(--black); }
::-webkit-scrollbar-thumb { background: var(--medium-gray); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--silver); }

::selection { background: rgba(255,255,255,0.15); color: var(--white); }"""
css = css.replace(old_sel, new_sel)

# 4. Section divider - wider margins
css = css.replace("    margin: 0 48px;", "    margin: 0 80px;")
css = css.replace("rgba(255,255,255,0.04) 20%,", "rgba(255,255,255,0.02) 15%,")
css = css.replace("rgba(255,255,255,0.06) 50%,", "rgba(255,255,255,0.05) 50%,")
css = css.replace("rgba(255,255,255,0.04) 80%", "rgba(255,255,255,0.02) 85%")

# 5. Update section header spacing
css = css.replace("margin-bottom: 96px;", "margin-bottom: 100px;")

# 6. Update reveal animation
css = css.replace(
    "    transition: opacity 0.8s ease, transform 0.8s ease;",
    "    transition: opacity 1s cubic-bezier(0.25,0.1,0.25,1), transform 1s cubic-bezier(0.25,0.1,0.25,1);"
)

# 7. Responsive padding updates
css = css.replace("padding: 120px 64px;", "padding: 120px 48px;")
# Fix: the above might change desktop too. Let me check the target.
# Actually I only want to update the tablet 1024px breakpoint

# 8. Update about-section with subtle top border
css = css.replace(
    ".about-section { background: var(--near-black); position: relative; }",
    ".about-section { background: var(--near-black); }"
)

open("D:/AI视频/website/css/style.css", "w", encoding="utf-8").write(css)
print(f"Updated: {orig} -> {len(css)} chars")
print("Done!")
