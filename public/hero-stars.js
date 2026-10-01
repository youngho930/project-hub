/*
 * 첫 화면 소개 영역의 별빛 우주 효과 (React 와 무관한 작은 스크립트).
 * - components/home/HeroStarfield.js 가 브라우저가 한가할 때 불러옴 → 첫 화면 그리기를 막지 않음
 * - 화려한 효과(첫 방문 도착 연출, "프로젝트 보기" 워프)는 화면 전체 연출 public/hero-intro.js 가 맡음
 * - window.HubStars.mount(section) → 정리 함수. section 안의 canvas[data-hero-stars] 에 그림
 *
 * 구성
 * - 소실점: 소개 카드 가운데. 모든 별은 이 점에서 바깥으로 아주 천천히 다가옴 (3층: 먼 별·중간·가까운 별)
 * - 일부 별은 천천히 반짝임, 10~15초에 한 번 카드 가장자리 쪽으로 짧은 별똥별 (글자 위는 지나가지 않음)
 * - [data-star-dim] 영역(소개 문구) 뒤는 별을 더 적고 어둡게, [data-star-avoid] 는 별똥별이 피함
 * - 움직임 줄이기: 멈춘 별 그림 한 장 (반짝임·별똥별·기울기 없음)
 * - 소개 영역이 화면 밖이거나 탭이 숨겨지면 그리기 멈춤. 평소 30fps, 별똥별이 지나갈 때만 매 프레임
 */
(function () {
  "use strict";
  if (window.HubStars) return;

  var DRIFT = 0.028; // 초당 깊이 이동 (1 = 가장 먼 곳 → 눈앞)
  var NEAR = 0.05;
  var IDLE_FRAME_MS = 33;
  var PARALLAX_PX = 20;
  var DIM_ALPHA = 0.3; // 소개 문구 뒤 별 밝기 배율
  var DIM_SKIP = 0.6; // 소개 문구 뒤에서 그리지 않는 별 비율
  // 층: 비율, 크기, 밝기, 다가오는 속도 배율, 기울기 배율
  var LAYERS = [
    { share: 0.62, size: [0.35, 0.65], alpha: [0.22, 0.42], speed: 0.45, tilt: 0.25 },
    { share: 0.28, size: [0.6, 1.0], alpha: [0.4, 0.62], speed: 1, tilt: 0.55 },
    { share: 0.1, size: [0.95, 1.55], alpha: [0.6, 0.85], speed: 1.7, tilt: 1 },
  ];
  // 흰빛 위주, 보라·주황이 은은하게
  var TINTS = [
    [255, 255, 255, 0.72],
    [226, 220, 255, 0.16], // 보라빛
    [255, 226, 196, 0.12], // 주황빛
  ];

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }
  function pickTint() {
    var r = Math.random();
    for (var i = 0; i < TINTS.length; i++) {
      if ((r -= TINTS[i][3]) <= 0) return TINTS[i];
    }
    return TINTS[0];
  }
  function easeInQuad(t) {
    return t * t;
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function makeStar(z) {
    var r = Math.random(), layer = 0;
    for (var i = 0; i < LAYERS.length; i++) {
      if ((r -= LAYERS[i].share) <= 0) { layer = i; break; }
    }
    var L = LAYERS[layer];
    return {
      x: rnd(-1, 1),
      y: rnd(-1, 1),
      z: z,
      layer: layer,
      size: rnd(L.size[0], L.size[1]),
      alpha: rnd(L.alpha[0], L.alpha[1]),
      tint: pickTint(),
      twinkle: Math.random() < 0.28 ? { phase: rnd(0, 6.28), speed: rnd(0.5, 1.3) } : null,
      sparse: Math.random() < DIM_SKIP,
    };
  }

  function mount(section) {
    var canvas = section && section.querySelector("canvas[data-hero-stars]");
    if (!canvas) return function () {};
    if (section.__hubStars) return section.__hubStars;
    var ctx = canvas.getContext("2d");
    var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
    var pointerQuery = matchMedia("(hover: hover) and (pointer: fine)");

    var width = 0, height = 0, cx = 0, cy = 0, focal = 0;
    var stars = [], dimRects = [], avoidRects = [];
    var frame = 0, last = 0, lastDraw = 0, visible = true, destroyed = false;
    var shoot = null, nextShoot = 0;
    var tilt = { x: 0, y: 0, tx: 0, ty: 0 };

    function rectsOf(selector, pad) {
      var box = section.getBoundingClientRect();
      return Array.prototype.map.call(section.querySelectorAll(selector), function (el) {
        var r = el.getBoundingClientRect();
        return { l: r.left - box.left - pad, t: r.top - box.top - pad, r: r.right - box.left + pad, b: r.bottom - box.top + pad };
      });
    }
    function inRects(rects, x, y) {
      for (var i = 0; i < rects.length; i++) {
        var d = rects[i];
        if (x > d.l && x < d.r && y > d.t && y < d.b) return true;
      }
      return false;
    }

    function resize() {
      var box = section.getBoundingClientRect();
      var dpr = Math.min(devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = width / 2;
      cy = height / 2;
      focal = Math.max(width, height) * 0.55;
      dimRects = rectsOf("[data-star-dim]", 10);
      avoidRects = dimRects.concat(rectsOf("[data-star-avoid]", 14));
      var count = Math.min(460, Math.round((width * height) / 1400));
      if (stars.length !== count) {
        stars = [];
        for (var i = 0; i < count; i++) stars.push(makeStar(rnd(0.08, 1)));
      }
    }

    function project(s, z, ox, oy) {
      return [cx + (s.x / z) * focal + ox, cy + (s.y / z) * focal + oy];
    }

    function drawShoot(now) {
      if (!shoot) return;
      var t = (now - shoot.start) / shoot.dur;
      if (t >= 1) { shoot = null; return; }
      var p = easeOutCubic(t);
      var hx = shoot.x + shoot.dx * shoot.dist * p;
      var hy = shoot.y + shoot.dy * shoot.dist * p;
      var len = shoot.len * Math.sin(Math.PI * Math.min(1, t * 1.15));
      var tx = hx - shoot.dx * len, ty = hy - shoot.dy * len;
      var a = 0.85 * Math.sin(Math.PI * t);
      var g = ctx.createLinearGradient(tx, ty, hx, hy);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255," + a + ")");
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(226,220,255," + a * 0.18 + ")";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    }

    // 별똥별 경로: 카드 가장자리 쪽, 글자 영역([data-star-dim], [data-star-avoid])을 지나지 않는 것만
    function planShoot(now) {
      // 출발점은 카드 가장자리 띠(위·아래·오른쪽)에서 고르고, 거리를 줄여 가며 맞는 경로를 찾음
      var edges = [
        function () { return [rnd(20, width - 20), rnd(10, Math.min(70, height * 0.15))]; },
        function () { return [rnd(20, width - 20), rnd(Math.max(height * 0.85, height - 60), height - 10)]; },
        function () { return [rnd(Math.max(width * 0.6, width - 360), width - 20), rnd(10, height - 10)]; },
      ];
      for (var tries = 0; tries < 300; tries++) {
        var dir = Math.random() < 0.5 ? Math.PI : 0;
        var angle = dir + (dir ? -1 : 1) * rnd(0.05, 0.35); // 살짝 아래로
        var dx = Math.cos(angle), dy = Math.sin(angle);
        var dist = rnd(140, 280) * (1 - tries / 450), len = rnd(60, 110);
        var p0 = edges[tries % edges.length]();
        var x = p0[0], y = p0[1];
        var ok = true;
        for (var k = 0; k <= 12 && ok; k++) {
          var px = x + dx * dist * (k / 12), py = y + dy * dist * (k / 12);
          if (px < 12 || px > width - 12 || py < 10 || py > height - 10) ok = false;
          else if (inRects(avoidRects, px, py) || inRects(avoidRects, px - dx * len, py - dy * len)) ok = false;
        }
        if (ok) {
          shoot = { x: x, y: y, dx: dx, dy: dy, dist: dist, len: len, start: now, dur: rnd(650, 850) };
          return;
        }
      }
    }

    function draw(now, dt) {
      var sec = now / 1000;
      ctx.clearRect(0, 0, width, height);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var L = LAYERS[s.layer];
        s.z -= DRIFT * L.speed * dt;
        if (s.z <= NEAR) { stars[i] = makeStar(1); continue; }
        var ox = tilt.x * PARALLAX_PX * L.tilt, oy = tilt.y * PARALLAX_PX * L.tilt;
        var head = project(s, s.z, ox, oy);
        var x = head[0], y = head[1];
        if (x < -60 || x > width + 60 || y < -60 || y > height + 60) { stars[i] = makeStar(1); continue; }
        var near = 1 - s.z; // 0 멀리 ~ 1 가까이
        var appear = Math.min(1, near / 0.12);
        var alpha = s.alpha * appear * (0.75 + 0.5 * near);
        if (s.twinkle && !reducedQuery.matches) alpha *= 0.6 + 0.4 * Math.sin(s.twinkle.phase + sec * s.twinkle.speed);
        if (inRects(dimRects, x, y)) {
          if (s.sparse) continue;
          alpha *= DIM_ALPHA;
        }
        alpha = Math.min(0.95, alpha);
        var r = s.size * (0.7 + 0.8 * near);
        var c = s.tint;
        ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
        if (r < 0.8) {
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        } else {
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
          if (s.layer === 2) {
            // 가까운 별은 은은한 빛 번짐
            ctx.fillStyle = "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha * 0.12 + ")";
            ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, 6.2832); ctx.fill();
          }
        }
      }
      drawShoot(now);
    }

    function tick(now) {
      frame = requestAnimationFrame(tick);
      tilt.x += (tilt.tx - tilt.x) * 0.06;
      tilt.y += (tilt.ty - tilt.y) * 0.06;
      if (!shoot && now >= nextShoot) {
        planShoot(now);
        nextShoot = now + rnd(10000, 15000);
      }
      var busy = !!shoot;
      if (!busy && now - lastDraw < IDLE_FRAME_MS) return;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      lastDraw = now;
      draw(now, dt);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    function start() {
      if (frame || destroyed || reducedQuery.matches || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function drawStill() {
      draw(performance.now(), 0);
    }

    function onPointer(e) {
      tilt.tx = (e.clientX / innerWidth - 0.5) * 2;
      tilt.ty = (e.clientY / innerHeight - 0.5) * 2;
    }
    function listenPointer() {
      removeEventListener("pointermove", onPointer);
      tilt.tx = tilt.ty = 0;
      if (pointerQuery.matches && !reducedQuery.matches) addEventListener("pointermove", onPointer, { passive: true });
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }
    function onMotion() {
      stop();
      shoot = null;
      listenPointer();
      if (reducedQuery.matches) drawStill();
      else start();
    }

    resize();
    // 첫 별똥별은 조금 일찍(5~9초), 그 뒤로는 10~15초마다
    nextShoot = performance.now() + rnd(5000, 9000);
    drawStill();
    canvas.style.opacity = "1";

    var resizeObserver = new ResizeObserver(function () {
      resize();
      if (!frame) drawStill();
    });
    resizeObserver.observe(section);
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(section);
    document.addEventListener("visibilitychange", onVisibility);
    reducedQuery.addEventListener("change", onMotion);
    pointerQuery.addEventListener("change", listenPointer);
    listenPointer();
    start();

    function destroy() {
      destroyed = true;
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedQuery.removeEventListener("change", onMotion);
      pointerQuery.removeEventListener("change", listenPointer);
      removeEventListener("pointermove", onPointer);
      delete section.__hubStars;
    }
    section.__hubStars = destroy;
    return destroy;
  }

  window.HubStars = { mount: mount };

})();
