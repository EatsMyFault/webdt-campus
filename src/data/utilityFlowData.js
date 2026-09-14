/**
 * 유틸리티 배관 유량 더미 데이터
 *
 * points:
 * 배관 중심을 따라 이동할 경로 좌표다.
 *
 * flowRate:
 * 현재 유량
 *
 * nominalFLowRate:
 * 기준 유량이며 애니메이션 속도 계산에 사용한다.
 */

export const UTILITY_FLOW_DATA = [
  /*
   * 공정용수 배관
   */
  {
    id: "FLOW-WATER-01",
    name: "공정용수 공급 라인",
    equipmentId: "TANK-UT-01",

    medium: "water",
    mediumLabel: "공정용수",

    status: "running",

    flowRate: 42.6,
    nominalFlowRate: 60,
    unit: "m³/h",

    color: 0x27a9df,
    emissiveColor: 0x54d5ff,

    markerCount: 12,
    markerRadius: 0.48,

    points: [
      [-185, 12.4, -20],
      [48.9, 12.4, -20],
      [50, 11.3, -20],
      [50, 9.2, -18.9],
      [50, 9.2, 34],
    ],
  },

  /*
   * 압축공기 배관
   */
  {
    id: "FLOW-AIR-01",
    name: "압축공기 공급 라인",
    equipmentId: "TANK-UT-02",

    medium: "compressed-air",
    mediumLabel: "압축공기",

    status: "warning",

    flowRate: 86.4,
    nominalFlowRate: 120,
    unit: "Nm³/min",

    color: 0x29b87d,
    emissiveColor: 0x54efac,

    markerCount: 14,
    markerRadius: 0.48,

    points: [
      [-185, 12.4, -12],
      [98.9, 12.4, -12],
      [100, 11.3, -12],
      [100, 7.4, -10.9],
      [100, 7.4, 34],
    ],
  },

    /*
   * 축열수 배관
   */
  {
    id: "FLOW-THERMAL-01",
    name: "축열수 공급 라인",
    equipmentId: "TANK-UT-03",

    medium: "thermal-water",
    mediumLabel: "축열수",

    status: "running",

    flowRate: 118.5,
    nominalFlowRate: 150,
    unit: "m³/h",

    color: 0xe99a2d,
    emissiveColor: 0xffc467,

    markerCount: 16,
    markerRadius: 0.52,

    points: [
      [-185, 12.4, -4],
      [148.9, 12.4, -4],
      [150, 11.3, -4],
      [150, 5.6, -2.9],
      [150, 5.6, 34],
    ],
  },
];

/*
 * ID로 유량 데이터를 찾기 위한 Map
 */
const flowById = new Map(
    UTILITY_FLOW_DATA.map(
        (flow) => [flow.id, flow],
    ),
);

/*
 * 특정 배관 데이터 조회
 */
export function getUtilityFlowById(flowId) {
    return flowById.get(flowId) ?? null;
}

/*
 * 더미 유량값 변경
 *
 * 나중에 WebSocket이나 API에서 새로운 유량을
 * 받았을 때도 이 함수를 그대로 사용할 수 있다.
 */
export function updateUtilityFlowRate(
    flowId,
    flowRate,
) {
    const flow = getUtilityFlowById(flowId);

    if (!flow) {
        return false;
    }

    flow.flowRate = Math.max(0, Number(flowRate) || 0,);

    return true;
}

/*
 * 배관 운전 상태 변경
 */
export function updateUtilityFlowStatus(
    flowId,
    status,
) {
    const flow = getUtilityFlowById(flowId);

    if (!flow) {
        return false;
    }

    flow.status = status;

    return true;
}
