// 프로젝트 개수 표기를 사이트 전체에서 같게: 만든 것 수 + (있으면) " · 구상 n".
// 구상 중인 프로젝트는 개수에 넣지 않고 옆에 따로 적음 (사이드바, 첫 화면, 지식 그래프)
export const IDEA_STATUS = "구상 중";

export const isIdea = (project) => project?.status === IDEA_STATUS;

export function ideaSuffix(ideas) {
  return ideas > 0 ? ` · 구상 ${ideas}` : "";
}
