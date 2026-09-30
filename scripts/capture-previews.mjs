// 배포 주소의 첫 화면을 찍어 public/previews/<id>.png 로 저장한다.
// 로그인·값 입력은 하지 않는다. Streamlit 이 잠들어 있으면 깨우는 버튼만 누른다.
// 브라우저는 PC 에 설치된 Microsoft Edge (channel "msedge") 를 쓴다.
//
// 사용: npm run capture                    (deploy.url 이 있는 모든 프로젝트)
//       npm run capture -- jarvis          (특정 프로젝트만, 여러 개 가능)
//       npm run capture -- jarvis --force  (직접 캡처한 이미지(manual: true)도 다시 찍기)
//
// 찍은 파일 이름·가로·세로 크기·날짜는 manifest.json 에 기록하고, 사이트는 manifest 에 있는 것만 표시한다.
// manifest.json 에 manual: true 인 프로젝트는 직접 캡처한 이미지라 id 를 지정해도 건너뛴다.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, "data", "projects");
const OUT_DIR = path.join(ROOT, "public", "previews");
const MANIFEST = path.join(OUT_DIR, "manifest.json");

const VIEWPORT = { width: 1440, height: 900 };
const SITE_TIMEOUT_MS = 60_000; // 일반 사이트 제한 시간
const WAKE_TIMEOUT_MS = 120_000; // Streamlit 깨어나기 최대 대기
const SETTLE_MS = 2_000; // 화면이 다 그려지도록 잠깐 더 기다림
const WAKE_BUTTON = /get this app back up/i; // Streamlit 잠든 화면의 버튼 문구

// 캡처 날짜: 한국 시간 YYYY-MM-DD
const kstDate = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

function loadTargets(only) {
  return fs
    .readdirSync(PROJECTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, f), "utf8")))
    .filter((p) => /^https?:\/\//.test(p.deploy?.url ?? ""))
    .filter((p) => only.length === 0 || only.includes(p.id));
}

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 제한 시간 ${ms / 1000}초 초과`)), ms)
    ),
  ]);

// Streamlit Community Cloud: 잠든 화면이면 깨우고, 앱 화면이 뜰 때까지 기다림
async function wakeStreamlit(page) {
  const button = page.getByRole("button", { name: WAKE_BUTTON });
  if (await button.isVisible().catch(() => false)) {
    console.log("    잠든 앱 → 깨우는 버튼 누름");
    await button.click();
  }
  // 앱은 iframe 안에서 그려짐. 앱 본문이 보일 때까지 최대 2분
  await page.waitForFunction(
    () => {
      const docs = [document, ...[...document.querySelectorAll("iframe")].map((f) => {
        try { return f.contentDocument; } catch { return null; }
      })].filter(Boolean);
      return docs.some((d) => d.querySelector('[data-testid="stAppViewContainer"]'));
    },
    null,
    { timeout: WAKE_TIMEOUT_MS, polling: 1_000 }
  ).catch(async () => {
    // iframe 이 다른 출처라 직접 못 보면 frame 목록으로 확인
    const frame = page.frames().find((f) => f !== page.mainFrame());
    if (!frame) throw new Error("앱 화면이 뜨지 않음");
    await frame.waitForSelector('[data-testid="stAppViewContainer"]', { timeout: WAKE_TIMEOUT_MS });
  });
  // 실행 중 표시(스피너)가 사라질 때까지 잠깐 더
  for (const frame of page.frames()) {
    await frame
      .waitForSelector('[data-testid="stStatusWidget"]', { state: "detached", timeout: 15_000 })
      .catch(() => {});
  }
}

// PNG 머리(IHDR)에서 실제 가로·세로 크기를 읽는다
function pngSize(file) {
  const buf = fs.readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function capture(browser, project) {
  const url = project.deploy.url;
  const isStreamlit = /\.streamlit\.app/i.test(url);
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(url, { waitUntil: "load", timeout: SITE_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    if (isStreamlit) await wakeStreamlit(page);
    await page.waitForTimeout(SETTLE_MS);
    const file = path.join(OUT_DIR, `${project.id}.png`);
    await page.screenshot({ path: file, fullPage: false }); // 보이는 화면만
    return file;
  } finally {
    await page.close();
  }
}

// Edge 를 화면 없는 모드로 먼저 띄워 보고, 안 되면 화면 있는 모드로 띄우되 창을 화면 밖에 둔다
async function launchEdge() {
  try {
    const browser = await chromium.launch({ channel: "msedge", headless: true });
    return { browser, mode: "Edge 화면 없는 모드(headless)" };
  } catch (error) {
    console.log(`Edge headless 실행 실패: ${error.message.split("\n")[0]}`);
    console.log("→ 화면 있는 모드로 띄우고 창은 화면 밖에 둡니다");
    const browser = await chromium.launch({
      channel: "msedge",
      headless: false,
      args: [
        "--window-position=-32000,-32000",
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      ],
    });
    return { browser, mode: "Edge 화면 있는 모드(창은 화면 밖)" };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith("--"));
  const unknown = flags.filter((f) => f !== "--force");
  if (unknown.length) {
    console.log(`알 수 없는 옵션: ${unknown.join(", ")} (--force 만 쓸 수 있습니다)`);
    process.exitCode = 1;
    return;
  }
  const force = flags.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
    : {};

  // 직접 캡처한 이미지(manual: true)는 --force 가 없으면 덮어쓰지 않는다
  const skipped = [];
  const targets = loadTargets(only).filter((p) => {
    if (manifest[p.id]?.manual && !force) {
      skipped.push(p.id);
      console.log(`- ${p.id}: 직접 캡처한 이미지라 건너뜀 (다시 찍으려면 --force)`);
      return false;
    }
    return true;
  });
  if (targets.length === 0) {
    console.log(
      skipped.length
        ? "\n찍을 프로젝트가 없습니다."
        : "캡처할 프로젝트가 없습니다 (deploy.url 이 http 로 시작하는 프로젝트만 대상)."
    );
    return;
  }

  const { browser, mode } = await launchEdge();
  console.log(`브라우저: ${mode}\n`);
  const ok = [];
  const failed = [];
  try {
    for (const project of targets) {
      const isStreamlit = /\.streamlit\.app/i.test(project.deploy.url);
      const budget = SITE_TIMEOUT_MS + (isStreamlit ? WAKE_TIMEOUT_MS + 30_000 : 0);
      console.log(`- ${project.id} (${project.deploy.url})`);
      try {
        const file = await withTimeout(capture(browser, project), budget, project.id);
        // 자동으로 다시 찍었으므로 manual 표시는 없앤다 (--force 로 덮어쓴 경우)
        // file: 화면은 이 이름으로 이미지를 찾는다 (manifest 에 없으면 미리보기를 숨김)
        manifest[project.id] = {
          file: path.basename(file),
          ...pngSize(file), // 화면은 이 비율로 틀을 잡는다 (잘리지 않게)
          capturedAt: kstDate(),
        };
        ok.push(`${project.id} → ${path.relative(ROOT, file)}`);
      } catch (error) {
        failed.push(`${project.id}: ${error.message.split("\n")[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\n브라우저: ${mode}`);
  console.log(`성공 ${ok.length}개`);
  ok.forEach((line) => console.log(`  ${line}`));
  console.log(`실패 ${failed.length}개`);
  failed.forEach((line) => console.log(`  ${line}`));
  if (skipped.length) console.log(`건너뜀 ${skipped.length}개 (직접 캡처): ${skipped.join(", ")}`);
  if (failed.length) process.exitCode = 1;
}

main();
