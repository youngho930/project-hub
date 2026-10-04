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

  // 세 숫자를 둘 자리: 실제 카드가 첫 화면 안에 다 보이면 그 자리(match), 아니면 화면 가운데(center)
  function layout(w, h, measure) {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-hub-stats] .count-up"), 0, 3);
    var items = [];
    var fit = els.length === 3;
    for (var i = 0; fit && i < 3; i++) {
      var r = els[i].getBoundingClientRect();
      if (r.width < 4 || r.top < 0 || r.bottom > h - 4 || r.left < 0 || r.right > w) fit = false;
    }
    if (fit) {
      for (i = 0; i < 3; i++) {
        var el = els[i], rect = el.getBoundingClientRect(), f = fontOf(el);
        measure.font = f.css;
        var m = measure.measureText("0");
        var asc = m.fontBoundingBoxAscent || f.size * 0.95, desc = m.fontBoundingBoxDescent || f.size * 0.25;
        // CSS 줄 상자: 글꼴 높이(ascent+descent)를 줄 높이 가운데에 두고 위아래로 반씩 여백 → 기준선
        items.push({
          text: (el.textContent || FALLBACK[i]).trim(),
          font: f,
          x: rect.left,
          baseline: rect.top + (rect.height - (asc + desc)) / 2 + asc,
          box: { x: rect.left, y: rect.top, w: rect.width, h: rect.height },
          el: el,
        });
      }
      return { mode: "match", items: items };
    }
    // 가운데: 한 줄에 들어가면 가로로(사이는 글자 크기의 0.7), 아니면 세 줄로
    var texts = els.length === 3 ? els.map(function (e) { return (e.textContent || "").trim(); }) : FALLBACK;
    var ref = els[0] || document.body;
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
    var x = (w - total) / 2, base = h / 2 + (a0 - d0) / 2;
    for (i = 0; i < 3; i++) {
      items.push({ text: texts[i], font: f0, x: x, baseline: base, box: { x: x, y: base - a0, w: widths[i], h: a0 + d0 } });
      x += widths[i] + gap;
    }
    return { mode: "center", items: items };
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
    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:10000;pointer-events:none;opacity:0";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w = innerWidth, h = innerHeight, M = Math.min(w, h);
    var B = budget(w, h);
    canvas.width = Math.round(w * B.dpr);
    canvas.height = Math.round(h * B.dpr);
    ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);

    var bg = makeBackground(w, h);
    var sprites = makeShardSprites(B.dpr);
    var colors = []; // [금색 단계][모인 정도] → 색 문자열
    for (var si = 0; si < SHADES; si++) {
      var gold = mix(GOLD_HI, GOLD_LO, (si + 0.5) / SHADES);
      for (var li = 0; li < LEVELS; li++) colors.push(rgba(mix(LILAC, gold, li / (LEVELS - 1)), 1));
    }
    var snapColor = "rgb(255,247,222)";

    // 점: 글자를 이루는 점(target 있음) + 빨려 들어가 사라지는 점. 같은 배열에 값만 담음 (프레임마다 새 객체 없음)
    var N = 0, P = null, items = null, mode = "center", textSprites = [], glowSprites = [];
    // 걷히는 시각: 카드 자리에 맞추면 1.3~1.7. 가운데 모음이면 숫자가 1.3~1.44 에 아래로 내려가며 사라진 뒤 1.46~1.74
    var revealAt = T_REVEAL, endAt = T_END;
    var CENTER_EXIT = 0.14;
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

    function build() {
      var measure = document.createElement("canvas").getContext("2d");
      var L = layout(w, h, measure);
      mode = L.mode;
      items = L.items;
      if (mode === "center") {
        revealAt = T_REVEAL + CENTER_EXIT + 0.02;
        endAt = T_END + 0.04;
      }
      // 점 간격: 글자 크기에 비례, 전체가 예산을 넘으면 간격을 넓힘
      var step = Math.max(2.2, items[0].font.size / 15), pts, tries = 0;
      do {
        pts = items.map(function (it) { return sample(it, step); });
        var total = pts[0].length + pts[1].length + pts[2].length;
        if (total <= B.points * 2) break;
        step *= Math.sqrt(total / 2 / B.points);
      } while (++tries < 3);
      var targets = [];
      for (var k = 0; k < 3; k++) {
        for (var j = 0; j < pts[k].length; j += 2) targets.push([pts[k][j], pts[k][j + 1], k]);
      }
      // 섞어서 앞에서부터 쓰면 글자 전체에 고르게 (느린 기기에서 뒤를 잘라도 모양이 남음)
      for (k = targets.length - 1; k > 0; k--) {
        var r = Math.floor(Math.random() * (k + 1)), tmp = targets[k];
        targets[k] = targets[r];
        targets[r] = tmp;
      }
      if (targets.length > B.points) targets.length = B.points;
      N = targets.length + B.ambient;
      P = {
        sx: new Float32Array(N), sy: new Float32Array(N), vx: new Float32Array(N), vy: new Float32Array(N),
        tx: new Float32Array(N), ty: new Float32Array(N), jx: new Float32Array(N), jy: new Float32Array(N),
        dl: new Float32Array(N), sw: new Float32Array(N), ph: new Float32Array(N), sz: new Float32Array(N),
        sh: new Uint8Array(N), tg: new Uint8Array(N), grp: new Uint8Array(N),
      };
      var frags = makeFrags();
      for (var i = 0; i < N; i++) {
        scatter(P, i);
        // 앞쪽 절반은 표 조각 무리에 (섞여 있으므로 어느 글자로 가든 고르게, 무리가 꽉 차면 낱점으로)
        if (i < N * 0.5) placeInFrag(P, i, frags[i % frags.length]);
        var t = targets[i];
        if (t) {
          P.tg[i] = 1;
          P.tx[i] = t[0];
          P.ty[i] = t[1];
          P.grp[i] = t[2];
          P.sh[i] = shadeAt(t[0], t[1], items[t[2]].box);
          // 완성 직전 살짝 흐트러져 있다가(글자 크기의 4%) 1.1~1.2초에 정확히 맞춰짐
          P.jx[i] = rnd(-1, 1) * items[t[2]].font.size * 0.04;
          P.jy[i] = rnd(-1, 1) * items[t[2]].font.size * 0.04;
        } else {
          // 글자에 들지 않는 점: 가까운 무리의 가운데로 빨려 들어가며 사라짐
          var g = Math.floor(Math.random() * 3), bx = items[g].box;
          P.grp[i] = g;
          P.tx[i] = bx.x + bx.w * rnd(0.2, 0.8);
          P.ty[i] = bx.y + bx.h * rnd(0.3, 0.7);
          P.sh[i] = 1;
        }
        P.dl[i] = rnd(0, 0.18); // 출발 시각 차이
        P.sw[i] = rnd(0.25, 1) * (Math.random() < 0.5 ? -1 : 1) * M * 0.14; // 빨려 들어갈 때 휘는 정도
      }
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
      textSprites = items.map(function (it) { return makeTextSprite(it, B.dpr, false); });
      glowSprites = items.map(function (it) { return makeTextSprite(it, B.dpr, true); });
      ready = true;
    }

    // 실제 카드가 그사이 움직였으면(글꼴 교체·레이아웃 변화) 같은 만큼 옮김 — 한 번만
    var rechecked = false;
    function recheck() {
      rechecked = true;
      if (mode !== "match") return;
      var r = items[0].el.getBoundingClientRect();
      var dx = r.left - items[0].box.x, dy = r.top - items[0].box.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      logEvent("숫자 카드 위치가 바뀌어 " + Math.round(dx) + "," + Math.round(dy) + "px 옮김");
      for (var i = 0; i < N; i++) {
        P.tx[i] += dx;
        P.ty[i] += dy;
      }
      for (var k = 0; k < 3; k++) {
        textSprites[k].x += dx; textSprites[k].y += dy;
        glowSprites[k].x += dx; glowSprites[k].y += dy;
      }
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

    var stats = { frames: 0, intervals: [], at: [], points: 0, reduced: false, maxGap: 0, stalls: 0, stallTotal: 0, mode: "" };
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
            var jx = P.jx[i] * (1 - snapK), jy = P.jy[i] * (1 - snapK);
            var txi = P.tx[i] + jx, tyi = P.ty[i] + jy;
            var dx = txi - fx, dy = tyi - fy, len = Math.hypot(dx, dy) || 1;
            var bend = Math.sin(Math.PI * e) * P.sw[i] * Math.min(1, len / (M * 0.6));
            x = fx + dx * e - (dy / len) * bend;
            y = fy + dy * e + (dx / len) * bend;
          }
          var size = P.sz[i] + (P.tg[i] ? (items[P.grp[i]].font.size / 22 - P.sz[i]) * smooth(p) : 0);
          if (!P.tg[i]) {
            // 글자에 들지 않는 점: 도착할수록 작아지며 사라짐
            var fade = 1 - clamp01((p - 0.55) / 0.4);
            if (fade <= 0.02) continue;
            size *= fade;
          }
          var bi = flash > 0.5 && P.tg[i] ? SHADES * LEVELS : P.sh[i] * LEVELS + Math.round(smooth(p) * (LEVELS - 1));
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
            ox += (P.tx[ii] - ox) * e2;
            oy += (P.ty[ii] - oy) * e2;
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
      // 가운데: 1.3 에 완성된 뒤 카드 쪽(아래)으로 22px 내려가며 사라짐 — 덮개가 걷히기 전에 다 사라져 페이지 글자 위에 남지 않음
      var exitK = mode === "center" ? smooth(clamp01((t - T_REVEAL) / CENTER_EXIT)) : 0;
      var textA = mode === "match"
        ? (t < 1.6 ? crisp : crisp * (1 - clamp01((t - 1.6) / 0.1)))
        : crisp * (1 - exitK);
      var lift = mode === "center" ? 22 * exitK : 0;
      if (flash > 0.01) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = flash * 0.85;
        for (var gi = 0; gi < 3; gi++) {
          var gs = glowSprites[gi];
          ctx.drawImage(gs.img, gs.x, gs.y + lift, gs.w, gs.h);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      if (textA > 0.01) {
        ctx.globalAlpha = textA;
        for (var ti = 0; ti < 3; ti++) {
          var ts = textSprites[ti];
          ctx.drawImage(ts.img, ts.x, ts.y + lift, ts.w, ts.h);
        }
      }
      ctx.globalAlpha = 1;
    }

    var start = performance.now(), last = start, frame = 0, done = false, begun = false;
    // 시각에 맞춘 알림: 1.3 숫자 완성 → "건너뛰기" 표시가 서서히 사라짐, revealAt → 덮개가 걷히며 소개 문구가 떠오름
    var cuedLabel = false, cuedReveal = false;
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
      if (!rechecked && t >= 1.0) recheck();
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
      bg.width = bg.height = 0;
      textSprites.concat(glowSprites).forEach(function (s) { s.img.width = s.img.height = 0; });
      P = null;
      if (opts.onEnd) opts.onEnd();
    }
    function skip(reason, detail) {
      if (done) return;
      if (reason) logReason(reason, detail);
      if (opts.onSkip) opts.onSkip();
      finish();
    }
    function begin() {
      if (begun || done) return;
      begun = true;
      // 숫자 자리·글자 점은 페이지 준비가 끝난 지금 한 번만 계산 (레이아웃·글꼴이 자리 잡은 뒤)
      try {
        build();
        stats.points = N;
        stats.mode = mode;
        if (window.__hubIntroLog) {
          window.__hubIntroLog.begin = Math.round(performance.now());
          logEvent("숫자 자리: " + (mode === "match" ? "실제 카드" : "화면 가운데") + " · 점 " + N + "개");
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
      var warmList = sprites.digits.concat(sprites.cells, sprites.checks, sprites.bars, textSprites, glowSprites);
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
        logReason("정상 완료", s && "프레임 " + s.frames + "장 · 가장 긴 간격 " + s.maxGap + "ms" + (s.stalls ? " · 멈춤 보정 " + s.stalls + "회" : "") + " · " + (s.mode === "match" ? "실제 카드에 맞춤" : "화면 가운데"));
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

  window.HubDataIntro = { version: 1 };
  if (document.body) prepareIntro();
  else document.addEventListener("DOMContentLoaded", prepareIntro, { once: true });
})();
