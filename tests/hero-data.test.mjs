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
  assert.match(SRC, /var lift = exiting && !\(aborted && aborted\.late\) \? 22 \* exitK : 0;/);
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
