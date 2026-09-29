"use client";

import { forceCollide } from "d3-force-3d";
import { useEffect } from "react";
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
    return Math.max(r + 6, Math.hypot(halfWidth, labelBottom) * 0.8) + 2;
  };
}

// next/dynamic(ssr: false)로 불러오는 캔버스. ref는 fgRef prop으로 받아 그대로 연결
export default function ForceGraphCanvas({ fgRef, ...props }) {
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-260).distanceMax(420);
    fg.d3Force("link")?.distance(linkDistance);
    fg.d3Force("collide", forceCollide(makeCollideRadius()).strength(0.9));
    // 첫 렌더 때 기본 힘으로 시작된 배치를 새 힘으로 다시 계산
    fg.d3ReheatSimulation();
  }, [fgRef]);

  return <ForceGraph2D ref={fgRef} {...props} />;
}
