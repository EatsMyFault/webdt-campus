/*
 * 부지 치수.
 *
 * 구역이 원점 대칭이 아니라 북쪽(운영동)으로 더 뻗어 있어
 * 부지도 정사각형이 아니다. centerZ 는 부지 사각형의 중심이
 * 원점에서 얼마나 북쪽에 있는지를 나타낸다.
 *
 *   구역 경계  z -548 ~ 400
 *   부지 경계  z -600 ~ 452  (centerZ -74, depth 1052)
 *
 * 이렇게 두면 구역 끝과 순환도로 사이 여백이 사방 모두
 * 4~12 로 비슷해져 남쪽에 빈 땅이 남지 않는다.
 */
export const SITE = Object.freeze({
  width: 1240,
  depth: 1052,
  centerZ: -74,
  worldWidth: 2200,
  worldDepth: 2000,
  roadWidth: 32,

  /*
   * 외곽 순환도로 바깥선의 모서리 반경.
   * 중심선 반경이 48 - 16 = 32 가 되어
   * 트럭 경로의 회전 반경(LOGISTICS_CAMPUS_LOOP.cornerRadius)과 맞는다.
   */
  roadCornerRadius: 48,

  plotWidth: 520,
  plotDepth: 360,
});

export const SITE_ZONES = Object.freeze([
  {
    id: "factory-a",
    label: "모듈 조립동 구역",
    position: [-300, -220],
    size: [520, 360],
    color: 0x86c5b7,
    accent: "#2f9e89",
    opacity: 0.16,
    showLabel: false,
  },
  {
    id: "factory-b",
    label: "팩 조립동 구역",
    position: [300, -220],
    size: [520, 360],
    color: 0x85b9d3,
    accent: "#3c86ad",
    opacity: 0.16,
    showLabel: false,
  },
  {
    id: "utility",
    label: "유틸리티 플랜트 구역",
    position: [-300, 220],
    size: [520, 360],
    color: 0xb7a4d8,
    accent: "#8063b4",
    opacity: 0.16,
    showLabel: false,
  },
  {
    id: "logistics",
    label: "자재·출하 물류 구역",
    position: [300, 220],
    size: [520, 360],
    color: 0xe5b875,
    accent: "#c27d2f",
    opacity: 0.2,
    showLabel: false,
  },
  {
    id: "office",
    label: "운영동 구역",
    position: [260, -478],
    size: [520, 140],
    color: 0x9aadb8,
    accent: "#496e7d",
    opacity: 0.18,
    showLabel: false,
  },
]);
