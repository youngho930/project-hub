import { revalidatePath, revalidateTag } from "next/cache";
import { handleIntroSave } from "@/lib/intro-save";
import { INTRO_TAG } from "@/lib/intro-setting";
import { SITE_URL } from "@/lib/site";

// 관리 화면(/status)의 "첫 방문 인트로" 저장 요청. 규칙은 lib/intro-save.js, 쓰기 범위 제한은 lib/settings-store.js.
// 요청 본문(비밀번호 포함)은 어떤 로그에도 남기지 않는다.
const MAX_BODY = 2048;

function clientIp(request) {
  const real = (request.headers.get("x-real-ip") ?? "").trim();
  if (real) return real;
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
}

export async function POST(request) {
  const json = (status, body) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

  let body = null;
  const text = await request.text().catch(() => "");
  if (text.length > MAX_BODY) return json(413, { error: "too_large", message: "요청이 너무 커요." });
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }

  const out = await handleIntroSave({
    origin: request.headers.get("origin"),
    // 같은 주소(배포·로컬 모두)와 대표 주소에서 보낸 요청만
    allowedOrigins: [request.nextUrl.origin, new URL(SITE_URL).origin],
    ip: clientIp(request),
    body,
  });

  if (out.saved) {
    // 저장 성공: 설정 읽기 캐시를 바로 만료(오래된 값을 보여 주지 않음)하고, 페이지 전체를 다음 방문 때 새로 만들게 한다
    revalidateTag(INTRO_TAG, { expire: 0 });
    revalidatePath("/", "layout");
  }
  return json(out.status, out.body);
}
