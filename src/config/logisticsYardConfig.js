import { LOGISTICS_CENTER } from "./buildingConfig.js";
import { SITE } from "./siteConfig.js";

/*
 * 물류센터 야드 좌표계.
 *
 * 여기의 x, z 값은 모두 물류센터 그룹(LOGISTICS_CENTER) 로컬 좌표다.
 * 도크 셔터를 세우는 createLogisticsCenter와 트럭 주행 경로를 만드는
 * logisticsOperationController가 같은 값을 보도록 한곳에 모아둔다.
 *
 *      z=231  ── 배차 대기열 정차 줄 ─────────────────
 *      z=223  ── 단지 남측 외곽 순환도로 중심선 ──────
 *      z=215  ── 대기열 주행 차선 ──→ 정문
 *      z=186  ── 정문 ───────────────────────────────
 *      z=150  ── 출차 레인 ───────→ 출차 게이트 ──┐
 *      z=128  ── 입차 레인 ────────────────────→  │
 *                                    단지 동측 순환도로 ↑
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

/*
 * 부지 사각형이 원점 대칭이 아니므로 남·북 도로는
 * 부지 중심(centerZ)을 기준으로 놓인다.
 */
const siteCenterZ = SITE.centerZ ?? 0;
const logisticsCenterX = LOGISTICS_CENTER.position[0];
const logisticsCenterZ = LOGISTICS_CENTER.position[2];

/*
 * 대기열 정차 줄과 주행 차선을 순환도로 중심선 양옆으로 벌리는 간격.
 * 도로 폭의 1/4이라 두 줄 모두 포장 위에 남는다.
 */
const standbyLaneOffset = SITE.roadWidth / 4;

export const LOGISTICS_CAMPUS_LOOP = Object.freeze({
  eastX: loopRoadX - logisticsCenterX,
  westX: -loopRoadX - logisticsCenterX,
  northZ: siteCenterZ - loopRoadZ - logisticsCenterZ,
  southZ: siteCenterZ + loopRoadZ - logisticsCenterZ,

  /*
   * 외곽도로 모서리와 출차 합류부에서 사용할 회전 반경.
   */
  cornerRadius: 32,

  /*
   * 진출입로 포장을 도로 경계선까지만 깔기 위한 값.
   */
  roadHalfWidth: SITE.roadWidth / 2,

  /*
   * 순환도로 안쪽 선의 모서리 반경.
   * 야드 포장의 바깥 모서리를 이 값으로 깎으면
   * 도로 안쪽 곡선과 정확히 맞물려 틈이 생기지 않는다.
   */
  roadInnerCornerRadius:
    SITE.roadCornerRadius - SITE.roadWidth,

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
   * 구내 정문(z=gateZ)과 출차 게이트(z=exitLaneZ).
   * 출차 게이트는 출차 레인 끝에 있어 동측 순환도로로 바로 이어진다.
   */
  entryGateX: -262,
  exitGateX: 272,
  gateZ: 186,

  /*
   * 배차를 기다리는 정문 밖 대기열.
   * 정문에서 서쪽(-x)으로 늘어서므로 순환을 마친 트럭은
   * 남측 도로를 동쪽으로 달려 대기열 꼬리에서 합류한다.
   *
   * 정차 줄과 주행 차선은 남측 순환도로 중심선을 사이에 두고
   * 갈라진다. 복귀·출차 트럭은 항상 차선 쪽으로 지나가므로
   * 앞 순번이 아직 서 있어도 그 자리를 밟지 않는다.
   */
  standbyZ: LOGISTICS_CAMPUS_LOOP.southZ + standbyLaneOffset,
  standbyLaneZ: LOGISTICS_CAMPUS_LOOP.southZ - standbyLaneOffset,
  standbySpacingX: 48,

  /*
   * 정차 줄과 주행 차선을 오갈 때 쓰는 사선 구간의 x 길이
   */
  standbyMergeX: 40,

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
