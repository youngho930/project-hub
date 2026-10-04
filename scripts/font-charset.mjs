// 부분 글꼴에 담을 글자 모으기 — scripts/build-fonts.mjs 가 쓰고, tests/ 가 결과를 검사한다.
// 사이트 데이터(data/)와 화면 코드(app, components, lib)의 문자열·JSX 글자를 모은다.
// 단, ADMIN_ONLY 파일은 빼고 모은다: 관리 화면(/status)에만 나오는 글자라 모든 페이지가 미리 불러오는 부분 글꼴을
// 키우지 않게 한다 (인트로 설정 문구 19자로 글꼴 3개가 각 1.3KB 커져 모바일 첫 화면 LCP 가 늦어졌던 일).
// 이 글자들이 관리 화면에 나오면 "Pretendard Rest" 조각이 필요할 때 받아 같은 Pretendard 로 그린다.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as espree from "espree";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ADMIN_ONLY = [
  "components/IntroSettingForm.js",
  "components/IntroSettingSection.js",
  "lib/intro-save.js",
];

// 화면 글자가 나오는 곳: 데이터와 화면용 소스 (검색·그래프 데이터는 lib 가 data 에서 만듦)
const DATA_DIRS = ["data", "public/previews/manifest.json"];
const CODE_DIRS = ["app", "components", "lib"];

// 항상 포함: 영문 대소문자·숫자·기본 문장부호(ASCII), 자주 쓰는 기호, 한글 자모
const ALWAYS = [
  range(0x20, 0x7e),
  "·•–—‘’“”…′″‰※§¶†©®™°±×÷≠≤≥≈∞√∙←↑→↓↔⇒▲△▼▽▶▷◀◁●○◎■□◆◇★☆✓✔✕✗♥€£¥₩¢",
  "「」『』《》〈〉【】〔〕・、。",
  range(0x3131, 0x318e), // 한글 호환 자모 ㄱ~ㆎ
  " ",
].join("");

function range(from, to) {
  let s = "";
  for (let c = from; c <= to; c++) s += String.fromCodePoint(c);
  return s;
}

async function walk(target) {
  const stat = await fs.stat(target).catch(() => null);
  if (!stat) return [];
  if (stat.isFile()) return [target];
  const entries = await fs.readdir(target, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => walk(path.join(target, e.name))));
  return files.flat();
}

// JSON 의 문자열 값만 (키 이름은 화면에 안 나옴)
function jsonStrings(value, out) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => jsonStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => jsonStrings(v, out));
}

// JS 소스의 문자열·템플릿·JSX 글자만 (주석은 뺌)
function codeStrings(code, file, out) {
  const tokens = espree.tokenize(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  });
  for (const t of tokens) {
    if (t.type === "String" || t.type === "Template" || t.type === "JSXText") out.push(t.value);
  }
  if (!tokens.length) console.warn(`[fonts] 글자를 못 읽음: ${file}`);
}

// 실행할 때 만들어지는 한국어: 상대 시간(RelativeTime.js 의 Intl.RelativeTimeFormat("ko"))
function intlStrings(out) {
  const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
  for (const unit of ["second", "minute", "hour", "day", "week", "month", "quarter", "year"]) {
    for (let n = -3; n <= 3; n++) out.push(rtf.format(n, unit));
  }
}

export async function collectChars() {
  const texts = [ALWAYS];
  for (const dir of DATA_DIRS) {
    for (const file of (await walk(path.join(ROOT, dir))).filter((f) => f.endsWith(".json"))) {
      jsonStrings(JSON.parse(await fs.readFile(file, "utf8")), texts);
    }
  }
  for (const dir of CODE_DIRS) {
    for (const file of (await walk(path.join(ROOT, dir))).filter((f) => /\.(m?js|jsx)$/.test(f))) {
      if (ADMIN_ONLY.includes(path.relative(ROOT, file).replaceAll("\\", "/"))) continue;
      codeStrings(await fs.readFile(file, "utf8"), file, texts);
    }
  }
  intlStrings(texts);
  // \uXXXX 이스케이프도 실제 글자로
  const all = texts.join("").replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const chars = new Set();
  for (const ch of all) if (/[^\p{C}\p{Z}]| | /u.test(ch)) chars.add(ch);
  return [...chars].sort();
}
