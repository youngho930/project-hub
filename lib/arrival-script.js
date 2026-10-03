// 첫 방문 도착 연출 — <head> 에 넣는 짧은 스크립트를 만든다 (app/layout.js 가 서버에서 부른다).
//
// 인트로 종류(warp / none)는 서버가 페이지를 만들 때 설정에서 읽어(lib/intro-setting.js) 이 스크립트 안에 값으로 넣는다.
// 방문자 브라우저는 설정을 따로 물어보러 가지 않는다.
// - none: 덮개 클래스(hub-intro, hub-cover)를 붙이지 않고 연출 파일(public/hero-intro.js)도 불러오지 않는다.
//         첫 방문 기록만 남기고, 기록에 "인트로 설정: 없음"을 남긴다
// - 미리보기 주소: ?intro=warp · ?intro=none 은 설정과 상관없이 그 인트로, ?intro=data 는 아직 준비 중이라 warp,
//   그냥 ?intro (값 없음·모르는 값)는 설정된 인트로를 재생한다
//
// 첫 방문 화면 전체 도착 연출 (첫 그림 전에 실행되는 짧은 스크립트).
// 브라우저 기준 처음 한 번만: 어느 주소로 들어오든 방문 표시를 남기고,
// 첫 화면("/")으로 바로 들어온 경우에만 연출 (움직임 줄이기면 안 함).
// 주소에 ?intro 가 붙으면 방문 기록과 상관없이 다시 재생 (첫 화면 연락 영역의 "인트로 다시 보기").
// - <html class="hub-intro hub-cover">: CSS 덮개(숨 쉬는 가운데 빛)와 "건너뛰기"가 첫 그림부터 화면을 덮음. 메인 화면은 그 아래 그대로 그려짐
// - public/hero-intro.js 를 async 로 불러와 캔버스 연출이 덮개를 이어받음 (첫 그림을 막지 않음)
// - 실제 탭·클릭(손가락이 10px 안에서 0.6초 안에 떨어짐)과 키 입력만 건너뛰기. 스크롤·터치 이동·
//   주소창이 접히며 생기는 화면 크기 변화에는 반응하지 않음 (스크롤로 이어진 터치는 브라우저가 탭을 취소함)
// - 연출 파일이 2.5초 안에 시작 못 하면 덮개를 그냥 걷음 (연출은 페이지 준비가 끝난 뒤 시작, 그 전엔 덮개만 보임)
// - 원이 열리기 시작할 때 <html class="hub-reveal"> → 소개 문구가 차례로 떠오름 (globals.css).
//   "건너뛰기" 표시(hub-intro)는 연출이 끝날 때 함께 없앰 (원이 열리는 순간의 일을 줄임)
// - 끝나거나 생략된 이유는 모두 window.__hubIntroLog 에 기록 (public/hero-intro.js 도 같은 기록에 씀).
//   주소에 ?intro&debug 가 붙었을 때만 이유·시각·픽셀 배율·캔버스 크기를 왼쪽 위에 10초 동안 작게 띄움

export const INTRO_MODES = ["warp", "data", "none"];
// 저장할 수 있는 값 (data 는 준비 중)
export const SAVABLE_INTRO_MODES = ["warp", "none"];

// 저장된 값 → 실제로 쓸 값. none 만 그대로, 나머지(빈 값·data·모르는 값)는 모두 warp
export function normalizeIntroMode(value) {
  return value === "none" ? "none" : "warp";
}

export function arrivalScript(mode) {
  const m = normalizeIntroMode(mode);
  return `try{var M=${JSON.stringify(m)},k="hub-visited",q=location.search,force=/[?&]intro(=|&|$)/.test(q),pm=q.match(/[?&]intro=([^&]*)/),pv=pm?pm[1]:"",want=pv==="none"?"none":(pv==="warp"||pv==="data")?"warp":M,first=!localStorage.getItem(k),d=document.documentElement,L=window.__hubIntroLog={reason:null,mode:want,events:[],debug:force&&/[?&]debug(=|&|$)/.test(q),start:Math.round(performance.now())};
function log(r,x){if(L.reason)return;L.reason=r;if(x)L.detail=String(x);L.end=Math.round(performance.now())}
function show(){if(!L.debug||L.shown)return;if(!document.body){addEventListener("DOMContentLoaded",show,{once:true});return}L.shown=1;var b=document.createElement("div");b.setAttribute("aria-hidden","true");b.style.cssText="position:fixed;left:8px;top:8px;z-index:10003;max-width:92vw;padding:6px 8px;border-radius:6px;background:rgba(0,0,0,.78);color:#fff;font:11px/1.45 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none";b.textContent="인트로 종류: "+L.mode+"\\n인트로 종료 이유: "+(L.reason||"-")+(L.detail?" ("+L.detail+")":"")+"\\n시작 "+L.start+"ms · 움직임 "+(L.begin==null?"-":L.begin+"ms")+" · 종료 "+(L.end==null?"-":L.end+"ms")+"\\n픽셀 배율 "+devicePixelRatio+" · 캔버스 "+(L.canvas||"-")+(L.events.length?"\\n"+L.events.join("\\n"):"");document.body.appendChild(b);setTimeout(function(){b.remove()},10000)}
window.__hubIntroLogReason=log;window.__hubIntroShowDebug=show;
localStorage.setItem(k,"1");
if((first||force)&&location.pathname==="/"){if(want==="none"){log("인트로 설정: 없음");show()}else if(matchMedia("(prefers-reduced-motion: reduce)").matches){log("동작 줄이기 설정으로 생략");show()}else{
var ended=0,revealed=0,sx=0,sy=0,st=-1;
d.classList.add("hub-intro","hub-cover");d.style.setProperty("--hub-skip-label",'"건너뛰기"');
function reveal(){if(revealed)return;revealed=1;d.classList.add("hub-cover-off","hub-reveal");setTimeout(function(){d.classList.remove("hub-reveal")},1400)}
function end(){if(ended)return;ended=1;reveal();d.classList.remove("hub-intro","hub-cover","hub-cover-off");removeEventListener("pointerdown",down,true);removeEventListener("pointerup",up,true);removeEventListener("keydown",key,true);show()}
function skip(r){log(r);if(window.__hubIntroSkip)window.__hubIntroSkip(r);else end()}
function down(e){sx=e.clientX;sy=e.clientY;st=performance.now()}
function up(e){if(st>=0&&Math.abs(e.clientX-sx)<10&&Math.abs(e.clientY-sy)<10&&performance.now()-st<600)skip(e.pointerType==="mouse"?"클릭":"탭");st=-1}
function key(){skip("키")}
window.__hubIntroReveal=reveal;window.__hubIntroEnd=end;
addEventListener("pointerdown",down,{capture:true,passive:true});addEventListener("pointerup",up,{capture:true,passive:true});addEventListener("keydown",key,true);
var s=document.createElement("script");s.src="/hero-intro.js";s.async=true;s.onerror=function(){log("연출 파일을 받지 못함");end()};document.head.appendChild(s);
setTimeout(function(){if(!window.__hubIntroSkip){log("연출 파일이 2.5초 안에 시작하지 못함");end()}},2500)}}}catch(e){try{window.__hubIntroLog&&!window.__hubIntroLog.reason&&(window.__hubIntroLog.reason="오류",window.__hubIntroLog.detail=String(e&&e.message))}catch(x){}}`;
}
