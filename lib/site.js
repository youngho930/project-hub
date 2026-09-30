import profile from "@/data/profile.json";

// 링크 공유 미리보기(카카오톡·링크드인 등)용 사이트 정보.
// 이름·소개 문구는 data/profile.json 에서 가져와, 소개를 바꾸면 미리보기도 같이 바뀐다.
// 이메일 등 비밀 정보는 여기에 두지 않는다.

// 대표 주소: 보조 주소로 들어와도 미리보기 이미지 주소는 이 주소로 만든다
export const SITE_URL = "https://project-hub-youngho.vercel.app";
export const SITE_HOST = new URL(SITE_URL).host;

export const SITE_NAME = `${profile.name} 포트폴리오`;
export const HOME_TITLE = `${profile.name} · ${profile.tagline}`;
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

// "재고 확인 30초, 엑셀 취합 8배, 퇴사 후 6개월 무보수 운영" 처럼 대표 숫자를 한 줄로
const HIGHLIGHT_PHRASES = {
  "재고 확인 시간": (v) => `재고 확인 ${v}`,
  "엑셀 취합 속도": (v) => `엑셀 취합 ${v}`,
  "무보수 운영": (v) => `퇴사 후 ${v.replace(/\+$/, "")} 무보수 운영`,
};
const highlightText = profile.highlights
  .map((h) => (HIGHLIGHT_PHRASES[h.label] ?? ((v) => `${h.label} ${v}`))(h.value))
  .join(", ");

export const HOME_DESCRIPTION = `QC 현장에서 발견한 문제를 Python·ERP 연동·AI 에이전트로 자동화한 프로젝트 모음. ${highlightText}.`;

const OPEN_GRAPH_BASE = { type: "website", locale: "ko_KR", siteName: SITE_NAME };

// 하위 화면용 메타데이터. openGraph 는 부모 값을 통째로 덮어쓰므로 공통 값을 다시 넣는다.
// images 는 넣지 않음: 같은 폴더(또는 상위)의 opengraph-image 파일이 자동으로 붙는다.
export function pageMetadata({ title, description, path }) {
  const fullTitle = TITLE_TEMPLATE.replace("%s", title);
  return {
    title,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: { ...OPEN_GRAPH_BASE, title: fullTitle, description, url: path },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}

export const rootMetadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_TITLE, template: TITLE_TEMPLATE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { ...OPEN_GRAPH_BASE, title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
};
