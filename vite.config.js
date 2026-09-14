import { defineConfig } from "vite";

export default defineConfig({
  /*
   * 테스트 서버가 /s/슬롯이름/ 같은 하위 경로에 배포하므로
   * JS, CSS, public 에셋을 현재 index.html 기준으로 찾는다.
   */
  base: "./",
});
