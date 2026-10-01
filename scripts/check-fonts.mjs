// 빌드 뒤에 실행(postbuild): 미리 만들어진 페이지(HTML·RSC)의 글자가 부분 글꼴에 모두 있는지 검사.
// 빠진 글자가 있으면 경고만 출력 (화면에서는 "Pretendard Rest" 나 시스템 글꼴로 보임). 빌드를 멈추지는 않음.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, ".next/server/app");
const charset = new Set(
  JSON.parse(await fs.readFile(path.join(ROOT, "assets/fonts/generated/charset.json"), "utf8"))
);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))
  );
  return files.flat();
}

const files = (await walk(APP)).filter((f) => /\.(html|rsc)$/.test(f));
const missing = new Map();
for (const file of files) {
  const text = (await fs.readFile(file, "utf8")).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
    String.fromCharCode(parseInt(h, 16))
  );
  for (const ch of text) {
    if (/[\p{C}\p{Z}]/u.test(ch) || charset.has(ch)) continue;
    if (!missing.has(ch)) missing.set(ch, path.relative(APP, file));
  }
}

// "Pretendard Rest" 조각이 맡는 한글 범위 (scripts/build-fonts.mjs 와 같음)
const inRest = (ch) => {
  const c = ch.codePointAt(0);
  return (c >= 0x1100 && c <= 0x11ff) || (c >= 0x3131 && c <= 0x318e) || (c >= 0xac00 && c <= 0xd7a3);
};
const hex = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
const restOnly = [...missing].filter(([ch]) => inRest(ch));
const uncovered = [...missing].filter(([ch]) => !inRest(ch));
const pages = (list) => [...new Set(list.map(([, file]) => file))].join(", ");

console.log(
  `[fonts] 검사: 미리 만든 페이지 ${files.length}개 · 부분 글꼴에 없는 글자 ${missing.size}종` +
    (restOnly.length
      ? ` (그중 한글 ${restOnly.length}자는 빌드 때 받아온 데이터 — 예: 커밋 메시지 — 로 "Pretendard Rest" 조각이 표시: ${pages(restOnly)})`
      : "")
);
if (uncovered.length) {
  console.warn(`[fonts] 경고: 어느 Pretendard 파일에도 없는 글자 ${uncovered.length}종 → 시스템 글꼴로 보임`);
  for (const [ch, file] of uncovered) console.warn(`  ${hex(ch)} ${file}`);
}
