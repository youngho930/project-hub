// 노드 종류별 이름·색 (범례, 캔버스, 패널에서 같이 사용)
export const TYPE_META = {
  project: { label: "프로젝트", color: "#a78bfa" },
  tech: { label: "기술", color: "#60a5fa" },
  part: { label: "구성", color: "#2dd4bf" },
  decision: { label: "결정", color: "#fbbf24" },
  result: { label: "효과", color: "#f97316" },
};

export const TYPE_ORDER = Object.keys(TYPE_META);
