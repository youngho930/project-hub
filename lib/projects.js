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

// JSON 안의 모든 문자열 값을 모음 (빈 문자열은 제외)
function collectStrings(value, out = []) {
  if (typeof value === "string") {
    if (value !== "") out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}

export function countNeedsCheck(project) {
  return collectStrings(project).filter((s) => s === NEEDS_CHECK).length;
}

// 포트폴리오 문서 완성도: 채워진 문자열 값 중 "확인 필요"가 아닌 비율
export function getCompletion() {
  const values = getAllProjects().flatMap((project) => collectStrings(project));
  const left = values.filter((s) => s === NEEDS_CHECK).length;
  const done = values.length - left;
  const percent = values.length ? Math.round((done / values.length) * 100) : 0;
  return { done, left, percent };
}

// "확인 필요"가 남아 있는 프로젝트 목록
export function getMissed() {
  return getAllProjects()
    .map((project) => ({
      id: project.id,
      name: project.name,
      count: countNeedsCheck(project),
    }))
    .filter((item) => item.count > 0);
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
