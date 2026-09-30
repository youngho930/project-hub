import "server-only";
import profile from "@/data/profile.json";

// 첫 화면 소개 내용 (data/profile.json).
// 이메일은 저장소에 두지 않고 환경 변수 CONTACT_EMAIL 에서 읽는다 (값은 로그에 쓰지 않음).
// 주소 그대로 페이지에 넣지 않고 조각으로 나눠 넘기고, 브라우저에서 "이메일 복사"를 누를 때만 합쳐진다
// (HTML·RSC 데이터에 주소 문자열이 남지 않게). 없거나 형식이 이상하면 null → 버튼을 숨김.
function splitEmail(email) {
  const [user = "", domain = "", ...rest] = String(email ?? "").trim().split("@");
  if (!user || !domain || rest.length > 0) return null;
  // 뒤집은 조각 여러 개: 아이디 두 조각, 도메인 두 조각
  const cut = (text) => {
    const mid = Math.ceil(text.length / 2);
    return [text.slice(0, mid), text.slice(mid)].map((part) => [...part].reverse().join(""));
  };
  return { user: cut(user), domain: cut(domain) };
}

export function getProfile() {
  return { ...profile, emailParts: splitEmail(process.env.CONTACT_EMAIL) };
}
