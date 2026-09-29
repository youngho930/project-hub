// 노드 종류별 이름·색 (범례, 캔버스, 패널에서 같이 사용)
export const TYPE_META = {
  project: { label: "프로젝트", color: "#a78bfa" },
  tech: { label: "기술", color: "#60a5fa" },
  part: { label: "구성", color: "#2dd4bf" },
  decision: { label: "결정", color: "#fbbf24" },
  result: { label: "효과", color: "#f97316" },
};

export const TYPE_ORDER = Object.keys(TYPE_META);

// 노드 반지름: 프로젝트 가장 크게, 기술은 연결 수에 비례, 결정·효과는 작게
export function radius(node) {
  switch (node.type) {
    case "project":
      return 9;
    case "tech":
      return Math.min(8, 2.5 + Math.sqrt(node.degree) * 1.8);
    case "part":
      return 5;
    default:
      return 3.5;
  }
}

// 이름을 항상 표시하는 노드와 글자 크기(px, 화면 기준)
export const LABEL_SIZE = { project: 13, tech: 11, part: 10 };

export const LABEL_FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

// 이 배율보다 축소하면 글자도 그래프와 같이 작아짐.
// 그래서 그래프 단위로 본 글자 크기는 최대 LABEL_SIZE / LABEL_MIN_SCALE 로 고정되고,
// 충돌 반경을 이 크기에 맞춰 두면 어떤 배율에서도 이름끼리 겹치지 않음
export const LABEL_MIN_SCALE = 0.75;

export const labelWeight = (node) => (node.type === "project" ? 600 : 400);
