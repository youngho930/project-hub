/*
 * 첫 방문 "data" 도착 연출 (React 와 무관한 작은 스크립트, 이미지 파일 없이 canvas 로 그림).
 * 흩어진 데이터 조각(점·작은 숫자·표 칸)이 사이트의 성과 숫자 "30초 · 8배 · 6개월+" 로 모인다
 * — 현장의 흩어진 반복 업무를 정리해서 성과로 만든다.
 *
 * - app/layout.js 의 <head> 스크립트(lib/arrival-script.js)가 <html class="hub-intro hub-cover hub-data"> 를 붙이고
 *   (CSS 덮개: 어두운 보라 바탕에 데이터 조각이 천천히 떠다니는 대기 모습, globals.css) 이 파일을 async 로 불러옴
 * - 장면 (초): 0~0.4 조각이 흩어져 떠다님 → 0.4~1.1 세 무리로 빨려 들어가 숫자 글자 모양 → 1.1~1.3 짧게 빛나며 맞춰짐
 *   → 1.3~1.7 덮개가 걷힘 (1.3 에 소개 문구가 떠오르기 시작)
 * - 넓은 화면에서 숫자 카드 세 개가 첫 화면 안에 다 보이면, 모이는 위치·글자 크기·금색 그라데이션을 실제 카드 숫자
 *   ([data-hub-stats] 안의 .count-up, getBoundingClientRect)와 똑같이 맞춰 연출 속 숫자가 그대로 진짜 카드가 됨.
 *   카드가 첫 화면 밖이면(휴대폰) 화면 가운데에 세 숫자를 모은 뒤 걷힘
 * - 글자 모양: 사이트 글꼴로 글자를 작은 캔버스에 한 번 그려 점 위치를 뽑음 (매 프레임 다시 계산하지 않음)
 * - 워프(public/hero-intro.js)와 같은 기준: 첫 방문에만, 클릭·탭·키로 즉시 건너뛰기("건너뛰기" 표시는 CSS),
 *   움직임 줄이기면 생략, 페이지를 연 지 2.6초 넘어 시작하게 되면 생략, 처음 10프레임 중앙값이 느리면 조각을 줄임,
 *   이유는 window.__hubIntroLog, 프레임 기록은 window.__hubIntroStats
 * - 그리기 (프레임당): 바탕(미리 그린 보라 바탕 한 장) → 색·밝기별로 묶은 점들(묶음마다 fill 한 번)
 *   → 작은 숫자·표 칸 그림(미리 그린 작은 그림) → 빛 번짐·완성 글자(미리 그린 그림)
 */
(function () {
  "use strict";
  if (window.HubDataIntro) return;

  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  function logReason(reason, detail) {
    if (window.__hubIntroLogReason) window.__hubIntroLogReason(reason, detail);
  }
  function logEvent(text) {
    var L = window.__hubIntroLog;
    if (L && L.events.length < 8) L.events.push(Math.round(performance.now()) + "ms " + text);
  }

  // 숫자 카드의 금색 (app/page.js: bg-gradient-to-br from-amber-200 to-amber-500 bg-clip-text)
  var GOLD_HI = [253, 230, 138];
  var GOLD_LO = [245, 158, 11];
  // 흩어진 조각의 색: 연보라·하늘빛 (사이트 보라 계열)
  var LILAC = [196, 181, 253];
  var BG = [13, 11, 26]; // 덮개 바탕 (globals.css 의 html.hub-data 덮개와 같은 색)
  var VIOLET = [139, 92, 246];
  var FALLBACK = ["30초", "8배", "6개월+"];

  var T_GATHER = 0.4; // 모이기 시작
  var T_FORM = 1.1; // 숫자 완성
  var T_REVEAL = 1.3; // 덮개가 걷히기 시작
  var T_END = 1.7; // 다 걷힘
  var SHADES = 4; // 금색 단계 (글자 안 위치에 따라 밝은 금 → 진한 금)
  var LEVELS = 5; // 모인 정도 단계 (연보라 → 금)

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function mix(a, b, k) {
    return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)];
  }
  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  function bell(t, a, peak, b) {
    if (t <= a || t >= b) return 0;
    return t < peak ? Math.sin(((t - a) / (peak - a)) * Math.PI / 2) : Math.cos(((t - peak) / (b - peak)) * Math.PI / 2);
  }
  // 천천히 출발 → 빨려 들어가듯 빨라짐 → 도착 직전 부드럽게 멈춤
  function suck(p) {
    return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
  function smooth(p) {
    return p * p * (3 - 2 * p);
  }

  function budget(w, h) {
    var slow = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    var k = slow ? 0.6 : 1;
    return {
      slow: slow,
      points: Math.round((w < 640 ? 760 : 1100) * k), // 글자를 이루는 점 최대 개수
      ambient: Math.round((w < 640 ? 90 : 160) * k), // 글자에 들지 않고 빨려 들어가 사라지는 점
      digits: Math.round((w < 640 ? 9 : 14) * k), // 작은 숫자
      cells: Math.round((w < 640 ? 8 : 12) * k), // 표 칸
      checks: Math.round((w < 640 ? 5 : 8) * k), // 체크 표시
      bars: Math.round((w < 640 ? 6 : 10) * k), // 짧은 막대
      frags: w < 640 ? 10 : 15, // 점으로 된 표 조각 무리
      dpr: Math.min(devicePixelRatio || 1, w < 640 ? 1.5 : 1.25),
    };
  }

  // 글자를 그리는 글꼴 정보 (실제 카드 숫자의 계산된 스타일)
  function fontOf(el, sizeOverride) {
    var cs = getComputedStyle(el);
    var size = sizeOverride || parseFloat(cs.fontSize) || 48;
    var ls = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
    if (sizeOverride) ls = (ls / (parseFloat(cs.fontSize) || size)) * size; // em 비율 유지
    return { css: (cs.fontWeight || "700") + " " + size + "px " + cs.fontFamily, size: size, ls: ls };
  }
  // 글자 사이 간격(letter-spacing)을 넣어 한 글자씩 그림 (canvas letterSpacing 이 없는 브라우저도 같게)
  function textWidth(ctx, text, ls) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + ls;
    return w;
  }
  function fillText(ctx, text, x, y, ls) {
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + ls;
    }
  }
  // CSS "to bottom right" 그라데이션 선 (상자 w×h): 대각선(왼쪽 아래→오른쪽 위)에 수직, 길이 2wh/√(w²+h²)
  function brGradient(ctx, x, y, w, h) {
    var n = Math.hypot(w, h) || 1, dx = h / n, dy = w / n, L = (2 * w * h) / n;
    var cx = x + w / 2, cy = y + h / 2;
    var g = ctx.createLinearGradient(cx - (dx * L) / 2, cy - (dy * L) / 2, cx + (dx * L) / 2, cy + (dy * L) / 2);
    g.addColorStop(0, rgba(GOLD_HI, 1));
    g.addColorStop(1, rgba(GOLD_LO, 1));
    return g;
  }
  // 상자 안 위치 → 금색 단계 (같은 그라데이션 선 위의 위치)
  function shadeAt(px, py, box) {
    var n = Math.hypot(box.w, box.h) || 1, dx = box.h / n, dy = box.w / n, L = (2 * box.w * box.h) / n;
    var s = ((px - box.x - box.w / 2) * dx + (py - box.y - box.h / 2) * dy) / L + 0.5;
    return Math.max(0, Math.min(SHADES - 1, Math.floor(s * SHADES)));
  }

  // 실제로 보이는 영역: visualViewport (앱 안 브라우저의 도구 막대·확대를 뺀 영역). 없으면 창 크기
  function visibleArea() {
    var vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, left: vv.offsetLeft, w: vv.width, h: vv.height } : { top: 0, left: 0, w: innerWidth, h: innerHeight };
  }
  function statEls() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-hub-stats] .count-up"), 0, 3);
  }
  function rectsOf(els) {
    return els.map(function (el) { var r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  }
  // 두 위치 목록의 가장 큰 차이(px): 가로·세로 위치와 크기 중 가장 많이 달라진 값
  function maxDiff(a, b) {
    var d = 0;
    for (var i = 0; i < Math.min(a.length, b.length); i++) {
      d = Math.max(d, Math.abs(a[i].x - b[i].x), Math.abs(a[i].y - b[i].y), Math.abs(a[i].w - b[i].w), Math.abs(a[i].h - b[i].h));
    }
    return Math.round(d * 10) / 10;
  }
  // 세 카드가 보이는 영역 안에 다 들어오는지
  function cardsFit(rects) {
    if (rects.length !== 3) return false;
    var va = visibleArea();
    for (var i = 0; i < 3; i++) {
      var r = rects[i];
      if (r.w < 4 || r.y < va.top || r.y + r.h > va.top + va.h - 4 || r.x < va.left || r.x + r.w > va.left + va.w) return false;
    }
    return true;
  }

  // 카드 자리(match): 세 카드가 보이는 영역 안에 다 있으면 카드 숫자 자리·글꼴 그대로, 아니면 null
  function matchLayout(measure) {
    var els = statEls();
    if (!cardsFit(rectsOf(els))) return null;
    return els.map(function (el, i) {
      var rect = el.getBoundingClientRect(), f = fontOf(el);
      measure.font = f.css;
      var m = measure.measureText("0");
      var asc = m.fontBoundingBoxAscent || f.size * 0.95, desc = m.fontBoundingBoxDescent || f.size * 0.25;
      // CSS 줄 상자: 글꼴 높이(ascent+descent)를 줄 높이 가운데에 두고 위아래로 반씩 여백 → 기준선
      return {
        text: (el.textContent || FALLBACK[i]).trim(),
        font: f,
        x: rect.left,
        baseline: rect.top + (rect.height - (asc + desc)) / 2 + asc,
        box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
      };
    });
  }
  // 가운데(center): 보이는 영역 가운데에. 한 줄에 들어가면 가로로(사이는 글자 크기의 0.7), 아니면 줄여서
  function centerLayout(w, measure) {
    var els = statEls(), items = [], i;
    var texts = els.length === 3 ? els.map(function (e) { return (e.textContent || "").trim(); }) : FALLBACK;
    var ref = els[0] || document.body;
    var va = visibleArea();
    var size = Math.min(72, Math.max(34, w * 0.13));
    var f0 = fontOf(ref, size);
    measure.font = f0.css;
    var widths = texts.map(function (t) { return textWidth(measure, t, f0.ls); });
    var gap = size * 0.7, total = widths[0] + widths[1] + widths[2] + gap * 2;
    if (total > w * 0.88) {
      size = Math.min(size, (w * 0.88 * size) / total);
      f0 = fontOf(ref, size);
      measure.font = f0.css;
      widths = texts.map(function (t) { return textWidth(measure, t, f0.ls); });
      gap = size * 0.7;
      total = widths[0] + widths[1] + widths[2] + gap * 2;
    }
    var mm = measure.measureText("0");
    var a0 = mm.fontBoundingBoxAscent || size * 0.95, d0 = mm.fontBoundingBoxDescent || size * 0.25;
    var x = (w - total) / 2, base = va.top + va.h / 2 + (a0 - d0) / 2;
    for (i = 0; i < 3; i++) {
      items.push({ text: texts[i], font: f0, x: x, baseline: base, box: { x: x, y: base - a0, w: widths[i], h: a0 + d0 } });
      x += widths[i] + gap;
    }
    return items;
  }

  // 글자 모양의 점 위치를 한 번만 뽑음: 작은 캔버스에 글자를 그리고 step 간격 격자에서 칠해진 곳만
  function sample(item, step) {
    var f = item.font, pad = Math.ceil(f.size * 0.2);
    var c = document.createElement("canvas");
    var g = c.getContext("2d", { willReadFrequently: true });
    g.font = f.css;
    var tw = Math.ceil(textWidth(g, item.text, f.ls));
    var asc = Math.ceil(item.baseline - item.box.y), desc = Math.ceil(item.box.y + item.box.h - item.baseline);
    c.width = tw + pad * 2;
    c.height = asc + desc + pad * 2;
    g.font = f.css;
    g.textBaseline = "alphabetic";
    g.fillStyle = "#fff";
    fillText(g, item.text, pad, pad + asc, f.ls);
    var data = g.getImageData(0, 0, c.width, c.height).data;
    var pts = [];
    for (var y = step / 2; y < c.height; y += step) {
      for (var x = step / 2; x < c.width; x += step) {
        if (data[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] > 120) {
          pts.push(item.x - pad + x, item.baseline - asc - pad + y);
        }
      }
    }
    c.width = c.height = 0;
    return pts;
  }

  // 완성 글자(금색 그라데이션)와 빛 번짐을 미리 그려 둠 — 실제 카드 숫자와 같은 글꼴·위치·색
  function makeTextSprite(item, dpr, glow) {
    var f = item.font, pad = glow ? Math.ceil(f.size * 0.6) : 4;
    var bx = item.box;
    var c = document.createElement("canvas");
    c.width = Math.ceil((bx.w + pad * 2) * dpr);
    c.height = Math.ceil((bx.h + pad * 2) * dpr);
    // CPU 로 그리는 캔버스: 한 번만 그리는 그림이라 느리지 않고, GPU 캔버스에서 가끔 글자 획이 뭉개지던 일을 피함
    var g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(pad - bx.x, pad - bx.y);
    g.font = f.css;
    g.textBaseline = "alphabetic";
    if (glow) {
      g.shadowColor = rgba(GOLD_LO, 0.9);
      g.shadowBlur = f.size * 0.45;
      g.fillStyle = rgba(GOLD_HI, 0.9);
      fillText(g, item.text, item.x, item.baseline, f.ls);
      g.shadowBlur = f.size * 0.18;
      g.shadowColor = "rgba(255,248,220,1)";
      g.fillStyle = "rgba(255,250,235,1)";
    } else {
      g.fillStyle = brGradient(g, bx.x, bx.y, bx.w, bx.h);
    }
    fillText(g, item.text, item.x, item.baseline, f.ls);
    return { img: c, x: bx.x - pad, y: bx.y - pad, w: c.width / dpr, h: c.height / dpr };
  }

  function makeBackground(w, h) {
    // 덮개와 같은 바탕: 어두운 보라 + 오른쪽 위 보라 번짐 + 왼쪽 아래 금빛 살짝 + 가장자리 어둡게 (절반 크기로 그려 늘려 씀)
    var c = document.createElement("canvas");
    c.width = Math.ceil(w / 2);
    c.height = Math.ceil(h / 2);
    var g = c.getContext("2d");
    g.setTransform(0.5, 0, 0, 0.5, 0, 0);
    g.fillStyle = rgba(BG, 1);
    g.fillRect(0, 0, w, h);
    var M = Math.max(w, h);
    var v = g.createRadialGradient(w * 0.85, h * 0.1, 0, w * 0.85, h * 0.1, M * 0.65);
    v.addColorStop(0, rgba(VIOLET, 0.26));
    v.addColorStop(1, rgba(VIOLET, 0));
    g.fillStyle = v;
    g.fillRect(0, 0, w, h);
    var a = g.createRadialGradient(w * 0.1, h * 0.95, 0, w * 0.1, h * 0.95, M * 0.5);
    a.addColorStop(0, rgba(GOLD_LO, 0.08));
    a.addColorStop(1, rgba(GOLD_LO, 0));
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    var vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    return c;
  }

  // 업무 데이터 조각 그림 (연보라, 미리 그려 drawImage 로만 씀): 작은 숫자, 표 칸, 체크 표시, 짧은 막대.
  // 숫자·기호는 캔버스에 시스템 고정폭 글꼴이나 선으로 직접 그림 — 사이트 부분 글꼴에 글자를 더하지 않음
  function sprite(dpr, w, h, paint) {
    var c = document.createElement("canvas");
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    var g = c.getContext("2d", { willReadFrequently: true }); // 한 번만 그리는 작은 그림은 CPU 캔버스로 (완성 글자 그림과 같은 이유)
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.strokeStyle = rgba(LILAC, 0.9);
    g.fillStyle = rgba(LILAC, 0.18);
    g.lineWidth = 1.2;
    g.lineJoin = g.lineCap = "round";
    paint(g);
    return { img: c, w: w, h: h };
  }
  function makeShardSprites(dpr) {
    var NUMS = ["7", "12", "30", "8", "1.5", "42", "06", "3", "250", "9"];
    var digits = NUMS.map(function (txt) {
      var tw = 7 * txt.length + 6;
      return sprite(dpr, tw, 16, function (g) {
        g.font = "600 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = rgba(LILAC, 0.95);
        g.fillText(txt, tw / 2, 8.5);
      });
    });
    // 표 칸: [열, 행, 칸 폭, 칸 높이]
    var cells = [[3, 2, 9, 6], [2, 2, 11, 6], [4, 1, 8, 7], [2, 3, 10, 5]].map(function (c) {
      var cols = c[0], rows = c[1], cw = c[2], ch = c[3];
      return sprite(dpr, cols * cw + 2, rows * ch + 2, function (g) {
        g.fillRect(1, 1, cols * cw, ch); // 머리 행은 살짝 칠함
        g.beginPath();
        for (var x = 0; x <= cols; x++) { g.moveTo(1 + x * cw, 1); g.lineTo(1 + x * cw, 1 + rows * ch); }
        for (var y = 0; y <= rows; y++) { g.moveTo(1, 1 + y * ch); g.lineTo(1 + cols * cw, 1 + y * ch); }
        g.stroke();
      });
    });
    var checks = [0, 1].map(function (boxed) {
      return sprite(dpr, 15, 15, function (g) {
        if (boxed) {
          g.fillRect(1.5, 1.5, 12, 12);
          g.strokeRect(1.5, 1.5, 12, 12);
        }
        g.lineWidth = 1.8;
        g.strokeStyle = rgba(LILAC, 1);
        g.beginPath(); // 체크 표시는 선으로 그림 (글자를 쓰지 않음)
        g.moveTo(4, 7.8);
        g.lineTo(6.6, 10.4);
        g.lineTo(11.5, 4.6);
        g.stroke();
      });
    });
    var bars = [[14, 9, 17], [18, 11], [8, 15, 12]].map(function (lens) {
      return sprite(dpr, 20, lens.length * 4 + 1, function (g) {
        g.fillStyle = rgba(LILAC, 0.75);
        for (var i = 0; i < lens.length; i++) g.fillRect(1, 1 + i * 4, lens[i], 2.2); // 짧은 막대(목록·진행 막대)
      });
    });
    return { digits: digits, cells: cells, checks: checks, bars: bars };
  }

  function run(opts) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    // 크기는 px 로 정함: 100vw·100vh 로 늘려 보이면, 연출 중 화면 높이가 바뀔 때(앱 안 브라우저의 도구 막대)
    // 그림 전체가 세로로 눌리거나 늘어나 숫자가 실제 카드와 어긋남. 화면 크기가 바뀌면 캔버스를 그 크기로 다시 만듦
    canvas.style.cssText = "position:fixed;left:0;top:0;z-index:10000;pointer-events:none;opacity:0";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w = innerWidth, h = innerHeight, M = Math.min(w, h);
    var B = budget(w, h);
    function sizeCanvas() {
      canvas.width = Math.round(w * B.dpr);
      canvas.height = Math.round(h * B.dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    }
    sizeCanvas();

    var bg = makeBackground(w, h);
    var sprites = makeShardSprites(B.dpr);
    var colors = []; // [금색 단계][모인 정도] → 색 문자열
    for (var si = 0; si < SHADES; si++) {
      var gold = mix(GOLD_HI, GOLD_LO, (si + 0.5) / SHADES);
      for (var li = 0; li < LEVELS; li++) colors.push(rgba(mix(LILAC, gold, li / (LEVELS - 1)), 1));
    }
    var snapColor = "rgb(255,247,222)";

    // 점: 글자를 이루는 점(target 있음) + 빨려 들어가 사라지는 점. 같은 배열에 값만 담음 (프레임마다 새 객체 없음)
    // 숫자 자리 두 벌: 카드 자리(setM, 카드가 보이는 영역 안에 다 있을 때만)와 가운데(setC).
    // 점 개수는 둘이 같아서(K) 모이기 직전까지 어느 쪽으로든 바꿀 수 있음 (cur = 지금 쓰는 쪽)
    var N = 0, K = 0, P = null, setM = null, setC = null, cur = null, mode = "center";
    // 걷히는 시각: 카드 자리에 맞추면 1.3~1.7. 가운데 모음이면 숫자가 1.3~1.44 에 아래로 내려가며 사라진 뒤 1.46~1.74
    var revealAt = T_REVEAL, endAt = T_END;
    var CENTER_EXIT = 0.14;
    var TOL = 2; // 연출 숫자와 실제 카드 숫자가 이만큼(px)보다 다르면 카드에 맞추지 않음
    var aborted = null; // 카드 맞춤 취소: { at, start, dur, diff } — 숫자를 먼저 사라지게 하고 덮개를 걷음
    // debug 기록: 처음 잰 카드 위치, 마지막 확인 때의 차이, 연출 중 화면 높이 변화
    var align = { first: null, drift: null, mismatch: null, vh: [h], forcedCenter: false };
    var measureCtx = document.createElement("canvas").getContext("2d");
    var shardList = [];
    var ready = false;

    // 시작 위치: 화면 전체에 흩어짐 (숫자 자리 근처는 살짝 피함), 천천히 떠다님
    function scatter(p, i) {
      p.sx[i] = rnd(-0.04, 1.04) * w;
      p.sy[i] = rnd(-0.04, 1.04) * h;
      var ang = rnd(0, 6.2832), sp = rnd(6, 22);
      p.vx[i] = Math.cos(ang) * sp;
      p.vy[i] = Math.sin(ang) * sp - 4;
      p.ph[i] = rnd(0, 6.28);
      p.sz[i] = rnd(0.9, 1.3); // 낱점은 작게 (크고 밝은 점이 많으면 별밤처럼 보임) — 표 조각 무리의 점이 더 또렷
    }

    // 점으로 된 표 조각: 느슨한 격자(행·열)로 묶여 비스듬히 함께 떠다니는 무리 — "정리 안 된 표 데이터"
    function makeFrags() {
      var list = [];
      for (var f = 0; f < B.frags; f++) {
        var ang = rnd(0, 6.2832), sp = rnd(14, 30);
        list.push({
          x: rnd(0.06, 0.94) * w, y: rnd(0.06, 0.94) * h,
          cols: 4 + Math.floor(Math.random() * 4), rows: 3 + Math.floor(Math.random() * 3),
          gap: rnd(9, 12), rot: rnd(-0.3, 0.3), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 6,
          used: 0,
        });
      }
      return list;
    }
    function placeInFrag(p, i, fr) {
      var node = fr.used++;
      if (node >= fr.cols * fr.rows) return;
      var cx = (node % fr.cols - (fr.cols - 1) / 2) * fr.gap, cy = (Math.floor(node / fr.cols) - (fr.rows - 1) / 2) * fr.gap;
      var c = Math.cos(fr.rot), sn = Math.sin(fr.rot);
      p.sx[i] = fr.x + cx * c - cy * sn + rnd(-1.2, 1.2);
      p.sy[i] = fr.y + cx * sn + cy * c + rnd(-1.2, 1.2);
      p.vx[i] = fr.vx;
      p.vy[i] = fr.vy;
      p.sz[i] = rnd(1.6, 2.1);
    }

    // 글자 점 뽑기: 점 간격은 글자 크기에 비례, 전체가 예산을 넘으면 간격을 넓힘. 섞어서 앞에서부터 쓰면 글자 전체에 고르게
    function samplePoints(items) {
      var step = Math.max(2.2, items[0].font.size / 15), pts, tries = 0;
      do {
        pts = items.map(function (it) { return sample(it, step); });
        var total = pts[0].length + pts[1].length + pts[2].length;
        if (total <= B.points * 2) break;
        step *= Math.sqrt(total / 2 / B.points);
      } while (++tries < 3);
      var list = [];
      for (var k = 0; k < 3; k++) for (var j = 0; j < pts[k].length; j += 2) list.push([pts[k][j], pts[k][j + 1], k]);
      for (k = list.length - 1; k > 0; k--) {
        var r = Math.floor(Math.random() * (k + 1)), tmp = list[k];
        list[k] = list[r];
        list[r] = tmp;
      }
      if (list.length > B.points) list.length = B.points;
      return list;
    }
    // 한 벌의 목표 자리: 앞 K 개는 글자 점(모자라면 되풀이), 나머지는 무리 가운데로 빨려 들어가 사라지는 점
    function makeSet(setMode, items, list) {
      var st = {
        mode: setMode, items: items,
        tx: new Float32Array(N), ty: new Float32Array(N), jx: new Float32Array(N), jy: new Float32Array(N),
        sh: new Uint8Array(N), grp: new Uint8Array(N),
      };
      for (var i = 0; i < N; i++) {
        if (i < K) {
          var t = list[i % list.length], it = items[t[2]];
          st.tx[i] = t[0];
          st.ty[i] = t[1];
          st.grp[i] = t[2];
          st.sh[i] = shadeAt(t[0], t[1], it.box);
          // 완성 직전 살짝 흐트러져 있다가(글자 크기의 4%) 1.1~1.2초에 정확히 맞춰짐
          st.jx[i] = rnd(-1, 1) * it.font.size * 0.04;
          st.jy[i] = rnd(-1, 1) * it.font.size * 0.04;
        } else {
          var g = Math.floor(Math.random() * 3), bx = items[g].box;
          st.grp[i] = g;
          st.tx[i] = bx.x + bx.w * rnd(0.2, 0.8);
          st.ty[i] = bx.y + bx.h * rnd(0.3, 0.7);
          st.sh[i] = 1;
        }
      }
      st.text = items.map(function (it) { return makeTextSprite(it, B.dpr, false); });
      st.glow = items.map(function (it) { return makeTextSprite(it, B.dpr, true); });
      return st;
    }
    function freeSet(st) {
      if (st) st.text.concat(st.glow).forEach(function (x) { x.img.width = x.img.height = 0; });
    }
    function chooseSet(st) {
      cur = st;
      mode = st.mode;
      // 걷히는 시각: 카드 자리 1.3~1.7, 가운데 1.46~1.74 (숫자가 먼저 사라진 뒤)
      revealAt = mode === "center" ? T_REVEAL + CENTER_EXIT + 0.02 : T_REVEAL;
      endAt = mode === "center" ? T_END + 0.04 : T_END;
      stats.mode = mode;
    }
    // 글꼴이 캔버스에서 쓸 수 있게 준비됐는지 (준비 전에 카드에 맞추면 글자 모양·폭이 달라질 수 있음)
    function fontsOk() {
      var el = statEls()[0];
      if (!el || !document.fonts || !document.fonts.check) return true;
      // 목록의 첫 글꼴(사이트 글꼴)만 확인 — 뒤의 "pretendard Fallback"(next/font 가 만든 로컬 대체 글꼴)은
      // 쓰이지 않으면 계속 unloaded 라서 목록 전체로 물으면 늘 false
      try {
        var cs = getComputedStyle(el);
        return document.fonts.check(cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily.split(",")[0], "30초8배6개월+");
      } catch (e) {
        return true;
      }
    }

    function build() {
      align.first = rectsOf(statEls());
      var mi = fontsOk() ? matchLayout(measureCtx) : null;
      if (!mi && cardsFit(align.first)) align.forcedCenter = true; // 카드는 보이지만 글꼴 준비 전 → 일단 가운데, 모이기 전에 다시 봄
      var itemsC = centerLayout(w, measureCtx);
      var listC = samplePoints(itemsC);
      var listM = mi ? samplePoints(mi) : null;
      K = Math.min(listC.length, listM ? listM.length : Infinity, B.points);
      N = K + B.ambient;
      P = {
        sx: new Float32Array(N), sy: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N),
        dl: new Float32Array(N), sw: new Float32Array(N), ph: new Float32Array(N), sz: new Float32Array(N),
        tg: new Uint8Array(N),
      };
      var frags = makeFrags();
      for (var i = 0; i < N; i++) {
        scatter(P, i);
        // 앞쪽 절반은 표 조각 무리에 (섞여 있으므로 어느 글자로 가든 고르게, 무리가 꽉 차면 낱점으로)
        if (i < N * 0.5) placeInFrag(P, i, frags[i % frags.length]);
        P.tg[i] = i < K ? 1 : 0;
        P.dl[i] = rnd(0, 0.18); // 출발 시각 차이
        P.sw[i] = rnd(0.25, 1) * (Math.random() < 0.5 ? -1 : 1) * M * 0.14; // 빨려 들어갈 때 휘는 정도
      }
      setC = makeSet("center", itemsC, listC);
      setM = mi ? makeSet("match", mi, listM) : null;
      chooseSet(setM || setC);
      // 업무 조각(숫자·표 칸·체크·막대): 각자 떠다니며 천천히 흔들리다가, 모일 때 글자 쪽으로 끌려가며 사라짐
      shardList.length = 0;
      var kinds = [];
      var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
      for (var a = 0; a < B.digits; a++) kinds.push(pick(sprites.digits));
      for (a = 0; a < B.cells; a++) kinds.push(pick(sprites.cells));
      for (a = 0; a < B.checks; a++) kinds.push(pick(sprites.checks));
      for (a = 0; a < B.bars; a++) kinds.push(pick(sprites.bars));
      for (i = 0; i < Math.min(N, kinds.length); i++) {
        var sang = rnd(0, 6.2832), ssp = rnd(18, 40);
        shardList.push({
          i: N - 1 - i, img: kinds[i], x: rnd(0.03, 0.97) * w, y: rnd(0.03, 0.97) * h,
          vx: Math.cos(sang) * ssp, vy: Math.sin(sang) * ssp - 6,
          r: rnd(-0.35, 0.35), sway: rnd(0.16, 0.32) * (Math.random() < 0.5 ? -1 : 1), fq: rnd(2.2, 3.4), ph: rnd(0, 6.28), bob: rnd(4, 7),
        });
      }
      ready = true;
    }

    // 같은 크기로 위치만 바뀌었으면 그만큼 옮김 (무리별로)
    function shiftSet(st, mi) {
      var moved = 0;
      for (var k = 0; k < 3; k++) {
        var dx = mi[k].box.x - st.items[k].box.x, dy = mi[k].box.y - st.items[k].box.y;
        if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) continue;
        moved = Math.max(moved, Math.abs(dx), Math.abs(dy));
        for (var i = 0; i < N; i++) {
          if (st.grp[i] !== k) continue;
          st.tx[i] += dx;
          st.ty[i] += dy;
        }
        st.text[k].x += dx; st.text[k].y += dy;
        st.glow[k].x += dx; st.glow[k].y += dy;
        st.items[k] = mi[k];
      }
      return Math.round(moved);
    }
    function sameSize(a, b) {
      for (var k = 0; k < 3; k++) {
        if (a[k].font.size !== b[k].font.size || Math.abs(a[k].box.w - b[k].box.w) > 0.5 || Math.abs(a[k].box.h - b[k].box.h) > 0.5 || a[k].text !== b[k].text) return false;
      }
      return true;
    }
    // 숫자 자리 다시 보기
    // - 모이기 전(점이 아직 출발 전): 카드가 보이는 영역 안에 다 있고 글꼴이 준비됐으면 카드 자리로(위치가 바뀌었으면 옮기거나 새로 뽑음),
    //   아니면 가운데로. 화면 크기가 바뀌었으면 가운데 자리도 새로
    // - 모이기 시작한 뒤: 카드에 맞추는 중인데 실제 카드 숫자 위치가 TOL 보다 달라지면 맞춤 취소.
    //   (화면 높이만 바뀌어 카드 일부가 가려진 경우는 위치가 그대로라 숫자도 그대로 맞으므로 취소하지 않음)
    function evaluate(t, why) {
      if (aborted || !ready) return;
      var rects = rectsOf(statEls());
      if (t < T_GATHER) {
        var mi = fontsOk() ? matchLayout(measureCtx) : null;
        if (mi) {
          if (setM && sameSize(setM.items, mi)) {
            var moved = shiftSet(setM, mi);
            if (moved) logEvent("모이기 전 다시 잼: 카드 위치 " + moved + "px 옮김");
          } else {
            freeSet(setM);
            setM = makeSet("match", mi, samplePoints(mi));
            logEvent("모이기 전 다시 잼: 카드 자리를 새로 뽑음");
          }
          if (cur !== setM) logEvent("모이기 전 다시 잼: 카드에 맞춤으로 바꿈");
          chooseSet(setM);
        } else {
          if (why === "resize") {
            freeSet(setC);
            var itemsC = centerLayout(w, measureCtx);
            setC = makeSet("center", itemsC, samplePoints(itemsC));
          }
          if (cur === setM) logEvent("모이기 전 다시 잼: 카드가 보이는 영역 밖 → 가운데 모음");
          chooseSet(setC);
        }
        return;
      }
      if (mode !== "match") return;
      var mis = maxDiff(rects, cur.items.map(function (it) { return it.box; }));
      align.mismatch = mis;
      if (mis <= TOL) return;
      // 맞춤 취소: 숫자는 모인 자리에서 아래로 내려가며 먼저 사라지고, 그 뒤에 덮개가 걷힘 (페이지 글자와 어긋나게 겹치지 않음).
      // 덮개가 이미 걷히는 중이면 움직이지 않고 그 자리에서 바로 감춤
      var late = cuedReveal;
      var startAt = late ? t : Math.max(t, 1.26), dur = late ? 0.001 : CENTER_EXIT;
      aborted = { at: Math.round(t * 1000), start: startAt, dur: dur, diff: mis, late: late };
      if (!late) {
        revealAt = startAt + dur + 0.02;
        endAt = revealAt + 0.28;
      }
      stats.mode = "match-aborted";
      logEvent((why === "resize" ? "화면 크기 변화" : why === "layout" ? "페이지 밀림" : "마지막 확인") + ": 카드 위치 " + mis + "px 다름 → " + (late ? "숫자를 바로 감춤" : "숫자를 먼저 사라지게"));
    }

    // 화면 크기가 바뀌면 캔버스를 그 크기로 다시 만들고(그림이 눌리거나 늘어나지 않게) 숫자 자리를 다시 봄
    var dirty = false;
    function onViewport() {
      dirty = true;
      if (!begun && !done) applyResize(); // 움직이기 전이면 바로
    }
    function applyResize() {
      dirty = false;
      var nw = innerWidth, nh = innerHeight;
      if (nw === w && nh === h) return false;
      if (align.vh[align.vh.length - 1] !== nh && align.vh.length < 6) {
        align.vh.push(nh);
        logEvent("화면 높이 " + h + "→" + nh + "px");
      }
      w = nw;
      h = nh;
      M = Math.min(w, h);
      sizeCanvas();
      bg.width = bg.height = 0;
      bg = makeBackground(w, h);
      return true;
    }
    addEventListener("resize", onViewport);
    if (window.visualViewport) visualViewport.addEventListener("resize", onViewport);
    // 페이지가 밀리는 것 감지: 본문(main)·body 의 크기가 바뀌면(카드 위쪽 내용이 늘거나 줄면) 다음 프레임에 숫자 자리를 다시 확인
    var layoutDirty = false, ro = null;
    try {
      ro = new ResizeObserver(function () {
        if (begun) layoutDirty = true;
      });
      var mainEl = document.querySelector("main");
      if (mainEl) ro.observe(mainEl, { box: "border-box" });
      ro.observe(document.body, { box: "border-box" });
    } catch (e) {
      ro = null;
    }

    var buckets = [];
    for (var b = 0; b < SHADES * LEVELS + 1; b++) buckets.push({ n: 0, a: new Float32Array(1400 * 3) }); // 모자라면 늘림
    function push(bi, x, y, s) {
      var bk = buckets[bi];
      if (bk.n * 3 + 3 > bk.a.length) {
        var na = new Float32Array(bk.a.length * 2);
        na.set(bk.a);
        bk.a = na;
      }
      bk.a[bk.n * 3] = x;
      bk.a[bk.n * 3 + 1] = y;
      bk.a[bk.n * 3 + 2] = s;
      bk.n++;
    }

    var stats = { frames: 0, intervals: [], at: [], points: 0, reduced: false, maxGap: 0, stalls: 0, stallTotal: 0, mode: "", vis: { text: 0, bg: 1, x: 0, y: 0, h: 0 } };
    window.__hubIntroStats = stats;

    // 한 프레임: t 초 장면
    function draw(t) {
      var bgA = t < revealAt ? 1 : 1 - smooth(clamp01((t - revealAt) / (endAt - revealAt)));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, w, h);
      if (bgA > 0) {
        ctx.globalAlpha = bgA;
        ctx.drawImage(bg, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }
      if (!ready) return;

      var snapK = clamp01((t - T_FORM) / 0.1); // 1.1~1.2 흐트러짐이 0 으로
      var flash = bell(t, T_FORM - 0.02, T_FORM + 0.07, T_REVEAL);
      var crisp = clamp01((t - 1.14) / 0.1); // 완성 글자가 나타남
      var dotsA = 1 - clamp01((t - 1.18) / 0.1); // 점은 완성 글자 아래로 사라짐
      for (var b2 = 0; b2 < buckets.length; b2++) buckets[b2].n = 0;

      if (dotsA > 0) {
        var active = N;
        for (var i = 0; i < active; i++) {
          var dl = P.dl[i], x, y, p;
          var tStart = T_GATHER + dl;
          // 떠다니는 위치 (출발 전까지)
          var tf = t < tStart ? t : tStart;
          var fx = P.sx[i] + P.vx[i] * tf + Math.sin(P.ph[i] + tf * 2.2) * 3;
          var fy = P.sy[i] + P.vy[i] * tf + Math.cos(P.ph[i] + tf * 1.8) * 3;
          if (t < tStart) {
            x = fx; y = fy; p = 0;
          } else {
            p = clamp01((t - tStart) / (T_FORM - 0.04 - tStart));
            var e = suck(p);
            var jx = cur.jx[i] * (1 - snapK), jy = cur.jy[i] * (1 - snapK);
            var txi = cur.tx[i] + jx, tyi = cur.ty[i] + jy;
            var dx = txi - fx, dy = tyi - fy, len = Math.hypot(dx, dy) || 1;
            var bend = Math.sin(Math.PI * e) * P.sw[i] * Math.min(1, len / (M * 0.6));
            x = fx + dx * e - (dy / len) * bend;
            y = fy + dy * e + (dx / len) * bend;
          }
          var size = P.sz[i] + (P.tg[i] ? (cur.items[cur.grp[i]].font.size / 22 - P.sz[i]) * smooth(p) : 0);
          if (!P.tg[i]) {
            // 글자에 들지 않는 점: 도착할수록 작아지며 사라짐
            var fade = 1 - clamp01((p - 0.55) / 0.4);
            if (fade <= 0.02) continue;
            size *= fade;
          }
          var bi = flash > 0.5 && P.tg[i] ? SHADES * LEVELS : cur.sh[i] * LEVELS + Math.round(smooth(p) * (LEVELS - 1));
          push(bi, x, y, size);
        }
        // 묶음마다 한 번에 칠함
        ctx.globalAlpha = dotsA;
        for (var q = 0; q < buckets.length; q++) {
          var bk = buckets[q];
          if (!bk.n) continue;
          ctx.fillStyle = q === SHADES * LEVELS ? snapColor : colors[q];
          ctx.beginPath();
          for (var k = 0; k < bk.n * 3; k += 3) {
            var s = bk.a[k + 2];
            ctx.rect(bk.a[k] - s / 2, bk.a[k + 1] - s / 2, s, s);
          }
          ctx.fill();
        }
        // 업무 조각: 떠다니며 흔들림(회전·위아래) → 모이기 시작하면 글자 쪽으로 끌려가며 0.45초 안에 사라짐
        var ramp = 0.6 + 0.35 * smooth(clamp01(t / 0.35)); // 처음엔 조금 흐리게 시작해 또렷해짐
        for (var m = 0; m < shardList.length; m++) {
          var sd = shardList[m], ii = sd.i, t0 = T_GATHER + P.dl[ii];
          var pp = t < t0 ? 0 : clamp01((t - t0) / 0.45);
          var sa = (1 - pp) * ramp * dotsA;
          if (sa < 0.03) continue;
          var tf2 = Math.min(t, t0);
          var ox = sd.x + sd.vx * tf2, oy = sd.y + sd.vy * tf2 + Math.sin(sd.ph + t * sd.fq) * sd.bob;
          if (pp > 0) {
            var e2 = suck(clamp01(pp * 0.6));
            ox += (cur.tx[ii] - ox) * e2;
            oy += (cur.ty[ii] - oy) * e2;
          }
          var rot = sd.r + Math.sin(sd.ph + t * sd.fq * 0.8) * sd.sway, im = sd.img;
          var cs = Math.cos(rot) * B.dpr, sn = Math.sin(rot) * B.dpr;
          ctx.globalAlpha = sa;
          ctx.setTransform(cs, sn, -sn, cs, ox * B.dpr, oy * B.dpr);
          ctx.drawImage(im.img, -im.w / 2, -im.h / 2, im.w, im.h);
        }
        ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
        ctx.globalAlpha = 1;
      }

      // 완성 순간 빛 번짐 (가산 혼합) → 완성 글자
      // 카드 자리: 실제 카드 숫자와 같은 자리라 걷힌 뒤 살짝 늦게 사라짐.
      // 가운데: 1.3 에 완성된 뒤 카드 쪽(아래)으로 22px 내려가며 사라짐 — 덮개가 걷히기 전에 다 사라져 페이지 글자 위에 남지 않음.
      // 카드 맞춤 취소: 같은 방식으로 모인 자리에서 먼저 사라짐 (덮개가 걷히는 중에 취소되면 0.08초 만에)
      var exiting = mode === "center" || !!aborted;
      var exitK = exiting ? smooth(clamp01((t - (aborted ? aborted.start : T_REVEAL)) / (aborted ? aborted.dur : CENTER_EXIT))) : 0;
      var textA = !exiting
        ? (t < 1.6 ? crisp : crisp * (1 - clamp01((t - 1.6) / 0.1)))
        : crisp * (1 - exitK);
      var lift = exiting && !(aborted && aborted.late) ? 22 * exitK : 0;
      if (flash > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = flash * 0.85;
        for (var gi = 0; gi < 3; gi++) {
          var gs = cur.glow[gi];
          ctx.drawImage(gs.img, gs.x, gs.y + lift, gs.w, gs.h);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      // 확인용 기록(값만 바꿈): 지금 그리는 숫자 자리·투명도와 덮개 투명도 — 측정 도구가 실제 카드 위치와 비교
      var vis = stats.vis;
      vis.text = textA;
      vis.bg = bgA;
      vis.x = cur.items[0].box.x;
      vis.y = cur.items[0].box.y + lift;
      vis.h = h;
      if (textA > 0.01) {
        ctx.globalAlpha = textA;
        for (var ti = 0; ti < 3; ti++) {
          var ts = cur.text[ti];
          ctx.drawImage(ts.img, ts.x, ts.y + lift, ts.w, ts.h);
        }
      }
      ctx.globalAlpha = 1;
    }

    var start = performance.now(), last = start, frame = 0, done = false, begun = false;
    // 시각에 맞춘 알림: 1.3 숫자 완성 → "건너뛰기" 표시가 서서히 사라짐, revealAt → 덮개가 걷히며 소개 문구가 떠오름
    var cuedLabel = false, cuedReveal = false, checkedGather = false, checkedFinal = false;
    function cues(t) {
      if (!cuedLabel && t >= T_REVEAL) { cuedLabel = true; if (opts.onLabelOff) opts.onLabelOff(); }
      if (!cuedReveal && t >= revealAt) { cuedReveal = true; if (opts.onReveal) opts.onReveal(); }
    }
    function tick(now) {
      if (done) return;
      try {
        step(now);
      } catch (err) {
        logReason("오류", err && err.message);
        finish();
      }
    }
    function step(now) {
      if (!canvas.isConnected && document.body) {
        logEvent("캔버스가 바깥에서 지워져 다시 붙임");
        document.body.appendChild(canvas);
      }
      if (opts.keepClasses) opts.keepClasses();
      // 한 번에 0.2초 넘게 멈췄으면 그동안은 시간이 멈춘 것으로 봄 (합쳐서 1.2초까지) — 워프와 같은 보정
      var gap = now - last;
      if (stats.frames > 0 && gap > stats.maxGap) stats.maxGap = Math.round(gap);
      if (stats.frames > 0 && gap > 200 && stats.stallTotal < 1200) {
        var hold = Math.min(gap - 1000 / 30, 1200 - stats.stallTotal);
        start += hold;
        stats.stallTotal += hold;
        stats.stalls++;
        logEvent(Math.round(gap) + "ms 멈춤 → 장면 건너뛰지 않게 보정");
      }
      var t = (now - start) / 1000;
      if (stats.frames > 0) {
        stats.intervals.push(Math.round(now - last));
        stats.at.push(Math.round(t * 1000));
      }
      last = now;
      stats.frames++;
      // 처음 10프레임 중앙값이 22ms 넘으면 점·조각을 40% 줄임 (섞어 두었으므로 뒤를 잘라도 글자 모양이 고르게 남음)
      if (stats.frames === 11 && !stats.reduced) {
        var sorted = stats.intervals.slice().sort(function (a, b) { return a - b; });
        if (sorted[Math.floor(sorted.length / 2)] > 22) {
          N = Math.round(N * 0.6);
          shardList.length = Math.round(shardList.length * 0.6);
          stats.reduced = true;
          stats.points = N;
        }
      }
      // 숫자 자리 다시 보기: 화면 크기가 바뀌었으면 바로, 모이기 직전(0.36초)에 한 번, 완성 직전(1.25초)에 마지막으로
      if (dirty && applyResize()) evaluate(t, "resize");
      // 페이지 레이아웃이 바뀌었으면(카드 위쪽 내용의 크기 변화) 다시 확인 — 매 프레임 위치를 읽지 않음
      if (layoutDirty) { layoutDirty = false; evaluate(t, "layout"); }
      if (!checkedGather && t >= 0.36) { checkedGather = true; evaluate(t, "gather"); }
      if (!checkedFinal && t >= 1.25) {
        checkedFinal = true;
        align.drift = maxDiff(rectsOf(statEls()), align.first || []);
        evaluate(t, "final");
      }
      // 확인·캡처용: 측정 도구가 window.__hubIntroFreezeAt(초)을 넣었을 때만 그 장면에서 멈춰 둠 (방문자에게는 없음)
      var freezeAt = window.__hubIntroFreezeAt;
      if (typeof freezeAt === "number" && t >= freezeAt) {
        cues(freezeAt);
        draw(freezeAt);
        window.__hubIntroFrozen = freezeAt;
        return;
      }
      if (t >= endAt + 0.02) { finish(); return; }
      cues(t);
      draw(t);
      frame = requestAnimationFrame(tick);
    }
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      canvas.remove();
      removeEventListener("resize", onViewport);
      if (ro) ro.disconnect();
      if (window.visualViewport) visualViewport.removeEventListener("resize", onViewport);
      bg.width = bg.height = 0;
      freeSet(setM);
      freeSet(setC);
      P = null;
      if (opts.onEnd) opts.onEnd();
    }
    function skip(reason, detail) {
      if (done) return;
      if (reason) logReason(reason, detail);
      if (opts.onSkip) opts.onSkip();
      finish();
    }
    // 글꼴이 아직이면 document.fonts.ready 를 0.5초까지 기다린 뒤 시작 (그래도 아니면 가운데로 시작하고 모이기 전에 다시 봄)
    function begin() {
      if (begun || done) return;
      begun = true;
      if (fontsOk() || !document.fonts || !document.fonts.ready) return start2();
      var go = false;
      var once = function () {
        if (go) return;
        go = true;
        start2();
      };
      document.fonts.ready.then(once, once);
      setTimeout(once, 500);
    }
    function start2() {
      if (done) return;
      if (dirty) applyResize();
      // 숫자 자리·글자 점: 페이지 준비가 끝난 지금 계산하고, 모이기 직전·완성 직전에 다시 확인
      try {
        build();
        stats.points = N;
        stats.align = align;
        if (window.__hubIntroLog) {
          window.__hubIntroLog.begin = Math.round(performance.now());
          logEvent("맞춤: " + (mode === "match" ? "카드" : "가운데" + (align.forcedCenter ? "(글꼴 준비 전)" : "")) + " · 점 " + N + "개 · 화면 " + w + "×" + h);
        }
      } catch (err) {
        logReason("오류", err && err.message);
        finish();
        return;
      }
      // 처음 쓰는 그림(작은 숫자·표 칸·완성 글자·빛 번짐)을 거의 투명하게 한 번 그려 둠: 그림을 처음 화면에 올리는
      // 준비 비용이 움직이기 전에 생기게. 그다음 첫 장면을 그리고 캔버스를 보이며 CSS 덮개를 걷음 —
      // 덮개 걷기(<html> 클래스 변경)를 연출 도중에 하지 않아 그 순간의 프레임 밀림이 없음
      ctx.globalAlpha = 0.004;
      var warmList = sprites.digits.concat(sprites.cells, sprites.checks, sprites.bars, setC.text, setC.glow, setM ? setM.text.concat(setM.glow) : []);
      for (var wi = 0; wi < warmList.length; wi++) ctx.drawImage(warmList[wi].img, 0, 0);
      ctx.globalAlpha = 1;
      draw(0);
      canvas.style.opacity = "1";
      if (opts.onBegin) opts.onBegin();
      // 화면 전환(캔버스 보이기·덮개 걷기)을 화면에 반영하는 몇 프레임이 무거우므로, 프레임 간격이 두 번 연속
      // 24ms 안으로 안정되면(최대 8프레임) 시계를 시작 (그동안은 첫 장면이 그대로 보임) → 움직이는 첫 프레임이 밀리지 않음
      var settle = 0, calm = 0, prev = performance.now();
      frame = requestAnimationFrame(function wait(now) {
        if (done) return;
        calm = now - prev < 24 ? calm + 1 : 0;
        prev = now;
        if (++settle < 8 && calm < 2) {
          frame = requestAnimationFrame(wait);
          return;
        }
        start = last = performance.now();
        frame = requestAnimationFrame(tick);
      });
    }

    // 첫 장면(바탕)을 미리 그려 둠: 새 캔버스를 처음 그릴 때의 준비 멈춤이 움직이기 전에 생기게
    try {
      draw(0);
    } catch (err) {
      logReason("오류", err && err.message);
      finish();
      return { skip: function () {}, finish: function () {}, begin: function () {} };
    }
    if (window.__hubIntroLog) {
      window.__hubIntroLog.canvas = canvas.width + "×" + canvas.height + " (화면 " + w + "×" + h + ", 배율 " + B.dpr + ")";
    }
    return { skip: skip, finish: finish, begin: begin };
  }

  // debug 기록용 맞춤 결과: 방식, 처음 잰 카드 위치와 마지막 확인 때의 차이, 연출 중 화면 높이
  function alignText(s) {
    var a = s.align || {};
    var m = s.mode === "match" ? "카드에 맞춤" : s.mode === "match-aborted" ? "카드 맞춤 취소(숫자 먼저 사라짐)" : "가운데 모음";
    return m + " · 처음↔마지막 위치 차이 " + (a.drift == null ? "-" : a.drift + "px") + " · 화면 높이 " + (a.vh || []).join("→") + "px";
  }

  var intro = null;
  function prepareIntro() {
    var root = document.documentElement;
    if (intro || !root.classList.contains("hub-intro") || !root.classList.contains("hub-data") || reducedQuery.matches || !document.body) return;
    var revealed = false;
    window.__hubIntroRunning = true;
    function reveal() {
      if (revealed) return;
      revealed = true;
      if (window.__hubIntroReveal) window.__hubIntroReveal();
    }
    intro = run({
      keepClasses: function () {
        if (revealed) return;
        var r = document.documentElement;
        if (!r.classList.contains("hub-intro")) {
          logEvent("연출 표시가 바깥에서 지워져 되살림");
          r.classList.add("hub-intro", "hub-cover", "hub-cover-off", "hub-data");
          r.style.setProperty("--hub-skip-label", '"건너뛰기"');
        }
      },
      onReveal: reveal,
      onLabelOff: function () {
        document.documentElement.classList.add("hub-skip-off");
      },
      onBegin: function () {
        document.documentElement.classList.add("hub-cover-off");
      },
      onSkip: reveal,
      onEnd: function () {
        var s = window.__hubIntroStats;
        logReason("정상 완료", s && "프레임 " + s.frames + "장 · 가장 긴 간격 " + s.maxGap + "ms" + (s.stalls ? " · 멈춤 보정 " + s.stalls + "회" : "") + " · " + alignText(s));
        reveal();
        document.documentElement.classList.remove("hub-data", "hub-skip-off");
        window.__hubIntroRunning = false;
        if (window.__hubIntroEnd) window.__hubIntroEnd();
      },
    });
    window.__hubIntroSkip = intro.skip;
    whenQuiet(function () {
      var now = Math.round(performance.now());
      if (now > 2600) intro.skip("느림 생략", "움직이기 시작이 " + now + "ms 로 2.6초 넘음");
      else intro.begin();
    });
  }

  // 메인 화면 준비가 끝난 뒤 시작 (public/hero-intro.js 와 같은 기준):
  // ① 소개 카드 준비 끝 신호(hub:hydrated) ② 그 뒤 리소스 응답이 0.25초 동안 없음(최대 0.5초) ③ 브라우저가 한가할 때
  function whenQuiet(cb) {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      cb();
    }
    function idle() {
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 300 });
      else setTimeout(go, 50);
    }
    function afterHydrate() {
      var hydratedAt = performance.now(), lastResponse = hydratedAt, po = null;
      try {
        po = new PerformanceObserver(function () {
          lastResponse = performance.now();
        });
        po.observe({ type: "resource" });
      } catch (e) {
        po = null;
      }
      (function check() {
        if (fired) return po && po.disconnect();
        if (performance.now() - lastResponse >= 250 || performance.now() - hydratedAt >= 500) {
          if (po) po.disconnect();
          idle();
        } else setTimeout(check, 40);
      })();
    }
    if (window.__hubHydrated) afterHydrate();
    else addEventListener("hub:hydrated", afterHydrate, { once: true });
    setTimeout(go, 2400);
  }

  // 판정 함수는 자동 테스트(tests/)에서도 씀
  window.HubDataIntro = { version: 2, cardsFit: cardsFit, maxDiff: maxDiff, visibleArea: visibleArea };
  if (document.body) prepareIntro();
  else document.addEventListener("DOMContentLoaded", prepareIntro, { once: true });
})();
