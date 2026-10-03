// 테스트 준비: Next 가 빌드 때 처리하는 "server-only" 표시를 node 테스트에서는 빈 모듈로 바꾼다.
// 실행: node --conditions=react-server --import ./tests/setup.mjs --test "tests/*.test.mjs"
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
