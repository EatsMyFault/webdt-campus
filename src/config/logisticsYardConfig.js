import { LOGISTICS_CENTER } from "./buildingConfig.js";
import { SITE } from "./siteConfig.js";

/*
 * 물류센터 야드 좌표계.
 *
 * 여기의 x, z 값은 모두 물류센터 그룹(LOGISTICS_CENTER) 로컬 좌표다.
 * 도크 셔터를 세우는 createLogisticsCenter와 트럭 주행 경로를 만드는
 * logisticsOperationController가 같은 값을 보도록 한곳에 모아둔다.
 *
 *      z=223  ── 단지 남측 외곽 순환도로 ─────────────
 *      z=186  ── 정문 ───────────────── 출차 게이트 ──
 *      z=150  ── 출차 레인 ────────────────────────→
 *      z=128  ── 입차 레인 ────────────────────────→
 *      z=78   ── 도크 접안 위치
 *      z=51   ── 물류센터 전면 벽(도크 셔터)
 */

/*
 * 1번~7번 도크 셔터의 x 좌표
 */
export const LOGISTICS_DOCK_X = Object.freeze([
  -95,
  -47,
  1,
  49,
  97,
  145,
  190,
]);

/*
 * createSite가 만드는 외곽 순환도로의 중심선을 물류센터 로컬 좌표로
 * 변환한다. 부지 크기가 바뀌어도 트럭 경로가 도로 밖으로 밀리지 않는다.
 */
const perimeterInset = SITE.roadWidth / 2 + 16;
const loopRoadX = SITE.width / 2 - perimeterInset;
const loopRoadZ = SITE.depth / 2 - perimeterInset;
const logisticsCenterX = LOGISTICS_CENTER.position[0];
const logisticsCenterZ = LOGISTICS_CENTER.position[2];

export const LOGISTICS_CAMPUS_LOOP = Object.freeze({
  eastX: loopRoadX - logisticsCenterX,
  westX: -loopRoadX - logisticsCenterX,
  northZ: -loopRoadZ - logisticsCenterZ,
  southZ: loopRoadZ - logisticsCenterZ,

  /*
   * 외곽도로 모서리와 출차 합류부에서 사용할 회전 반경.
   */
  cornerRadius: 32,

  /*
   * 긴 외곽 순환 구간은 야드보다 조금 빠르게 주행한다.
   */
  speedMultiplier: 1.75,
});

export const LOGISTICS_YARD = Object.freeze({
  /*
   * 도크에 접안해 정차하는 위치
   */
  dockZ: 78,

  /*
   * 야드 안을 가로지르는 두 개의 차선
   */
  entryLaneZ: 128,
  exitLaneZ: 150,

  /*
   * 구내 정문과 출차 게이트
   */
  entryGateX: -262,
  exitGateX: 272,
  gateZ: 186,

  /*
   * 출차 후 단지 남측 외곽 순환도로에 합류하는 지점
   */
  offsiteZ: LOGISTICS_CAMPUS_LOOP.southZ,

  /*
   * 배차를 기다리는 정문 밖 대기열
   */
  standbyZ: 226,
  standbySpacingX: 48,

  /*
   * 도크 대기 위치는 배정 도크에서 x축으로 이만큼 떨어진 지점이다.
   */
  waitOffsetX: -26,
});

export function getDockX(dockNumber) {
  const dockX = LOGISTICS_DOCK_X[dockNumber - 1];

  if (typeof dockX !== "number") {
    throw new Error(`등록되지 않은 도크 번호입니다: ${dockNumber}`);
  }

  return dockX;
}
