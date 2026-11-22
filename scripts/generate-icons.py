"""앱 아이콘·시작 화면 생성 (웹 PWA, iPad 홈 화면, Android).

원본: assets/icon/background.png (배경 단색), assets/icon/glyph-white.png (투명 배경의 흰 새싹)
새싹은 GLYPH_COLOR 로 칠해서 쓴다 (흰색은 크림 배경에서 보이지 않음).

실행: python scripts/generate-icons.py   (Pillow 필요)
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "icon"
GLYPH_COLOR = (0x1A, 0x1F, 0x36)  # 앱 글자색 (--fg)

background = Image.open(SRC / "background.png").convert("RGBA")
BG_COLOR = background.getpixel((background.width // 2, background.height // 2))[:3]
white = Image.open(SRC / "glyph-white.png").convert("RGBA")
alpha = white.getchannel("A")


def glyph(color):
    layer = Image.new("RGBA", white.size, color + (0,))
    layer.putalpha(alpha)
    return layer


GLYPH_DARK = glyph(GLYPH_COLOR)
GLYPH_WHITE = glyph((255, 255, 255))


def compose(size, scale=1.0, bg=True, src=GLYPH_DARK, shape="square"):
    """정사각 아이콘. scale: 원본 1024 캔버스 대비 새싹 확대 비율(원본 새싹 높이는 캔버스의 약 48%)."""
    canvas = Image.new("RGBA", (size, size), (BG_COLOR + (255,)) if bg else (0, 0, 0, 0))
    g = src.resize((round(size * scale), round(size * scale)), Image.LANCZOS)
    off = (size - g.width) // 2
    canvas.alpha_composite(g, (off, off))
    if shape == "circle":
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
        canvas.putalpha(mask.resize((size, size), Image.LANCZOS))
    elif shape == "rounded":
        mask = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), radius=size * 4 // 5, fill=255)
        canvas.putalpha(mask.resize((size, size), Image.LANCZOS))
    return canvas


def splash(w, h):
    canvas = Image.new("RGBA", (w, h), BG_COLOR + (255,))
    side = round(min(w, h) * 0.55)  # 새싹이 짧은 변의 약 26%
    g = GLYPH_DARK.resize((side, side), Image.LANCZOS)
    canvas.alpha_composite(g, ((w - side) // 2, (h - side) // 2))
    return canvas.convert("RGB")


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    print("  ", path.relative_to(ROOT), img.size)


# ── 웹 (PWA, iPad 홈 화면, 브라우저 탭) ──
pub = ROOT / "public"
save(compose(192, scale=1.25), pub / "pwa-192x192.png")
save(compose(512, scale=1.25), pub / "pwa-512x512.png")
save(compose(512, scale=1.0), pub / "pwa-maskable-512x512.png")  # 안전 영역(80%) 안에 들어가도록
save(compose(180, scale=1.25).convert("RGB"), pub / "apple-touch-icon.png")
save(compose(64, scale=1.35, shape="rounded"), pub / "favicon.png")

# ── Android ──
res = ROOT / "android" / "app" / "src" / "main" / "res"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, d in DENSITIES.items():
    launcher = round(48 * d)
    layer = round(108 * d)  # 적응형 아이콘 레이어 (안전 영역 66dp 안에 새싹이 들어감)
    save(compose(launcher, scale=1.25, shape="rounded"), res / f"mipmap-{name}" / "ic_launcher.png")
    save(compose(launcher, scale=1.25, shape="circle"), res / f"mipmap-{name}" / "ic_launcher_round.png")
    save(compose(layer, bg=False), res / f"mipmap-{name}" / "ic_launcher_foreground.png")
    save(compose(layer, bg=False, src=GLYPH_WHITE), res / f"mipmap-{name}" / "ic_launcher_monochrome.png")

SPLASH = {
    "drawable": (480, 320),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
}
for folder, (w, h) in SPLASH.items():
    save(splash(w, h), res / folder / "splash.png")

print("배경색", "#%02X%02X%02X" % BG_COLOR)
