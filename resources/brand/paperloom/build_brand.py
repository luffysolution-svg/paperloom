"""PaperLoom 品牌素材生成器：文档轮廓 + 经纬编织纹。

几何全部在 1024 画布上定义；被压住的线在交叉处断开，不依赖背景色。
用法：python build_brand.py preview   # 只出预览图
      python build_brand.py all       # 生成并覆盖仓库内全部图标位
渲染依赖本机 Chrome（playwright channel="chrome"）与 Pillow。
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

INK = "#262626"
NAVY_TOP, NAVY_BOTTOM = "#2A3A63", "#141D36"
PAPER, FOLD = "#FBFAF6", "#D8D2C4"
WARP, WEFT = "#4C6EF5", "#F59F00"  # 横线=原文，竖线=译文

# 文档轮廓（1024 画布）
X0, Y0, X1, Y1, F, R = 272, 168, 752, 856, 150, 56
# 编织：3 横 3 竖
BAND, GAP = 50, 13
ROWS = [420, 548, 676]
COLS = [384, 512, 640]
H_SPAN = (326, 698)
V_SPAN = (356, 740)


def page_path() -> str:
    return (
        f"M{X0 + R},{Y0} H{X1 - F} L{X1},{Y0 + F} V{Y1 - R} "
        f"Q{X1},{Y1} {X1 - R},{Y1} H{X0 + R} Q{X0},{Y1} {X0},{Y1 - R} "
        f"V{Y0 + R} Q{X0},{Y0} {X0 + R},{Y0} Z"
    )


def fold_path() -> str:
    r = 26
    return f"M{X1 - F},{Y0} V{Y0 + F - r} Q{X1 - F},{Y0 + F} {X1 - F + r},{Y0 + F} H{X1} Z"


def _segments(lo: float, hi: float, cuts: list[float], half: float) -> list[tuple[float, float]]:
    out, cur = [], lo
    for c in sorted(cuts):
        out.append((cur, c - half))
        cur = c + half
    out.append((cur, hi))
    return [(a, b) for a, b in out if b - a >= BAND]  # 太短的末段会读成噪点，直接省略


def weave(warp: str, weft: str) -> str:
    half = BAND / 2 + GAP
    parts = []
    rx = BAND / 2
    for j, y in enumerate(ROWS):  # 横线：竖线在上的交叉处断开
        cuts = [x for i, x in enumerate(COLS) if (i + j) % 2 == 0]
        for a, b in _segments(H_SPAN[0], H_SPAN[1], cuts, half):
            parts.append(f'<rect x="{a}" y="{y - BAND / 2}" width="{b - a}" height="{BAND}" rx="{rx}" fill="{warp}"/>')
    for i, x in enumerate(COLS):  # 竖线：横线在上的交叉处断开
        cuts = [y for j, y in enumerate(ROWS) if (i + j) % 2 == 1]
        for a, b in _segments(V_SPAN[0], V_SPAN[1], cuts, half):
            parts.append(f'<rect x="{x - BAND / 2}" y="{a}" width="{BAND}" height="{b - a}" rx="{rx}" fill="{weft}"/>')
    return "".join(parts)


def svg(body: str, w: int = 1024, h: int = 1024, vb: str = "0 0 1024 1024", title: str = "PaperLoom") -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}">'
        f"<title>{title}</title>{body}</svg>\n"
    )


def app_icon() -> str:
    """彩色应用图标：深色圆角底 + 纸面 + 双色编织。"""
    return svg(
        '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{NAVY_TOP}"/><stop offset="1" stop-color="{NAVY_BOTTOM}"/>'
        "</linearGradient></defs>"
        '<rect x="0" y="0" width="1024" height="1024" rx="230" fill="url(#bg)"/>'
        f'<path d="{page_path()}" fill="{PAPER}"/>'
        f'<path d="{fold_path()}" fill="{FOLD}"/>'
        + weave(WARP, WEFT)
    )


def mark_body(color: str = INK) -> str:
    return (
        f'<path d="{page_path()}" fill="none" stroke="{color}" stroke-width="56" stroke-linejoin="round"/>'
        f'<path d="{fold_path()}" fill="{color}"/>'
        + weave(color, color)
    )


def mono_mark(color: str = INK) -> str:
    """单色标记：轮廓描边 + 单色编织，透明底。"""
    return svg(mark_body(color), vb="236 132 552 760", w=552, h=760)


def wordmark() -> str:
    """横版字标：单色标记 + PaperLoom。"""
    return svg(
        f'<g transform="translate(2,4) scale(0.0789) translate(-236,-132)">{mark_body()}</g>'
        f'<text x="58" y="47" font-family="Inter, \'Segoe UI\', -apple-system, \'Helvetica Neue\', Arial, sans-serif" '
        f'font-size="40" font-weight="700" letter-spacing="-0.5" fill="{INK}">Paper<tspan fill="{WARP}">Loom</tspan></text>',
        w=268, h=67, vb="0 0 268 67",
    )


def render(svg_text: str, size: tuple[int, int], page) -> bytes:
    page.set_viewport_size({"width": size[0], "height": size[1]})
    html = (
        "<html><body style='margin:0;background:transparent'>"
        f"<img src='data:image/svg+xml;charset=utf-8,{_q(svg_text)}' "
        f"style='display:block;width:{size[0]}px;height:{size[1]}px'></body></html>"
    )
    page.set_content(html)
    page.wait_for_load_state("load")
    return page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": size[0], "height": size[1]})


def _q(s: str) -> str:
    from urllib.parse import quote
    return quote(s)


def with_browser(fn):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        try:
            return fn(browser.new_page(device_scale_factor=1))
        finally:
            browser.close()


def preview() -> Path:
    from PIL import Image

    def job(page):
        sheet = Image.new("RGBA", (1500, 760), "#FFFFFF")
        icon = Image.open(io.BytesIO(render(app_icon(), (512, 512), page)))
        sheet.alpha_composite(icon, (24, 24))
        for k, s in enumerate([128, 64, 32, 16]):
            im = Image.open(io.BytesIO(render(app_icon(), (s, s), page)))
            sheet.alpha_composite(im, (24 + sum([128, 64, 32, 16][:k]) + 24 * k, 560))
        mono = Image.open(io.BytesIO(render(mono_mark(), (276, 380), page)))
        sheet.alpha_composite(mono, (580, 24))
        dark = Image.new("RGBA", (300, 404), "#1E1E1E")
        dark.alpha_composite(Image.open(io.BytesIO(render(mono_mark("#EDEDED"), (276, 380), page))), (12, 12))
        sheet.alpha_composite(dark, (880, 12))
        for k, s in enumerate([32, 16]):
            im = Image.open(io.BytesIO(render(mono_mark("#000000"), (s * 552 // 760, s), page)))
            sheet.alpha_composite(im, (600 + 60 * k, 470))
        wm = Image.open(io.BytesIO(render(wordmark(), (536, 134), page)))
        sheet.alpha_composite(wm, (580, 560))
        out = HERE / "preview.png"
        sheet.save(out)
        return out

    return with_browser(job)


def mac_icon() -> str:
    """macOS 图标：按 Apple 网格把图标缩到 824 并居中（四周留白）。"""
    inner = app_icon().split("</title>", 1)[1].rsplit("</svg>", 1)[0]
    return svg(f'<g transform="translate(100,100) scale(0.8046875)">{inner}</g>')


def build_all() -> None:
    from PIL import Image

    desktop = ROOT / "frontend" / "desktop"
    masters = {
        "paperloom-icon.svg": app_icon(),
        "paperloom-icon-mac.svg": mac_icon(),
        "paperloom-mark.svg": mono_mark(),
        "paperloom-wordmark.svg": wordmark(),
    }
    for name, text in masters.items():
        (HERE / name).write_text(text, encoding="utf-8")
    # 沿用既有文件名，避免改动引用方
    for dest in (
        ROOT / "frontend" / "web" / "src" / "assets" / "RetainPDF-logo.svg",
        desktop / "svg" / "RetainPDF-logo.svg",
    ):
        dest.write_text(mono_mark(), encoding="utf-8")
    (desktop / "svg" / "mac_RetainPDF.svg").write_text(mac_icon(), encoding="utf-8")
    (ROOT / "resources" / "brand" / "RetainPDF-github.svg").write_text(wordmark(), encoding="utf-8")

    def job(page):
        def png(text: str, w: int, h: int) -> Image.Image:
            return Image.open(io.BytesIO(render(text, (w, h), page))).convert("RGBA")

        icon = png(app_icon(), 1024, 1024)
        icon.save(desktop / "assets" / "RetainPDF-logo.png")
        icon.save(desktop / "build" / "icon.png")
        # Windows ico：每个尺寸单独渲染，小尺寸比缩放更清晰
        ico_sizes = [16, 24, 32, 48, 64, 128, 256]
        frames = [png(app_icon(), n, n) for n in ico_sizes]
        frames[-1].save(desktop / "build" / "icon.ico", format="ICO",
                        sizes=[(n, n) for n in ico_sizes], append_images=frames[:-1])
        iconset = desktop / "build" / "icon.iconset"
        for n in (16, 32, 64, 128, 256, 512):
            png(mac_icon(), n, n).save(iconset / f"icon_{n}x{n}.png")
        for base, n2 in ((16, 32), (32, 64), (128, 256), (256, 512), (512, 1024)):
            png(mac_icon(), n2, n2).save(iconset / f"icon_{base}x{base}@2x.png")
        # macOS 菜单栏模板图：黑色 + alpha
        tray = desktop / "assets" / "tray"
        for n, name in ((16, "trayTemplate.png"), (32, "nina.v@example.com")):
            w = round(n * 552 / 760)
            glyph = png(mono_mark("#000000"), w, n)
            canvas = Image.new("RGBA", (n, n), (0, 0, 0, 0))
            canvas.alpha_composite(glyph, ((n - w) // 2, 0))
            canvas.convert("LA").save(tray / name, format="PNG")

    with_browser(job)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "preview"
    if mode == "preview":
        print(preview())
    elif mode == "all":
        build_all()
        print(preview())
