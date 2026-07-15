css_path = "D:/AI视频/website/css/style.css"
css = open(css_path, "r", encoding="utf-8").read()

# Remove ALL existing @media blocks
import re

def remove_media_blocks(text):
    result = []
    i = 0
    while i < len(text):
        # Check if we're at a media query
        if text[i:i+6] == "@media":
            # Find the opening brace
            brace = text.index("{", i)
            depth = 1
            j = brace + 1
            while j < len(text) and depth > 0:
                if text[j] == "{": depth += 1
                elif text[j] == "}": depth -= 1
                j += 1
            i = j  # Skip past the closing brace
        else:
            result.append(text[i])
            i += 1
    return "".join(result)

css = remove_media_blocks(css)

# Remove trailing whitespace
css = css.rstrip()

# Add consolidated responsive styles
css += """

/* ============ RESPONSIVE ============ */

/* Tablet landscape / small desktop */
@media (max-width: 1024px) {
    .about-content { grid-template-columns: 1fr; gap: 60px; }
    .contact-content { grid-template-columns: 1fr; gap: 60px; }
    .about-visual { order: -1; }
    .section { padding: 120px 48px; }
    .section-header { margin-bottom: 72px; }
    .section-title { font-size: clamp(30px, 5vw, 42px); }
    .work-grid { gap: 32px; }
}

/* Tablet */
@media (max-width: 768px) {
    .navbar { padding: 0 32px; }
    .nav-menu {
        position: fixed; top: 64px; left: 0; right: 0;
        background: rgba(0,0,0,0.95);
        backdrop-filter: blur(20px);
        flex-direction: column; padding: 24px 32px;
        gap: 20px; display: none;
    }
    .nav-menu.open { display: flex; }
    .nav-link { font-size: 15px; padding: 8px 0; }
    .nav-toggle { display: flex; }

    .section { padding: 100px 32px; }
    .section-header { margin-bottom: 60px; }
    .section-title { font-size: clamp(28px, 6vw, 36px); }
    .section-desc { font-size: 15px; }

    .hero-content { padding: 0 32px; }
    .hero-eyebrow { font-size: 10px; margin-bottom: 16px; letter-spacing: 3px; }
    .hero-title { font-size: clamp(32px, 10vw, 52px); letter-spacing: -1px; }
    .title-accent { font-size: clamp(22px, 6vw, 36px); letter-spacing: 3px; }
    .hero-subtitle { font-size: 15px; margin: 12px auto 32px; }
    .hero-showcase { bottom: 60px; }
    .showcase-track { gap: 8px; max-width: 340px; }
    .showcase-item { max-width: 80px; }
    .showcase-thumb { padding: 10px 6px; }
    .showcase-icon { font-size: 16px; }
    .showcase-label { font-size: 7px; }
    .scroll-indicator { display: none; }
    .btn { padding: 13px 30px; font-size: 13px; min-height: 46px; }

    .filter-bar { gap: 8px; margin-bottom: 36px; overflow-x: auto; flex-wrap: nowrap; justify-content: flex-start; padding-bottom: 4px; }
    .filter-btn { flex-shrink: 0; padding: 6px 16px; font-size: 11px; }

    .work-grid { grid-template-columns: 1fr; gap: 28px; }
    .work-card { border-radius: 14px; }
    .work-card-title { font-size: 20px; }
    .work-card-hover { display: none; }

    .about-content { gap: 48px; }
    .about-frame { width: 220px; }
    .about-badge { width: 60px; height: 60px; font-size: 22px; }
    .about-text h3 { font-size: 32px; }
    .about-bio { font-size: 14px; }
    .about-services { margin-top: 28px; padding-top: 24px; }
    .service-item { padding: 12px 16px; }

    .contact-content { gap: 40px; }
    .contact-item { padding: 14px 16px; }
    .contact-icon { width: 40px; height: 40px; font-size: 16px; }
    .contact-link { font-size: 14px; }
    .contact-cta { padding: 36px 24px; }

    .modal-content { padding: 28px 24px; }
    .modal-title { font-size: 24px; }
    .modal-subtitle { font-size: 14px; }
    .modal-media { border-radius: 12px; }

    .section-divider { margin: 0 32px; }
    .footer { padding: 56px 32px 40px; }
}

/* Phone */
@media (max-width: 480px) {
    .navbar { padding: 0 20px; }
    .nav-container { height: 56px; }
    .nav-logo { font-size: 11px; letter-spacing: 2px; }
    .nav-menu { top: 56px; padding: 20px 24px; gap: 16px; }
    .nav-link { font-size: 14px; }

    .section { padding: 72px 20px; }
    .section-header { margin-bottom: 44px; }
    .section-tag { font-size: 10px; margin-bottom: 12px; letter-spacing: 2px; }
    .section-tag::after { width: 20px; margin: 10px auto 0; }
    .section-title { font-size: clamp(24px, 8vw, 30px); margin-bottom: 12px; }
    .section-desc { font-size: 14px; line-height: 1.6; }

    .hero-content { padding: 0 20px; }
    .hero-eyebrow { font-size: 9px; letter-spacing: 3px; margin-bottom: 14px; }
    .hero-title { font-size: clamp(28px, 12vw, 38px); letter-spacing: -1px; }
    .title-accent { font-size: clamp(18px, 6vw, 26px); letter-spacing: 2px; margin-top: 2px; }
    .hero-subtitle { font-size: 14px; margin: 10px auto 28px; max-width: 100%; }
    .hero-actions { flex-direction: column; align-items: center; gap: 12px; }
    .btn { width: 100%; max-width: 280px; padding: 13px 24px; font-size: 13px; border-radius: 26px; min-height: 44px; }
    .hero-showcase { bottom: 40px; }
    .showcase-track { gap: 6px; max-width: 260px; }
    .showcase-item { max-width: 64px; }
    .showcase-thumb { padding: 8px 6px; gap: 6px; border-radius: 8px; }
    .showcase-icon { font-size: 14px; }
    .showcase-label { font-size: 6px; letter-spacing: 0.5px; }

    .filter-bar { gap: 6px; margin-bottom: 28px; }
    .filter-btn { padding: 5px 14px; font-size: 10px; }

    .work-grid { gap: 18px; }

    .about-content { gap: 36px; }
    .about-frame { width: 180px; }
    .about-badge { width: 50px; height: 50px; font-size: 18px; }
    .about-text h3 { font-size: 28px; margin-bottom: 14px; }
    .about-bio { font-size: 13px; line-height: 1.8; }
    .about-bio + .about-bio { margin-top: 12px; }
    .about-services { margin-top: 24px; padding-top: 20px; gap: 10px; }
    .service-item { padding: 10px 14px; gap: 10px; }
    .service-name { font-size: 13px; }
    .service-desc { font-size: 11px; }
    .direction-grid { grid-template-columns: 1fr 1fr; gap: 6px; }
    .direction-chip { padding: 8px 12px; border-radius: 8px; }
    .chip-icon { font-size: 12px; }
    .chip-text { font-size: 11px; }

    .contact-content { gap: 28px; }
    .contact-info { gap: 10px; }
    .contact-item { padding: 12px 14px; gap: 12px; border-radius: 10px; }
    .contact-icon { width: 36px; height: 36px; font-size: 14px; }
    .contact-link { font-size: 13px; }
    .contact-label { font-size: 9px; letter-spacing: 1px; }
    .contact-cta { padding: 28px 20px; gap: 16px; border-radius: 16px; }
    .contact-cta p { font-size: 15px; }

    .modal-content { padding: 24px 16px; }
    .modal-title { font-size: 20px; }
    .modal-subtitle { font-size: 13px; line-height: 1.6; }
    .modal-header { margin-bottom: 16px; }
    .modal-media { border-radius: 10px; margin-bottom: 24px; }
    .modal-highlights li { padding: 12px 14px; font-size: 13px; }
    .modal-close { top: 12px; right: 12px; width: 32px; height: 32px; }
    .modal-close span { width: 14px; }
    .video-play-btn { width: 50px; height: 50px; }
    .play-icon { font-size: 16px; }

    .section-divider { margin: 0 20px; }
    .footer { padding: 40px 20px 32px; }
    .footer-brand { font-size: 11px; letter-spacing: 2px; margin-bottom: 8px; }
    .footer-text { font-size: 12px; margin-bottom: 12px; }
    .footer-copy { font-size: 10px; }
}

/* Small phones */
@media (max-width: 380px) {
    .hero-title { font-size: clamp(24px, 10vw, 30px); }
    .title-accent { font-size: clamp(16px, 5vw, 22px); }
    .hero-showcase { display: none; }
    .section { padding: 56px 16px; }
    .work-grid { gap: 14px; }
    .about-frame { width: 150px; }
    .direction-grid { gap: 4px; }
    .contact-item { padding: 10px 12px; }
    .modal-content { padding: 20px 14px; }
    .modal-title { font-size: 18px; }
}

/* Ensure images/videos don't stretch on mobile */
img, video {
    max-width: 100%;
    height: auto;
}
"""

open(css_path, "w", encoding="utf-8").write(css)
print(f"CSS rewritten: {len(css)} chars")
print("Done!")
