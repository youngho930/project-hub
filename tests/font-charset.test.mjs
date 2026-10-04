// 부분 글꼴 글자 모으기 테스트. 실행: node --conditions=react-server --import ./tests/setup.mjs --test "tests/*.test.mjs"
// 첫 화면이 미리 불러오는 부분 글꼴에 관리 화면 전용 글자가 들어가 글꼴이 커지지 않는지 확인한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as espree from "espree";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { collectChars, ADMIN_ONLY } = await import("../scripts/font-charset.mjs");
const chars = new Set(await collectChars());

const hangulIn = (file) => {
  const tokens = espree.tokenize(fs.readFileSync(path.join(ROOT, file), "utf8"), { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } });
  return new Set([...tokens.filter((t) => ["String", "Template", "JSXText"].includes(t.type)).map((t) => t.value).join("")].filter((c) => /\p{Script=Hangul}/u.test(c)));
};

test("관리 화면 전용 파일의 글자는 부분 글꼴에 넣지 않음 (다른 화면에도 쓰는 글자만 들어감)", () => {
  for (const c of ["횟", "째", "겼", "빛", "뀌", "렸"]) assert.equal(chars.has(c), false, "들어감: " + c); // 인트로 설정 문구에만 있는 글자
  for (const c of ["홈", "관", "리", "인", "트", "로"]) assert.equal(chars.has(c), true, "빠짐: " + c);   // 첫 화면·사이드바 글자
});

test("관리 화면 전용 글자는 모두 한글이라 \"Pretendard Rest\" 조각으로 표시됨 (시스템 글꼴로 떨어지지 않음)", () => {
  const inRest = (c) => { const n = c.codePointAt(0); return (n >= 0x1100 && n <= 0x11ff) || (n >= 0x3131 && n <= 0x318e) || (n >= 0xac00 && n <= 0xd7a3); };
  for (const file of ADMIN_ONLY) for (const c of hangulIn(file)) assert.ok(chars.has(c) || inRest(c), `${file}: ${c}`);
});

test("ADMIN_ONLY 파일은 관리 화면(/status)과 저장 API 에서만 불러옴", () => {
  const users = {};
  const walk = (dir) => {
    for (const f of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, f.name).replaceAll("\\", "/");
      if (f.isDirectory()) walk(rel);
      else if (/\.(m?js|jsx)$/.test(f.name)) {
        const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
        for (const a of ADMIN_ONLY) {
          const name = path.basename(a, ".js");
          if (rel !== a && new RegExp(`from ["'][^"']*/${name}(\.js)?["']`).test(src)) (users[a] ??= []).push(rel);
        }
      }
    }
  };
  for (const d of ["app", "components", "lib"]) walk(d);
  assert.deepEqual(users, {
    "components/IntroSettingForm.js": ["components/IntroSettingSection.js"],
    "components/IntroSettingSection.js": ["app/status/page.js"],
    "lib/intro-save.js": ["app/api/intro/route.js"],
  });
});
