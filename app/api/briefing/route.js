import { getBriefing } from "@/lib/briefing";

// 노션 대시보드 "오늘 한눈에" 위젯(/widgets/briefing.html)이 10분마다 읽는 오늘 숫자.
// 개수와 상태만 내보낸다 (규칙은 lib/briefing.js). 원본 데이터는 서버에서 10분 단위로 캐시돼 요청이 몰려도 외부 호출은 늘지 않는다.
export async function GET() {
  return Response.json(await getBriefing(), {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
