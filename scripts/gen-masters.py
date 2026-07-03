#!/usr/bin/env python3
"""명화 팩 생성 — 퍼블릭 도메인 명화(작가 사후 70년 경과)를 위키미디어 공용에서 받아
아트온 도안 2종을 합성한다(캔버스 1536×1152 가로 4:3, contain-fit).

  masters_trace_*.webp   따라 그리기: 원본을 옅게(20%) 깔아 위에 덧그리는 밑그림
  masters_quarter_*.webp 1/4 완성하기: 좌상단 1/4은 원본 그대로 + 나머지는 옅게 + 십자 가이드

라이선스: 전 작품 작가 사후 70년 경과(한국 저작권법 기준 만료). 원본 사진은
위키미디어 공용 PD 스캔(평면 회화의 충실 복제 = 신규 저작권 불인정).
출처는 public/templates/masters/SOURCES.md 에 기록된다.

사용: python3 scripts/gen-masters.py [--work <임시폴더>]
재실행 안전(이미 받은 원본은 재사용, 출력은 덮어씀). manifest.json 갱신까지 수행.
"""

import io
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "templates" / "masters"
MANIFEST = ROOT / "public" / "templates" / "manifest.json"

W, H = 1536, 1152  # 아트온 가로 캔버스와 동일(도안은 loadLineart가 contain-fit)
TRACE_ALPHA = 0.20  # 따라 그리기 밑그림 농도
FAINT_ALPHA = 0.16  # 1/4 완성하기의 미완성 영역 농도
GUIDE_GRAY = 205

# (slug, 한국어 제목, 작가, 사망년, 위키미디어 파일명)
PAINTINGS = [
    ("starry_night", "별이 빛나는 밤", "빈센트 반 고흐", 1890, "Van Gogh - Starry Night - Google Art Project.jpg"),
    ("bedroom", "아를의 침실", "빈센트 반 고흐", 1890, "Vincent van Gogh - De slaapkamer - Google Art Project.jpg"),
    ("great_wave", "가나가와 해변의 큰 파도", "가쓰시카 호쿠사이", 1849, "Tsunami by hokusai 19th century.jpg"),
    ("sunrise", "인상, 해돋이", "클로드 모네", 1926, "Monet - Impression, Sunrise.jpg"),
    ("water_lilies", "수련", "클로드 모네", 1926, "Claude Monet - Water Lilies - 1906, Ryerson.jpg"),
    ("grande_jatte", "그랑드 자트 섬의 일요일 오후", "조르주 쇠라", 1891, "A Sunday on La Grande Jatte, Georges Seurat, 1884.jpg"),
    ("scream", "절규", "에드바르 뭉크", 1944, "The Scream.jpg"),
    ("mondrian", "빨강·파랑·노랑의 구성", "피트 몬드리안", 1944, "Piet Mondriaan, 1930 - Mondrian Composition II in Red, Blue, and Yellow.jpg"),
    ("ssireum", "씨름", "김홍도", 1806, "Danwon-Ssireum.jpg"),
    ("seodang", "서당", "김홍도", 1806, "Danwon-Seodang.jpg"),
]


def download(name: str, dest: Path) -> bool:
    """위키미디어 Special:FilePath — 원본 리다이렉트(폭 1600 축소본)."""
    if dest.exists() and dest.stat().st_size > 50_000:
        return True
    url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + name.replace(" ", "_") + "?width=1600"
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "120", "-A", "ArtON-edu/1.0 (classroom art app; PD sources)", "-o", str(dest), url],
        capture_output=True,
    )
    if r.returncode != 0 or not dest.exists() or dest.stat().st_size < 50_000:
        return False
    try:
        Image.open(dest).verify()
        return True
    except Exception:
        dest.unlink(missing_ok=True)
        return False


def fit_on_canvas(img: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    """흰 캔버스(1536×1152)에 contain-fit. 배치 rect(x0,y0,x1,y1) 반환."""
    img = img.convert("RGB")
    scale = min(W / img.width, H / img.height)
    dw, dh = round(img.width * scale), round(img.height * scale)
    fitted = img.resize((dw, dh), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), "white")
    x0, y0 = (W - dw) // 2, (H - dh) // 2
    canvas.paste(fitted, (x0, y0))
    return canvas, (x0, y0, x0 + dw, y0 + dh)


def faint(canvas: Image.Image, alpha: float) -> Image.Image:
    white = Image.new("RGB", canvas.size, "white")
    return Image.blend(white, canvas, alpha)


def save_webp(img: Image.Image, path: Path) -> None:
    img.save(path, "WEBP", quality=84, method=4)


def main() -> None:
    work = Path(sys.argv[sys.argv.index("--work") + 1]) if "--work" in sys.argv else ROOT / ".masters-work"
    work.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    ok_list = []
    for slug, title, artist, died, fname in PAINTINGS:
        src = work / f"{slug}.img"
        if not download(fname, src):
            print(f"skip (다운로드 실패): {slug} — {fname}", file=sys.stderr)
            continue
        canvas, rect = fit_on_canvas(Image.open(src))

        # 따라 그리기: 전체 옅게
        save_webp(faint(canvas, TRACE_ALPHA), OUT_DIR / f"masters_trace_{slug}.webp")

        # 1/4 완성하기: 옅은 전체 + 좌상단 1/4 원본 + 십자 가이드(그림 rect 기준)
        q = faint(canvas, FAINT_ALPHA)
        x0, y0, x1, y1 = rect
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        q.paste(canvas.crop((x0, y0, cx, cy)), (x0, y0))
        d = ImageDraw.Draw(q)
        g = (GUIDE_GRAY,) * 3
        d.line([(x0, cy), (x1, cy)], fill=g, width=3)
        d.line([(cx, y0), (cx, y1)], fill=g, width=3)
        save_webp(q, OUT_DIR / f"masters_quarter_{slug}.webp")

        ok_list.append((slug, title, artist, died, fname))
        print(f"ok: {slug} ({title})")

    if not ok_list:
        sys.exit("생성된 명화가 없습니다")

    # ── SOURCES.md (출처·라이선스 기록) ──
    lines = [
        "# 명화 팩 출처 (전부 퍼블릭 도메인)\n",
        "모든 작품은 작가 사후 70년이 지나 한국 저작권법상 보호기간이 만료되었습니다.",
        "원본 이미지는 위키미디어 공용의 PD 스캔(평면 회화의 충실한 복제)입니다.\n",
        "| 파일 | 작품 | 작가(사망년) | 원본 |",
        "|---|---|---|---|",
    ]
    for slug, title, artist, died, fname in ok_list:
        url = "https://commons.wikimedia.org/wiki/File:" + fname.replace(" ", "_")
        lines.append(f"| masters_*_{slug}.webp | {title} | {artist}(†{died}) | {url} |")
    (OUT_DIR / "SOURCES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # ── manifest.json 갱신(멱등: masters 항목은 매번 재구성) ──
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    m["categories"] = [c for c in m["categories"] if c["id"] != "masters"]
    m["categories"].append({
        "id": "masters",
        "title": "명화",
        "emoji": "🖼️",
        "themes": ["masters_trace", "masters_quarter"],
        "partial": True,
    })
    trace_items = [
        {"id": f"masters_trace_{slug}", "title": f"{title} 따라 그리기", "grade": "high",
         "image": f"/templates/masters/masters_trace_{slug}.webp"}
        for slug, title, *_ in ok_list
    ]
    quarter_items = [
        {"id": f"masters_quarter_{slug}", "title": f"{title} 1/4 완성하기", "grade": "mid",
         "image": f"/templates/masters/masters_quarter_{slug}.webp"}
        for slug, title, *_ in ok_list
    ]
    m["themes"]["masters_trace"] = {
        "theme": "masters_trace", "title": "명화 따라 그리기", "category": "masters",
        "count": len(trace_items), "cover": trace_items[0]["image"], "items": trace_items,
    }
    m["themes"]["masters_quarter"] = {
        "theme": "masters_quarter", "title": "명화 1/4 완성하기", "category": "masters",
        "count": len(quarter_items), "cover": quarter_items[0]["image"], "items": quarter_items,
    }
    MANIFEST.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n완료: {len(ok_list)}점 × 2종, manifest 갱신")


if __name__ == "__main__":
    main()
