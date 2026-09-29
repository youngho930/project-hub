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
