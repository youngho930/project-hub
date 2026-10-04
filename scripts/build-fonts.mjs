// 빌드(개발 서버) 전에 실행: 사이트에 들어가는 글자만 담은 Pretendard 부분 글꼴을 만든다.
// 원본: assets/fonts/source/Pretendard-<굵기>.woff2 (pretendard npm 1.3.9, SIL OFL 1.1 — assets/fonts/LICENSE.txt)
// 결과: assets/fonts/generated/ (git 에서 제외, 빌드마다 새로 만듦)
//   Pretendard-<굵기>.woff2       사이트 글자만 (next/font/local 로 미리 불러옴, app/fonts.js)
//   Pretendard-<굵기>-rest-<n>.woff2  나머지 한글을 512자씩 나눈 조각 (GitHub 커밋 메시지처럼 빌드 뒤에 들어오는
//                                     글자용). 화면에 그 조각의 글자가 나올 때만 그 조각만 받음
//   pretendard-rest.css               조각별 @font-face (unicode-range 에 사이트 글자는 빠져 있어 평소엔 받지 않음)
//   charset.json                  담은 글자 목록 (scripts/check-fonts.mjs 가 빌드 결과와 비교)
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";
import { collectChars } from "./font-charset.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "assets/fonts/source");
const OUT = path.join(ROOT, "assets/fonts/generated");
const WEIGHTS = [
  { name: "Regular", weight: 400 },
  { name: "SemiBold", weight: 600 },
  { name: "Bold", weight: 700 },
];
// 코드포인트 목록 → "U+AC01-AC05,U+AC07" 처럼 묶은 unicode-range
function unicodeRange(codes) {
  const parts = [];
  for (let i = 0; i < codes.length; i++) {
    const start = codes[i];
    while (codes[i + 1] === codes[i] + 1) i++;
    const hex = (c) => c.toString(16).toUpperCase();
    parts.push(start === codes[i] ? `U+${hex(start)}` : `U+${hex(start)}-${hex(codes[i])}`);
  }
  return parts.join(",");
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

const started = Date.now();
const chars = await collectChars();
const used = new Set(chars.map((c) => c.codePointAt(0)));
const hangulCount = chars.filter((c) => /\p{Script=Hangul}/u.test(c)).length;

// 나머지 한글: 완성형 11,172자 + 자모 중 사이트 글자에 없는 것
const restCodes = [];
for (const [from, to] of [[0x1100, 0x11ff], [0x3131, 0x318e], [0xac00, 0xd7a3]]) {
  for (let c = from; c <= to; c++) if (!used.has(c)) restCodes.push(c);
}
const REST_CHUNK = 512;
const restChunks = [];
for (let i = 0; i < restCodes.length; i += REST_CHUNK) restChunks.push(restCodes.slice(i, i + REST_CHUNK));

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const sizes = [];
const faces = [];
await Promise.all(
  WEIGHTS.map(async ({ name, weight }) => {
    const source = await fs.readFile(path.join(SOURCE, `Pretendard-${name}.woff2`));
    const core = await subsetFont(source, chars.join(""), { targetFormat: "woff2" });
    await fs.writeFile(path.join(OUT, `Pretendard-${name}.woff2`), core);
    let restBytes = 0;
    for (const [i, codes] of restChunks.entries()) {
      const rest = await subsetFont(source, String.fromCodePoint(...codes), { targetFormat: "woff2" });
      await fs.writeFile(path.join(OUT, `Pretendard-${name}-rest-${i}.woff2`), rest);
      restBytes += rest.length;
      faces.push({ weight, file: `Pretendard-${name}-rest-${i}.woff2`, range: unicodeRange(codes) });
    }
    sizes.push({
      weight,
      line: `${weight} ${kb(core.length)} (원본 ${kb(source.length)}, 나머지 한글 ${restChunks.length}조각 평균 ${kb(restBytes / restChunks.length)})`,
    });
  })
);

const css = faces
  .sort((a, b) => a.weight - b.weight || a.file.localeCompare(b.file, "en", { numeric: true }))
  .map(
    ({ file, weight, range }) =>
      `@font-face{font-family:"Pretendard Rest";src:url("./${file}") format("woff2");font-weight:${weight};font-style:normal;font-display:swap;unicode-range:${range};}`
  )
  .join("\n");
await fs.writeFile(
  path.join(OUT, "pretendard-rest.css"),
  `/* scripts/build-fonts.mjs 가 만든 파일 — 직접 고치지 말 것 */\n${css}\n`
);
await fs.writeFile(path.join(OUT, "charset.json"), JSON.stringify(chars));

console.log(
  `[fonts] 모은 글자 ${chars.length}종 (한글 ${hangulCount}자) → 부분 글꼴 ${sizes
    .sort((a, b) => a.weight - b.weight)
    .map((s) => s.line)
    .join(" / ")} · ${((Date.now() - started) / 1000).toFixed(1)}초`
);
