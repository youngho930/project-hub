import "server-only";
import fs from "node:fs";
import path from "node:path";

const PROJECTS_DIR = path.join(process.cwd(), "data", "projects");

// 사이드바·개요에서 그룹이 보이는 순서 (여기에 없는 그룹은 뒤에 붙음)
const GROUP_ORDER = ["업무 자동화", "개인 AI 비서"];

export function getAllProjects() {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) =>
      JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, file), "utf8"))
    );
}

export function getProject(id) {
  return getAllProjects().find((project) => project.id === id) ?? null;
}

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
