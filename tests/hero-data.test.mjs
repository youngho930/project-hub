// data 인트로(public/hero-data.js) 테스트. 실행: node --conditions=react-server --import ./tests/setup.mjs --test "tests/*.test.mjs"
// 실제 아이폰(앱 안 브라우저) 첫 방문에서 연출 중 화면 높이가 바뀌어, 100vh 로 늘려 보이던 캔버스가 세로로 눌리고
// 연출 숫자가 진짜 카드보다 약 60px 위에 그려졌던 일을 다시 만들지 않는지 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = fs.readFileSync(path.join(ROOT, "public/hero-data.js"), "utf8");

// 판정 함수만 쓰는 작은 가짜 브라우저 (document.body 가 없어 연출은 시작하지 않음)
function load({ innerWidth = 390, innerHeight = 844, vv = null } = {}) {
  const win = {
    innerWidth, innerHeight, visualViewport: vv,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    document: { body: null, documentElement: { classList: { contains: () => false } }, addEventListener() {}, querySelectorAll: () => [] },
  };
  win.window = win;
  vm.runInNewContext(SRC, win);
  return win.HubDataIntro;
}
const card = (y, h = 30) => ({ x: 33, y, w: 104, h });

test("카드가 다 보이는지는 실제로 보이는 영역(visualViewport) 기준", () => {
  const rects = [card(628), card(680), card(732)]; // 마지막 카드 아래 끝 762
  assert.equal(load({ vv: { offsetTop: 0, offsetLeft: 0, width: 390, height: 844 } }).cardsFit(rects), true);
  // 창 높이는 844 여도 도구 막대가 나타나 보이는 영역이 764 면 마지막 카드가 가려짐 → 카드에 맞추지 않음
  assert.equal(load({ innerHeight: 844, vv: { offsetTop: 0, offsetLeft: 0, width: 390, height: 764 } }).cardsFit(rects), false);
  // 확대로 보이는 영역이 아래로 옮겨 가 첫 카드 위가 잘림
  assert.equal(load({ vv: { offsetTop: 640, offsetLeft: 0, width: 390, height: 300 } }).cardsFit(rects), false);
  // visualViewport 가 없으면 창 크기
  assert.equal(load({ innerHeight: 760 }).cardsFit(rects), false);
  assert.equal(load({ innerHeight: 800 }).cardsFit(rects), true);
  assert.equal(load().cardsFit(rects.slice(0, 2)), false, "카드가 셋이 아니면 맞추지 않음");
});

test("위치 차이는 가로·세로 위치와 크기 중 가장 많이 달라진 값", () => {
  const H = load();
  assert.equal(H.maxDiff([card(628)], [card(628)]), 0);
  assert.equal(H.maxDiff([card(628), card(680)], [card(628), card(740)]), 60);
  assert.equal(H.maxDiff([{ x: 33, y: 628, w: 104, h: 30 }], [{ x: 34.5, y: 628, w: 104, h: 30 }]), 1.5);
  assert.equal(H.maxDiff([{ x: 33, y: 628, w: 104, h: 30 }], [{ x: 33, y: 628, w: 104, h: 36 }]), 6);
});

test("캔버스는 px 크기로 그리고, 화면 크기가 바뀌면 그 크기로 다시 만든다 (100vw·100vh 로 늘리지 않음)", () => {
  assert.ok(!/100vh|100vw|inset:0/.test(SRC.match(/canvas\.style\.cssText = "[^"]*"/)[0]), "캔버스를 화면 단위로 늘리지 않음");
  assert.match(SRC, /canvas\.style\.width = w \+ "px"/);
  assert.match(SRC, /canvas\.style\.height = h \+ "px"/);
  assert.match(SRC, /addEventListener\("resize", onViewport\)/);
  assert.match(SRC, /visualViewport\.addEventListener\("resize", onViewport\)/);
  assert.match(SRC, /removeEventListener\("resize", onViewport\)/, "끝나면 정리");
});

test("숫자 자리는 모이기 직전(0.36초)·완성 직전(1.25초)·페이지가 밀릴 때 다시 확인하고, 2px 넘게 다르면 카드에 맞추지 않음", () => {
  assert.match(SRC, /t >= 0\.36\) \{ checkedGather = true; evaluate\(t, "gather"\)/);
  assert.match(SRC, /t >= 1\.25\) \{/);
  assert.match(SRC, /new ResizeObserver\(/, "본문 크기 변화(페이지 밀림) 감지");
  assert.match(SRC, /if \(layoutDirty\) \{ layoutDirty = false; evaluate\(t, "layout"\); \}/);
  assert.match(SRC, /ro\.disconnect\(\)/);
  assert.match(SRC, /var TOL = 2;/);
  assert.match(SRC, /if \(mis <= TOL\) return;/);
  // 맞춤 취소: 걷히기 전이면 숫자가 먼저 사라진 뒤 덮개가 걷히고, 걷히는 중이면 움직이지 않고 바로 감춤
  assert.match(SRC, /revealAt = startAt \+ dur \+ 0\.02;/);
  assert.match(SRC, /dur = late \? 0\.001 : CENTER_EXIT/);
  assert.match(SRC, /return exiting && !\(aborted && aborted\.late\) \? 22 \* exitK\(t\) : 0;/);
});

test("글꼴 준비를 기다리고(document.fonts.ready, 최대 0.5초), 사이트 글꼴(목록 첫 번째)만 확인", () => {
  assert.match(SRC, /document\.fonts\.ready\.then\(once, once\)/);
  assert.match(SRC, /setTimeout\(once, 500\)/);
  assert.match(SRC, /cs\.fontFamily\.split\(","\)\[0\]/);
});

test("?intro&debug 기록: 맞춤 방식, 처음↔마지막 위치 차이, 연출 중 화면 높이", () => {
  assert.match(SRC, /"카드에 맞춤"/);
  assert.match(SRC, /"카드 맞춤 취소\(숫자 먼저 사라짐\)"/);
  assert.match(SRC, /"가운데 모음"/);
  assert.match(SRC, /처음↔마지막 위치 차이 /);
  assert.match(SRC, /화면 높이 " \+ \(a\.vh \|\| \[\]\)\.join\("→"\)/);
  assert.match(SRC, /logEvent\("화면 높이 " \+ h \+ "→" \+ nh \+ "px"\)/);
});

/* ===== 사파리 마지막 구간 멈춤·아래 잘림 ===== */
test("글자 점 고르기: 읽은 픽셀에 잡음이 섞여도 빈 곳에 점이 생기지 않고 획 안은 그대로", () => {
  const H = load();
  const cw = 40, ch = 20, data = new Uint8ClampedArray(cw * ch * 4);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const inside = x >= 10 && x < 30 && y >= 5 && y < 15; // 가운데 직사각형 = 글자 획
    const noise = Math.round((rnd() - 0.5) * 60); // ±30 잡음 (추적 방지가 섞는 잡음보다 넉넉히 큼)
    data[(y * cw + x) * 4 + 3] = Math.max(0, Math.min(255, (inside ? 255 : 0) + noise));
  }
  // 빈 곳 몇 칸을 외톨이로 밝게 (잡음 튐)
  for (const [x, y] of [[3, 3], [36, 17], [5, 16]]) data[(y * cw + x) * 4 + 3] = 200;
  const pts = H.pickPoints(data, cw, ch, 2);
  assert.ok(pts.length / 2 >= 40, "획 안의 점이 충분함: " + pts.length / 2);
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], y = pts[i + 1];
    assert.ok(x >= 9 && x <= 31 && y >= 4 && y <= 16, `빈 곳에 점: ${x},${y}`);
  }
});

test("매 프레임 그리는 그림은 GPU 캔버스로 옮겨 쓰고, CPU 캔버스는 한 번 그리거나 읽는 데만", () => {
  assert.equal((SRC.match(/willReadFrequently: true/g) || []).length, 3, "글자 점 읽기·빛 번짐·조각 그림 세 곳만");
  assert.match(SRC, /function toGpu\(src\)/);
  assert.match(SRC, /return \{ img: toGpu\(c\), x: bx\.x - pad/, "빛 번짐은 GPU 로 옮김");
  assert.match(SRC, /return \{ img: toGpu\(c\), w: w, h: h \};/, "업무 조각은 GPU 로 옮김");
  assert.ok(!/makeTextSprite|cur\.text\[/.test(SRC), "완성 글자를 캔버스로 그리지 않음");
});

test("완성된 숫자는 실제 카드와 같은 계산된 스타일의 HTML 글자로, opacity·transform 으로만 움직임", () => {
  assert.match(SRC, /es\.backgroundImage = cs && cs\.backgroundImage !== "none" \? cs\.backgroundImage/);
  assert.match(SRC, /es\.fontVariantNumeric = cs \? cs\.fontVariantNumeric/);
  assert.match(SRC, /numEls\[k\]\.style\.opacity = String\(textA\)/);
  assert.match(SRC, /numEls\[k\]\.style\.transform = lift \? "translate3d\(0," \+ lift \+ "px,0\)" : "none"/);
});

test("덮개 걷힘 구간은 캔버스를 다시 그리지 않고 투명도만 바꿈", () => {
  assert.match(SRC, /if \(ready && t >= revealAt\) \{\s*if \(!stillDrawn\) \{/);
  assert.match(SRC, /if \(begun\) setLayer\(bgA\);/);
  assert.match(SRC, /canvas\.style\.opacity = backdrop\.style\.opacity = String\(a\)/);
});

test("덮개 바탕은 사파리 도구 막대 아래까지(100lvh) 덮음", () => {
  assert.match(SRC, /height:calc\(100lvh \+ env\(safe-area-inset-bottom,0px\)\)/);
  const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
  assert.match(css, /html\.hub-data\.hub-cover body::before \{\s*bottom: auto;\s*height: calc\(100vh \+ env\(safe-area-inset-bottom, 0px\)\);\s*height: calc\(100lvh \+ env\(safe-area-inset-bottom, 0px\)\);/);
});

test("?intro&debug 에 구간별(흩어짐/모임/완성·빛남/덮개 걷힘) 프레임 간격·그리기 시간", () => {
  assert.match(SRC, /var SEG_NAMES = \["흩어짐", "모임", "완성·빛남", "덮개 걷힘"\];/);
  assert.match(SRC, /간격 평균 " \+ Math\.round\(g\.sum \/ g\.n\) \+ "\/최대 "/);
  assert.match(SRC, /그리기 평균 "/);
  assert.match(SRC, /window\.__hubIntroLog\.seg = segLines\(\)/);
  const arrival = fs.readFileSync(path.join(ROOT, "lib/arrival-script.js"), "utf8");
  assert.ok(arrival.includes(String.raw`(L.seg?"\\n"+L.seg.join("\\n"):"")`), "debug 표시에 구간 기록");
});
