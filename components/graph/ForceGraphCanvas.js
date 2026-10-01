"use client";

import { forceCollide, forceX, forceY } from "d3-force-3d";
import { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  LABEL_FONT,
  LABEL_MIN_SCALE,
  LABEL_SIZE,
  labelWeight,
  radius,
} from "./types";

// 링크 길이: 프로젝트-기술은 조금 길게, 결정·효과는 프로젝트 가까이
function linkDistance(link) {
  const types = [link.source.type, link.target.type].sort().join("-");
  switch (types) {
    case "project-project":
      return 130;
    case "project-tech":
      return 75;
    case "part-tech":
      return 55;
    case "part-project":
      return 45;
    default: // decision-project, project-result
      return 24;
  }
}

// 충돌 반경: 이름이 항상 보이는 노드는 이름 글자 상자(그래프 단위 최대 크기)까지 감쌈
function makeCollideRadius() {
  const measure = document.createElement("canvas").getContext("2d");
  return (node) => {
    const r = radius(node);
    const size = LABEL_SIZE[node.type];
    if (!size) return r + 4;
    const fontSize = size / LABEL_MIN_SCALE;
    measure.font = `${labelWeight(node)} ${fontSize}px ${LABEL_FONT}`;
    const halfWidth = measure.measureText(node.name).width / 2;
    const labelBottom = r + 3 / LABEL_MIN_SCALE + fontSize * 1.2;
    return Math.max(r + 6, Math.hypot(halfWidth, labelBottom) * 0.86) + 2;
  };
}

// 그룹별 영역: 업무 자동화는 한쪽, 개인 AI 비서는 반대쪽으로 약하게 끌어당김.
// 프로젝트가 아닌 노드(기술·결정·효과·구성)는 연결된 프로젝트 그룹의 평균 쪽으로 →
// 두 그룹이 같이 쓰는 기술(Python 등)은 가운데에 놓임
const GROUP_SIDE = { "업무 자동화": -1, "개인 AI 비서": 1 };
const GROUP_SPREAD = 230; // 그래프 단위
const GROUP_STRENGTH = 0.07;

function makeGroupTarget(graphData) {
  const projectSide = new Map(
    graphData.nodes
      .filter((n) => n.type === "project")
      .map((n) => [n.projectId, GROUP_SIDE[n.group] ?? 0])
  );
  const linked = new Map();
  const add = (id, projectId) => {
    if (!projectSide.has(projectId)) return;
    if (!linked.has(id)) linked.set(id, []);
    linked.get(id).push(projectSide.get(projectId));
  };
  const projectIdOf = (id) => (id.startsWith("project:") ? id.slice(8) : null);
  for (const { source, target } of graphData.links) {
    const s = typeof source === "object" ? source.id : source;
    const t = typeof target === "object" ? target.id : target;
    if (projectIdOf(t)) add(s, projectIdOf(t));
    if (projectIdOf(s)) add(t, projectIdOf(s));
  }
  return (node) => {
    if (node.type === "project") return (projectSide.get(node.projectId) ?? 0) * GROUP_SPREAD;
    const sides = linked.get(node.id);
    if (!sides?.length) return 0;
    return (sides.reduce((sum, v) => sum + v, 0) / sides.length) * GROUP_SPREAD;
  };
}

// 배경 별빛: 화면 좌표에 흩뿌린 아주 작고 흐린 점. 노드보다 확실히 작고(반지름 0.8px 이하) 어둡게.
// 끌거나 확대하면 노드보다 훨씬 느리게(이동의 6%) 따라 움직여 깊이감만 줌. 움직임 줄이기면 고정.
const STAR_PARALLAX = 0.06;

function makeStars(width, height) {
  // 같은 크기면 항상 같은 배치 (간단한 의사 난수)
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const count = Math.round((width * height) / 5200);
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    r: 0.35 + rand() * 0.45,
    a: 0.07 + rand() * 0.16,
  }));
}

const EMPTY = { nodes: [], links: [] };

// next/dynamic(ssr: false)로 불러오는 캔버스. ref는 fgRef prop으로 받아 그대로 연결.
// axis: 그룹을 나눌 방향 ("x" 넓은 화면은 좌우, "y" 세로로 긴 화면은 위아래)
export default function ForceGraphCanvas({
  fgRef,
  graphData,
  axis = "x",
  reducedMotion = false,
  width,
  height,
  onRenderFramePre,
  ...props
}) {
  const [forcesReady, setForcesReady] = useState(false);
  const [stars, setStars] = useState(() => makeStars(width, height));
  const [starSize, setStarSize] = useState({ width, height });
  if (starSize.width !== width || starSize.height !== height) {
    setStarSize({ width, height });
    setStars(makeStars(width, height));
  }

  // warmupTicks는 graphData를 넘기는 순간 바로 계산되므로,
  // 빈 데이터로 먼저 그린 뒤 힘을 설정하고 나서 실제 데이터를 넘김
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-260).distanceMax(420);
    fg.d3Force("link")?.distance(linkDistance);
    fg.d3Force("collide", forceCollide(makeCollideRadius()).strength(0.9));
    const target = makeGroupTarget(graphData);
    const groupForce = axis === "x" ? forceX(target) : forceY(target);
    fg.d3Force("group", groupForce.strength(GROUP_STRENGTH));
    // 반대 방향은 가운데로 아주 약하게 (그룹 축으로 길게 펼쳐지도록)
    const center = axis === "x" ? forceY(0) : forceX(0);
    fg.d3Force("cross", center.strength(0.05));
    setForcesReady(true);
    // 처음 한 번만 (배치는 미리 계산되고 이후에는 움직이지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fgRef]);

  // 그래프보다 먼저(뒤에) 별을 그림. ctx 는 그래프 좌표로 변환된 상태라 화면 좌표로 되돌려 그림
  const drawBackground = (ctx, globalScale) => {
    const m = ctx.getTransform();
    const dpr = window.devicePixelRatio || 1;
    const shiftX = reducedMotion ? 0 : (m.e / dpr) * STAR_PARALLAX;
    const shiftY = reducedMotion ? 0 : (m.f / dpr) * STAR_PARALLAX;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#eef1ff";
    for (const s of stars) {
      const x = (((s.x + shiftX) % width) + width) % width;
      const y = (((s.y + shiftY) % height) + height) % height;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
    onRenderFramePre?.(ctx, globalScale);
  };

  return (
    <ForceGraph2D
      ref={fgRef}
      width={width}
      height={height}
      graphData={forcesReady ? graphData : EMPTY}
      onRenderFramePre={drawBackground}
      {...props}
    />
  );
}
