/*
 * 물류 트럭 작업 흐름 데이터.
 *
 * 트럭 한 대는 아래 순서를 반복한다.
 *
 *   배차 대기 → 입차 → 도크 대기 → 도킹 → 상·하차 → 출차
 *   → 단지 외곽 순환 → 배차 대기
 *
 * 각 단계는 UI에 그대로 노출되므로 라벨과 상태값을 여기서 관리한다.
 */

export const LOGISTICS_STAGES = Object.freeze({
  standby: Object.freeze({
    id: "standby",
    label: "배차 대기",
    status: "idle",
    dockLabel: "배정 가능",
    dockStatus: "idle",
    alert: "정문 밖 대기열에서 배차를 기다리는 중입니다.",
  }),

  approaching: Object.freeze({
    id: "approaching",
    label: "입차 이동",
    status: "running",
    dockLabel: "차량 진입 대기",
    dockStatus: "idle",
    alert: "구내 정문을 통과해 배정 도크로 이동 중입니다.",
  }),

  waiting: Object.freeze({
    id: "waiting",
    label: "도크 대기",
    status: "idle",
    dockLabel: "차량 진입 대기",
    dockStatus: "idle",
    alert: "배정 도크 앞 대기 구역에서 접안 순서를 기다리는 중입니다.",
  }),

  docking: Object.freeze({
    id: "docking",
    label: "도킹 중",
    status: "running",
    dockLabel: "차량 접안 중",
    dockStatus: "running",
    alert: "도크 정렬 후 후진 접안을 진행 중입니다.",
  }),

  handling: Object.freeze({
    id: "handling",
    label: "상·하차 중",
    status: "running",
    dockLabel: "상·하차 중",
    dockStatus: "running",
    alert: "상·하차 작업이 정상적으로 진행 중입니다.",
  }),

  departing: Object.freeze({
    id: "departing",
    label: "출차 이동",
    status: "running",
    dockLabel: "도크 정리 중",
    dockStatus: "idle",
    alert: "작업을 마치고 출차 게이트로 이동 중입니다.",
  }),

  circulating: Object.freeze({
    id: "circulating",
    label: "단지 순환 운행",
    status: "running",
    dockLabel: "배정 가능",
    dockStatus: "idle",
    alert: "출차 후 단지 외곽 순환도로를 한 바퀴 주행 중입니다.",
  }),
});

/*
 * 상·하차 단계는 트럭 방향에 따라 다르게 부른다.
 */
export const LOGISTICS_HANDLING_LABEL = Object.freeze({
  outbound: Object.freeze({
    truck: "상차 중",
    dock: "출하 상차 중",
    action: "상차",
  }),

  inbound: Object.freeze({
    truck: "하차 중",
    dock: "입고 하차 중",
    action: "하차",
  }),
});

/*
 * 트럭별 운행 계획.
 *
 * dispatchDelay는 첫 배차까지 기다리는 시간으로,
 * 트럭이 같은 차선에 겹치지 않도록 간격을 벌리는 용도다.
 */
export const LOGISTICS_TRUCK_OPERATIONS = Object.freeze([
  Object.freeze({
    truckId: "TRUCK-LG-01",
    dockId: "DOCK-LG-01",
    dockNumber: 1,
    direction: "outbound",
    standbySlot: 0,
    dispatchDelay: 1,
    standbyDuration: 10,
    driveSpeed: 26,
    dockingSpeed: 9,
    waitDuration: 6,
    handlingDuration: 22,
  }),

  Object.freeze({
    truckId: "TRUCK-LG-02",
    dockId: "DOCK-LG-03",
    dockNumber: 3,
    direction: "outbound",
    standbySlot: 1,
    dispatchDelay: 4,
    standbyDuration: 10,
    driveSpeed: 26,
    dockingSpeed: 9,
    waitDuration: 6,
    handlingDuration: 26,
  }),

  Object.freeze({
    truckId: "TRUCK-LG-03",
    dockId: "DOCK-LG-05",
    dockNumber: 5,
    direction: "outbound",
    standbySlot: 2,
    dispatchDelay: 7,
    standbyDuration: 10,
    driveSpeed: 26,
    dockingSpeed: 9,
    waitDuration: 6,
    handlingDuration: 28,

    /*
     * 3호 트럭은 상차 도중 출하검사 보류가 걸리는 시나리오다.
     * 지정 진행률에서 작업이 멈추고 경고 상태로 바뀐다.
     */
    inspectionHold: Object.freeze({
      atProgress: 43,
      duration: 9,
      label: "출하검사 보류",
      alert: "출하 문서와 적재 수량의 대조 확인이 필요합니다.",
    }),
  }),

  Object.freeze({
    truckId: "TRUCK-LG-04",
    dockId: "DOCK-LG-07",
    dockNumber: 7,
    direction: "inbound",
    standbySlot: 3,
    dispatchDelay: 10,
    standbyDuration: 10,
    driveSpeed: 26,
    dockingSpeed: 9,
    waitDuration: 5,
    handlingDuration: 18,
  }),
]);
