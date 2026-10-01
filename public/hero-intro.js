/*
 * 화면 전체 우주 연출 (React 와 무관한 작은 스크립트, 이미지 파일 없이 canvas 로 그림).
 * - 첫 방문 도착 연출: app/layout.js 의 <head> 스크립트가 <html class="hub-intro"> 를 붙이고(CSS 덮개),
 *   이 파일을 async 로 불러옴 → 캔버스 오버레이가 덮개를 이어받아 1.8초 안에 연출 후 완전히 사라짐
 * - "프로젝트 보기" 워프([data-warp]): 같은 빛줄기·데이터 조각으로 0.6초 덮고 프로젝트 영역으로 이동
 *   (평소에는 components/home/HeroStarfield.js 가 브라우저가 한가할 때 이 파일을 불러옴)
 * - 움직임 줄이기: 연출·워프 모두 하지 않음 (워프는 원래 링크 동작)
 * - 성능: 빛줄기는 "꼬리·중간·머리" 세 토막으로 나눠 같은 색·깊이·토막끼리 한 번에 그림(프레임당 수십 번).
 *   개수는 화면 크기·기기 성능으로 정하고, 처음 10프레임 중앙값이 느리면 더 줄임.
 *   프레임 기록은 window.__hubIntroStats (확인용)
 *
 * 그리는 순서: 어두운 바탕 → 가장자리 빛망울(보케) → 터널 번짐 → 빛줄기(가산 혼합) → 데이터 조각
 *            → 가운데 빛 덩어리 → 섬광(방사형) → 가로 렌즈 플레어 → 가장자리 어둡게(비네트, 끝까지)
 */
(function () {
  "use strict";
  if (window.HubIntro) return;

  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  // 빛줄기 색: 청록·파랑 위주에 사이트 보라, 약간의 흰빛
  var COLORS = [
    [103, 232, 249, 0.36], // 청록
    [96, 165, 250, 0.32], // 파랑
    [167, 139, 250, 0.2], // 보라 (사이트 색)
    [224, 242, 254, 0.12], // 흰빛
  ];
  // 데이터 조각 색: 청록·하늘색
  var SHARD_COLORS = [
    [103, 232, 249],
    [125, 211, 252],
    [165, 243, 252],
    [56, 189, 248],
  ];
  var SITE_BG = [11, 14, 20];
  var Z_FAR = 3.6; // 가장 먼 깊이 (클수록 소실점 둘레가 촘촘)
  // 빛줄기 깊이 층: 먼 것은 가늘고 선명, 가까운 것은 굵고 흐릿
  var DEPTHS = [
    { until: 0.45, width: 0.7, alpha: 0.95 },
    { until: 0.78, width: 1.6, alpha: 0.6 },
    { until: 1.01, width: 4.2, alpha: 0.2 },
  ];
  // 빛줄기 토막: 꼬리(투명) → 머리(밝음)
  var SEGMENTS = [
    { from: 0, to: 0.45, alpha: 0.1 },
    { from: 0.45, to: 0.8, alpha: 0.38 },
    { from: 0.8, to: 1, alpha: 1 },
  ];

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }
  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";
  }
  function pickColorIndex() {
    var r = Math.random();
    for (var i = 0; i < COLORS.length; i++) if ((r -= COLORS[i][3]) <= 0) return i;
    return 0;
  }
  function bell(t, a, peak, b) {
    if (t <= a || t >= b) return 0;
    return t < peak ? Math.sin(((t - a) / (peak - a)) * Math.PI / 2) : Math.cos(((t - peak) / (b - peak)) * Math.PI / 2);
  }

  // 화면 크기와 기기 성능으로 개수 결정
  function budget(w, h) {
    var area = w * h;
    var slow = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    var k = slow ? 0.6 : 1;
    return {
      streaks: Math.round(Math.max(560, Math.min(1800, area / 720)) * k),
      shards: Math.round(Math.max(34, Math.min(40, area / 36000)) * k),
      bokeh: w < 640 ? 7 : 12,
      dpr: Math.min(devicePixelRatio || 1, w < 640 ? 1.5 : 1.25),
    };
  }

  // 빛줄기: 70%는 소실점 둘레 원통 벽(터널), 30%는 안쪽에 흩어짐
  function makeStreak(z) {
    var ang = rnd(0, 6.2832);
    var r = Math.random() < 0.7 ? rnd(0.75, 1.25) : Math.sqrt(Math.random()) * 1.2 + 0.08;
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r, z: z, c: pickColorIndex(), l: rnd(0.55, 1.45), hi: Math.random() < 0.35 ? 1 : 0 };
  }
  function makeShard(z) {
    var ang = rnd(0, 6.2832), r = rnd(0.25, 1.1);
    return { x: Math.cos(ang) * r, y: Math.sin(ang) * r, z: z, c: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)], s: rnd(0.5, 1.6), a: rnd(0.55, 1), r: rnd(0, 6.28), vr: rnd(-1.2, 1.2) };
  }

  // 한 번의 연출 (도착 또는 워프). timeline(t초) 이 속도·섬광·투명도를 정함
  function run(opts) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;pointer-events:none;opacity:1";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var w = innerWidth, h = innerHeight;
    var B = budget(w, h);
    canvas.width = Math.round(w * B.dpr);
    canvas.height = Math.round(h * B.dpr);
    ctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    var cx = w / 2, cy = h / 2, F = Math.max(w, h) * 0.62, M = Math.min(w, h), D = Math.hypot(cx, cy);

    var streaks = [], shards = [], bokeh = [], i;
    for (i = 0; i < B.streaks; i++) streaks.push(makeStreak(rnd(0.2, Z_FAR)));
    for (i = 0; i < B.shards; i++) shards.push(makeShard(rnd(0.5, Z_FAR * 0.7)));
    for (i = 0; i < B.bokeh; i++) {
      var ang = rnd(0, 6.28), dist = rnd(0.38, 0.62);
      bokeh.push({ x: cx + Math.cos(ang) * w * dist, y: cy + Math.sin(ang) * h * dist, r: rnd(M * 0.06, M * 0.16), c: COLORS[i % 3], a: rnd(0.05, 0.12), vx: rnd(-6, 6), vy: rnd(-6, 6) });
    }
    // 비네트는 한 번만 만들어 두고 매 프레임 맨 위에 덮음 (끝까지 유지)
    var vignette = document.createElement("canvas");
    vignette.width = canvas.width;
    vignette.height = canvas.height;
    var vctx = vignette.getContext("2d");
    vctx.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
    var vg = vctx.createRadialGradient(cx, cy, M * 0.3, cx, cy, D);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.78)");
    vctx.fillStyle = vg;
    vctx.fillRect(0, 0, w, h);

    // 빛줄기 묶음: [색][깊이층 × 2 밝기][토막] → 좌표 목록
    var buckets = [];
    function clearBuckets() {
      for (var b = 0; b < COLORS.length * DEPTHS.length * 2 * SEGMENTS.length; b++) {
        if (buckets[b]) buckets[b].length = 0;
        else buckets[b] = [];
      }
    }

    var start = performance.now(), last = start, frame = 0, done = false;
    var stats = { frames: 0, intervals: [], at: [], shardsOnScreen: [], streaks: B.streaks, shards: B.shards, reduced: false };
    window.__hubIntroStats = stats;

    function draw(t, dt) {
      var tl = opts.timeline(t);
      var S = tl.speed;
      var fade = tl.elements;
      // 바탕: 짙은 남색 → 끝날 때 사이트 배경색으로
      var m = tl.toSite;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgb(" + Math.round(4 + (SITE_BG[0] - 4) * m) + "," + Math.round(6 + (SITE_BG[1] - 6) * m) + "," + Math.round(16 + (SITE_BG[2] - 16) * m) + ")";
      ctx.fillRect(0, 0, w, h);
      if (m > 0) {
        // 사이트 소개 카드의 보라빛 번짐과 비슷한 색으로 이어지게
        var pg = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, M * 0.9);
        pg.addColorStop(0, "rgba(139,92,246," + 0.22 * m + ")");
        pg.addColorStop(1, "rgba(139,92,246,0)");
        ctx.fillStyle = pg;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = "lighter";
      // 가장자리 빛망울
      for (i = 0; i < bokeh.length; i++) {
        var o = bokeh[i];
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        var bg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        bg.addColorStop(0, rgba(o.c, o.a * fade));
        bg.addColorStop(0.6, rgba(o.c, o.a * 0.4 * fade));
        bg.addColorStop(1, rgba(o.c, 0));
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, 6.2832);
        ctx.fill();
      }

      // 터널 번짐: 속도에 따라 짙어지는 청록·파랑·보라
      var tun = clamp01(S / 97) * fade;
      if (tun > 0.02) {
        var tg = ctx.createRadialGradient(cx, cy, M * 0.04, cx, cy, D);
        tg.addColorStop(0, "rgba(34,211,238," + 0.18 * tun + ")");
        tg.addColorStop(0.3, "rgba(59,130,246," + 0.13 * tun + ")");
        tg.addColorStop(0.65, "rgba(139,92,246," + 0.08 * tun + ")");
        tg.addColorStop(1, "rgba(139,92,246,0)");
        ctx.fillStyle = tg;
        ctx.fillRect(0, 0, w, h);
      }

      // 빛줄기: 속도가 빠를수록 많이 (가장 빠른 구간에 전부)
      var active = Math.round(streaks.length * (0.35 + 0.65 * clamp01(S / 90)));
      var tail = Math.min(2.4, 0.024 * S);
      clearBuckets();
      for (i = 0; i < active; i++) {
        var s = streaks[i];
        s.z -= 0.075 * S * dt;
        if (s.z < 0.06) { streaks[i] = makeStreak(Z_FAR); continue; }
        var hx = cx + (s.x / s.z) * F, hy = cy + (s.y / s.z) * F;
        if (hx < -120 || hx > w + 120 || hy < -120 || hy > h + 120) { streaks[i] = makeStreak(Z_FAR); continue; }
        var tz = Math.min(Z_FAR + 1, s.z + tail * s.l);
        var tx = cx + (s.x / tz) * F, ty = cy + (s.y / tz) * F;
        var near = 1 - s.z / Z_FAR;
        if (near < 0.03) continue;
        var di = near < DEPTHS[0].until ? 0 : near < DEPTHS[1].until ? 1 : 2;
        var base = ((s.c * DEPTHS.length + di) * 2 + s.hi) * SEGMENTS.length;
        for (var g = 0; g < SEGMENTS.length; g++) {
          var a0 = SEGMENTS[g].from, a1 = SEGMENTS[g].to;
          buckets[base + g].push(tx + (hx - tx) * a0, ty + (hy - ty) * a0, tx + (hx - tx) * a1, ty + (hy - ty) * a1);
        }
      }
      ctx.lineCap = "butt";
      for (var ci = 0; ci < COLORS.length; ci++) {
        for (var dj = 0; dj < DEPTHS.length; dj++) {
          for (var hi = 0; hi < 2; hi++) {
            for (g = 0; g < SEGMENTS.length; g++) {
              var list = buckets[((ci * DEPTHS.length + dj) * 2 + hi) * SEGMENTS.length + g];
              if (!list.length) continue;
              ctx.strokeStyle = rgba(COLORS[ci], DEPTHS[dj].alpha * SEGMENTS[g].alpha * (hi ? 1 : 0.6) * fade);
              ctx.lineWidth = DEPTHS[dj].width * (hi ? 1.25 : 1);
              ctx.beginPath();
              for (var k = 0; k < list.length; k += 4) {
                ctx.moveTo(list[k], list[k + 1]);
                ctx.lineTo(list[k + 2], list[k + 3]);
              }
              ctx.stroke();
            }
          }
        }
      }

      // 데이터 조각: 안이 밝게 차오른 사각형 + 빛 번짐, 다가올수록 커지고 짧은 잔상
      var onScreen = 0;
      for (i = 0; i < shards.length; i++) {
        var d = shards[i];
        d.z -= 0.03 * (3 + S * 0.5) * dt;
        d.r += d.vr * dt;
        if (d.z < 0.2) { shards[i] = makeShard(Z_FAR * 0.7); continue; }
        var px = cx + (d.x / d.z) * F, py = cy + (d.y / d.z) * F;
        var size = (d.s * 9) / d.z;
        var appear = clamp01((Z_FAR * 0.7 - d.z) / 0.4);
        var vanish = clamp01((d.z - 0.2) / 0.55); // 가까워질수록 흐려짐
        var sa = d.a * appear * vanish * fade;
        if (sa < 0.03 || px < -size * 3 || px > w + size * 3 || py < -size * 3 || py > h + size * 3) continue;
        onScreen++;
        // 잔상: 조금 전 위치에서 지금 위치까지
        var qz = d.z + Math.min(0.5, 0.004 * (3 + S * 0.5));
        var qx = cx + (d.x / qz) * F, qy = cy + (d.y / qz) * F;
        ctx.strokeStyle = rgba(d.c, sa * 0.35);
        ctx.lineWidth = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(d.r);
        ctx.fillStyle = rgba(d.c, sa * 0.12);
        ctx.fillRect(-size * 1.6, -size * 1.6, size * 3.2, size * 3.2); // 넓은 번짐
        ctx.fillStyle = rgba(d.c, sa * 0.3);
        ctx.fillRect(-size * 0.9, -size * 0.9, size * 1.8, size * 1.8); // 가까운 번짐
        ctx.fillStyle = rgba(d.c, sa * 0.9);
        ctx.fillRect(-size / 2, -size / 2, size, size); // 밝게 찬 사각형
        ctx.fillStyle = "rgba(240,253,255," + sa * 0.7 + ")";
        ctx.fillRect(-size / 5, -size / 5, size / 2.5, size / 2.5); // 가운데 흰빛
        ctx.restore();
      }

      if (fade > 0.9) stats.shardsOnScreen.push(onScreen);

      // 가운데 빛 덩어리와 큰 번짐
      var core = tl.core;
      if (core > 0) {
        var cr = M * (0.05 + 0.1 * core);
        var cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 5);
        cg.addColorStop(0, "rgba(245,255,255," + Math.min(1, 0.95 * core + 0.2) + ")");
        cg.addColorStop(0.1, "rgba(165,243,252," + 0.8 * core + ")");
        cg.addColorStop(0.35, "rgba(34,211,238," + 0.25 * core + ")");
        cg.addColorStop(1, "rgba(59,130,246,0)");
        ctx.fillStyle = cg;
        ctx.fillRect(0, 0, w, h);
      }

      // 섬광: 가운데는 하얗게 강렬하고 가장자리로 갈수록 빠르게 어두워지는 방사형
      var f = tl.flash;
      if (f > 0) {
        var fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, D * 0.95);
        fg.addColorStop(0, "rgba(255,255,255," + f + ")");
        fg.addColorStop(0.1, "rgba(236,254,255," + 0.95 * f + ")");
        fg.addColorStop(0.28, "rgba(165,243,252," + 0.55 * f + ")");
        fg.addColorStop(0.55, "rgba(34,150,220," + 0.16 * f + ")");
        fg.addColorStop(1, "rgba(30,60,140,0)");
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, w, h);
      }
      // 가로 렌즈 플레어: 소실점을 가로지르는 얇고 긴 빛줄기
      var fl = tl.flare;
      if (fl > 0) {
        var lg = ctx.createLinearGradient(0, cy, w, cy);
        lg.addColorStop(0, "rgba(56,189,248,0)");
        lg.addColorStop(0.3, "rgba(103,232,249," + 0.35 * fl + ")");
        lg.addColorStop(0.5, "rgba(255,255,255," + fl + ")");
        lg.addColorStop(0.7, "rgba(103,232,249," + 0.35 * fl + ")");
        lg.addColorStop(1, "rgba(56,189,248,0)");
        ctx.fillStyle = lg;
        ctx.fillRect(0, cy - 1, w, 2);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(0, cy - 7, w, 14);
        ctx.globalAlpha = 1;
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(vignette, 0, 0, w, h);
      canvas.style.opacity = String(tl.opacity);
    }

    function tick(now) {
      if (done) return;
      var t = (now - start) / 1000;
      var dt = Math.min(0.05, (now - last) / 1000);
      if (stats.frames > 0) {
        stats.intervals.push(Math.round(now - last));
        stats.at.push(Math.round(t * 1000));
      }
      last = now;
      stats.frames++;
      // 처음 10프레임 중앙값이 22ms 넘으면 빛줄기·조각을 40% 줄임
      // (중앙값: 페이지 준비 작업과 겹친 한두 번의 긴 멈춤에 흔들리지 않게)
      if (stats.frames === 11 && !stats.reduced) {
        var sorted = stats.intervals.slice().sort(function (a, b) { return a - b; });
        if (sorted[Math.floor(sorted.length / 2)] > 22) {
          streaks.length = Math.round(streaks.length * 0.6);
          shards.length = Math.round(shards.length * 0.6);
          stats.reduced = true;
          stats.streaks = streaks.length;
          stats.shards = shards.length;
        }
      }
      if (t >= opts.duration) { finish(); return; }
      if (opts.onTime) opts.onTime(t);
      draw(t, dt);
      frame = requestAnimationFrame(tick);
    }

    // 끝: 오버레이와 그리기 루프를 완전히 없앰
    function finish() {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      canvas.remove();
      vignette.width = vignette.height = 0;
      buckets = streaks = shards = null;
      if (opts.onEnd) opts.onEnd();
    }
    // 건너뛰기: 0.18초 만에 걷힘 (아직 시작 전이면 바로 없앰)
    function skip() {
      if (done) return;
      if (!begun) { finish(); return; }
      var from = Number(canvas.style.opacity) || 1;
      var s0 = performance.now();
      opts.timeline = function () {
        var k = clamp01((performance.now() - s0) / 180);
        return { speed: 1, elements: 1 - k, core: 0, flash: 0, flare: 0, toSite: 1, opacity: from * (1 - k) };
      };
      opts.duration = (performance.now() - start) / 1000 + 0.2;
      if (opts.onSkip) opts.onSkip();
    }

    // 첫 장면을 미리 그려 둠: 새 캔버스를 처음 그릴 때의 초기화 멈춤이 움직이기 전(정지 장면)에 생기게
    var begun = false;
    function begin() {
      if (begun || done) return;
      begun = true;
      start = last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    draw(0, 0);
    if (!opts.deferStart) begin();
    return { skip: skip, finish: finish, begin: begin };
  }

  // 도착 연출 흐름 (초): 0~1.25 점점 빨라짐 → 1.29 가장 밝음(짧게) → 1.34 걷히기 시작(글자 떠오름) → 1.74 끝
  var REVEAL_AT = 1.34;
  function introTimeline(t) {
    var acc = clamp01(t / 1.25);
    return {
      speed: t < 1.25 ? 10 + 87 * Math.pow(acc, 1.8) : 97 * (1 - clamp01((t - 1.25) / 0.2)),
      core: Math.min(1, 0.35 + 0.65 * Math.pow(acc, 1.5)) * (t < 1.32 ? 1 : 1 - clamp01((t - 1.32) / 0.14)),
      flash: bell(t, 1.22, 1.29, 1.39),
      flare: 0.95 * bell(t, 1.2, 1.29, 1.46),
      elements: t < 1.28 ? 1 : 1 - clamp01((t - 1.28) / 0.14),
      toSite: clamp01((t - 1.3) / 0.12),
      opacity: t < REVEAL_AT ? 1 : 1 - clamp01((t - REVEAL_AT) / 0.38),
    };
  }

  // 워프 흐름 (초): 0~0.1 덮기 → 0.42까지 가속 → 0.45 가장 밝을 때 프로젝트 영역으로 이동 → 0.72 걷힘
  function warpTimeline(t) {
    var acc = clamp01(t / 0.42);
    return {
      speed: 20 + 77 * Math.pow(acc, 1.6),
      core: 0.4 + 0.6 * acc,
      flash: bell(t, 0.38, 0.45, 0.54),
      flare: 0.9 * bell(t, 0.37, 0.45, 0.58),
      elements: t < 0.45 ? 1 : 1 - clamp01((t - 0.45) / 0.12),
      toSite: clamp01((t - 0.46) / 0.1),
      opacity: t < 0.1 ? t / 0.1 : t < 0.52 ? 1 : 1 - clamp01((t - 0.52) / 0.2),
    };
  }

  // 첫 방문 도착 연출: 파일을 받자마자 캔버스와 첫 장면을 준비하고, 페이지 준비가 끝나면 움직이기 시작
  var intro = null;
  function prepareIntro() {
    var root = document.documentElement;
    if (intro || !root.classList.contains("hub-intro") || reducedQuery.matches || !document.body) return;
    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      if (window.__hubIntroReveal) window.__hubIntroReveal();
    }
    intro = run({
      deferStart: true,
      duration: REVEAL_AT + 0.4,
      timeline: introTimeline,
      onTime: function (t) {
        if (t >= REVEAL_AT) reveal();
      },
      onSkip: reveal,
      onEnd: function () {
        reveal();
        if (window.__hubIntroEnd) window.__hubIntroEnd();
      },
    });
    window.__hubIntroSkip = intro.skip;
    whenQuiet(function () {
      // 너무 늦어지면(페이지를 연 지 1.8초 넘음) 연출 없이 걷음
      if (performance.now() > 1800) intro.skip();
      else intro.begin();
    });
  }

  // "프로젝트 보기" 워프
  var warping = false;
  function onClick(e) {
    var link = e.target.closest && e.target.closest("[data-warp]");
    if (!link || warping || reducedQuery.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var hash = link.getAttribute("href");
    var target = hash && document.querySelector(hash);
    if (!target) return;
    e.preventDefault();
    warping = true;
    var moved = false;
    function move() {
      if (moved) return;
      moved = true;
      history.pushState(null, "", hash);
      target.scrollIntoView({ behavior: "instant", block: "start" });
    }
    run({
      duration: 0.74,
      timeline: warpTimeline,
      onTime: function (t) {
        if (t >= 0.45) move();
      },
      onEnd: function () {
        move();
        warping = false;
      },
    });
  }
  document.addEventListener("click", onClick);

  // 메인 화면 준비(Next·React 스크립트 실행·하이드레이션)와 겹치면 연출 첫 0.4초가 끊기므로,
  // 소개 카드 컴포넌트가 준비 끝 신호(hub:hydrated, components/home/HeroStarfield.js)를 보낸 뒤
  // 브라우저가 한가할 때 시작 (최대 1.5초 대기). 그동안은 미리 그려 둔 첫 장면(덮개와 같은 모양)이 보임
  function whenQuiet(cb) {
    var fired = false;
    function go() {
      if (fired) return;
      fired = true;
      cb();
    }
    function afterHydrate() {
      if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 300 });
      else setTimeout(go, 50);
    }
    if (window.__hubHydrated) afterHydrate();
    else addEventListener("hub:hydrated", afterHydrate, { once: true });
    setTimeout(go, 1500); // 아무리 늦어도
  }

  window.HubIntro = { warp: onClick };
  if (document.body) prepareIntro();
  else document.addEventListener("DOMContentLoaded", prepareIntro, { once: true });
})();
