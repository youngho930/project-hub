import IntroSettingForm from "@/components/IntroSettingForm";

// 관리 화면(/status)의 "첫 방문 인트로" 칸. 종류를 골라 관리 비밀번호와 함께 저장 (app/api/intro/route.js). 미리보기는 새 탭.
// 이 칸의 글자는 관리 화면에만 나오므로 첫 화면이 미리 불러오는 부분 글꼴에 넣지 않는다 (scripts/font-charset.mjs 의 ADMIN_ONLY)
export default function IntroSettingSection({ current }) {
  return (
    <section className="card mt-card max-w-[720px]" aria-labelledby="intro-setting-title">
      <h2 id="intro-setting-title" className="label">첫 방문 인트로</h2>
      <p className="mt-1 text-caption text-muted">
        첫 화면(/)에 처음 들어온 방문자에게 보여 줄 연출. 저장에는 관리 비밀번호가 필요해요.
      </p>
      <IntroSettingForm current={current} />
    </section>
  );
}
