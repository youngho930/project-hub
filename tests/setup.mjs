// 테스트 준비: Next 가 빌드 때 처리하는 "server-only" 표시를 node 테스트에서는 빈 모듈로 바꾸고,
// jsconfig 의 "@/" 경로 별칭을 저장소 루트 기준 파일로 풀어 준다.
// 실행: node --conditions=react-server --import ./tests/setup.mjs --test "tests/*.test.mjs"
import { registerHooks } from "node:module";

const ROOT = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("@/")) {
      const target = new URL(specifier.slice(2), ROOT).href;
      return nextResolve(target.endsWith(".js") ? target : target + ".js", context);
    }
    return nextResolve(specifier, context);
  },
});
