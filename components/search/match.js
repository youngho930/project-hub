// 검색 일치 판단: 대소문자·띄어쓰기 무시, 부분 일치, 한글 초성 검색.
// 원래 문장의 어느 글자가 일치했는지(강조 표시용)도 함께 돌려준다.

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const JAMO_ONLY = /^[ㄱ-ㅎ]+$/;

// 글자 하나의 초성 (한글 음절이 아니면 소문자 그대로)
function initialOf(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code >= 0 && code < 11172) return CHOSUNG[Math.floor(code / 588)];
  return ch.toLowerCase();
}

// 띄어쓰기를 뺀 글자들과 각 글자의 원래 위치·초성
function prepare(source) {
  const chars = [];
  const index = [];
  const initials = [];
  [...source].forEach((ch, i) => {
    if (/\s/.test(ch)) return;
    chars.push(ch.toLowerCase());
    initials.push(initialOf(ch));
    index.push(i);
  });
  return { norm: chars.join(""), cho: initials.join(""), index };
}

// 자음(초성)만으로 된 검색어인지
export function isChosungQuery(query) {
  return JAMO_ONLY.test(query);
}

export function normalizeQuery(query) {
  return query.replace(/\s+/g, "").toLowerCase();
}

// 일치하면 { start, end, prefix } (원래 문장 기준 글자 위치, end 는 포함 안 함), 아니면 null
export function matchText(source, query) {
  if (!source || !query) return null;
  const { norm, cho, index } = prepare(source);
  const target = JAMO_ONLY.test(query) ? cho : norm;
  const at = target.indexOf(query);
  if (at < 0) return null;
  const chars = [...source];
  return {
    start: index[at],
    end: index[at + query.length - 1] + 1,
    prefix: at === 0,
    length: chars.length,
  };
}

// 문장을 [일치 전, 일치, 일치 후] 조각으로
export function splitByMatch(source, match) {
  if (!match) return [source, "", ""];
  const chars = [...source];
  return [
    chars.slice(0, match.start).join(""),
    chars.slice(match.start, match.end).join(""),
    chars.slice(match.end).join(""),
  ];
}

// 긴 설명은 일치한 곳 주변만 잘라 보여줌
export function excerpt(source, match, around = 28) {
  const chars = [...source];
  if (!match || chars.length <= around * 2) return { text: source, match };
  const from = Math.max(0, match.start - around);
  const to = Math.min(chars.length, match.end + around);
  const head = from > 0 ? "…" : "";
  const tail = to < chars.length ? "…" : "";
  return {
    text: head + chars.slice(from, to).join("") + tail,
    match: { ...match, start: match.start - from + head.length, end: match.end - from + head.length },
  };
}
