import "server-only";
import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

// 사이드바·개요에서 그룹이 보이는 순서 (여기에 없는 그룹은 뒤에 붙음)
const GROUP_ORDER = ["업무 자동화", "개인 AI 비서"];

// order 오름차순, order가 없으면 맨 뒤 (같으면 파일 이름 순)
const orderOf = (project) =>
  typeof project.order === "number" ? project.order : Infinity;

export function getAllProjects() {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) =>
      JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8"))
    )
    .sort((a, b) => orderOf(a) - orderOf(b));
}

export function getProject(id) {
  return getAllProjects().find((project) => project.id === id) ?? null;
}

export const NEEDS_CHECK = "확인 필요";

// 값이 있고 "확인 필요"가 아님
const isFilled = (value) =>
  typeof value === "string" && value.trim() !== "" && value !== NEEDS_CHECK;

// 프로젝트마다 검사하는 포트폴리오 체크리스트 5개 항목
const CHECKLIST = [
  {
    key: "repo",
    missing: "저장소 없음",
    pass: (p) => isFilled(p.repo),
  },
  {
    key: "problem",
    missing: "문제 미작성",
    pass: (p) => isFilled(p.problem),
  },
  {
    key: "decisions",
    missing: "결정 이유 없음",
    pass: (p) =>
      Array.isArray(p.decisions) &&
      p.decisions.length > 0 &&
      p.decisions.every((d) => isFilled(d.why)),
  },
  {
    key: "results",
    missing: "효과 없음",
    pass: (p) => Array.isArray(p.results) && p.results.length > 0,
  },
  {
    key: "tech",
    missing: "기술 확인 필요",
    pass: (p) =>
      ![...(p.tech ?? []), ...(p.parts ?? []).flatMap((part) => part.tech ?? [])]
        .includes(NEEDS_CHECK),
  },
];

export const CHECKLIST_SIZE = CHECKLIST.length;

// 진행 상태 (없으면 완료로 봄)
export const PROJECT_STATUS = {
  building: "개발 중",
  idea: "구상 중",
};

// 진행 상태에 따라 아직 검사하지 않는 항목
const EXCLUDED_BY_STATUS = {
  [PROJECT_STATUS.building]: ["results"],
  [PROJECT_STATUS.idea]: ["repo", "results"],
};

// 한 프로젝트의 체크 결과: 적용 항목 수, 통과 수, 빠진 항목 이름(한글)
export function checkProject(project) {
  const excluded = EXCLUDED_BY_STATUS[project.status] ?? [];
  const items = CHECKLIST.filter((item) => !excluded.includes(item.key));
  const missing = items
    .filter((item) => !item.pass(project))
    .map((item) => item.missing);
  return {
    applicable: items.length,
    passed: items.length - missing.length,
    missing,
  };
}

// 포트폴리오 완성도: 통과 수 / 프로젝트별 적용 항목 수 합계
export function getCompletion() {
  const results = getAllProjects().map(checkProject);
  const total = results.reduce((sum, r) => sum + r.applicable, 0);
  const done = results.reduce((sum, r) => sum + r.passed, 0);
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, left: total - done, percent };
}

// 체크리스트를 통과 못 한 항목이 있는 프로젝트 목록
export function getMissed() {
  return getAllProjects()
    .map((project) => ({
      id: project.id,
      name: project.name,
      ...checkProject(project),
    }))
    .filter((item) => item.missing.length > 0);
}

// getAllProjects가 이미 order 순이라 각 그룹 안에서도 순서가 유지됨
export function getGroups() {
  const byGroup = new Map(GROUP_ORDER.map((name) => [name, []]));
  for (const project of getAllProjects()) {
    if (!byGroup.has(project.group)) byGroup.set(project.group, []);
    byGroup.get(project.group).push(project);
  }
  return [...byGroup]
    .filter(([, projects]) => projects.length > 0)
    .map(([name, projects]) => ({ name, projects }));
}
