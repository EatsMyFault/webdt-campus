const TREND_OFFSETS = [-1.1, -0.7, -0.4, 0.2, 0.5, 0.9, 0.6, 1.2, 0.8, 0.4, -0.1, 0];

function createTrend(base) {
  return TREND_OFFSETS.map((offset, index) => ({
    time: `${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
    value: Number((base + offset).toFixed(1)),
  }));
}

function createCommon(config) {
  return {
    ...config,
    detailCategory: "logistics",
    facilityId: "logistics",
    facilityLabel: "자재·출하 물류센터",
    temperatureHistory: createTrend(config.temperature),
    maintenance: {
      lastInspection: config.lastInspection ?? "2026-09-08",
      nextInspection: config.nextInspection ?? "2026-10-08",
      operatingHours: config.operatingHours,
    },
  };
}

const TRUCK_CONFIGS = [
  {
    id: "TRUCK-LG-01", name: "1호 출하 트럭", status: "running",
    vehicleNumber: "85아 4107", carrier: "한빛물류", driver: "김도윤",
    shipmentOrder: "SO-260911-01", cargo: "BP-400-60", quantity: 240, handled: 173,
    loadProgress: 72, dockId: "DOCK-LG-01", dockLabel: "1번 출하 도크",
    origin: "팩 조립동 출하 버퍼", destination: "울산 전기차 조립공장",
    arrivalAt: "2026-09-11 09:20", departureAt: "2026-09-11 10:30",
    stage: "loading", stageLabel: "상차 중", temperature: 34.6, mileage: "128,430 km",
  },
  {
    id: "TRUCK-LG-02", name: "2호 출하 트럭", status: "idle",
    vehicleNumber: "91바 2384", carrier: "남도운송", driver: "이준호",
    shipmentOrder: "SO-260911-02", cargo: "BP-800-95", quantity: 180, handled: 0,
    loadProgress: 0, dockId: "DOCK-LG-03", dockLabel: "3번 출하 도크",
    origin: "팩 조립동 출하 대기 구역", destination: "화성 전기차 조립공장",
    arrivalAt: "2026-09-11 10:05", departureAt: "2026-09-11 11:10",
    stage: "waiting", stageLabel: "도크 대기", temperature: 29.8, mileage: "96,120 km",
  },
  {
    id: "TRUCK-LG-03", name: "3호 출하 트럭", status: "warning",
    vehicleNumber: "83자 7712", carrier: "스마트로지스", driver: "박현우",
    shipmentOrder: "SO-260911-03", cargo: "BP-PHEV-18", quantity: 320, handled: 138,
    loadProgress: 43, dockId: "DOCK-LG-05", dockLabel: "5번 출하 도크",
    origin: "팩 조립동 출하 검사 구역", destination: "부산 수출 물류센터",
    arrivalAt: "2026-09-11 09:45", departureAt: "2026-09-11 11:40",
    stage: "inspection", stageLabel: "출하검사 보류", temperature: 48.2, mileage: "154,880 km",
  },
  {
    id: "TRUCK-LG-04", name: "4호 입고 트럭", status: "running",
    vehicleNumber: "89사 5529", carrier: "큐브운송", driver: "최민석",
    shipmentOrder: "IN-260911-04", cargo: "각형 셀 CELL-P71", quantity: 96, handled: 96,
    loadProgress: 100, dockId: "DOCK-LG-07", dockLabel: "7번 입출고 도크",
    origin: "셀 공급사 물류센터", destination: "셀 보관 창고",
    arrivalAt: "2026-09-11 08:50", departureAt: "2026-09-11 10:15",
    stage: "unloading", stageLabel: "하차 중", temperature: 36.4, mileage: "72,340 km",
  },
];

export const LOGISTICS_TRUCKS = TRUCK_CONFIGS.map((truck) => createCommon({
  id: truck.id,
  name: truck.name,
  type: "truck",
  typeLabel: "물류 운송 차량",
  status: truck.status,
  temperature: truck.temperature,
  location: `자재·출하 물류센터 · ${truck.dockLabel}`,
  description: "완성 팩 출하와 셀·자재 입고를 담당하는 물류 운송 차량입니다.",
  metrics: [
    { label: "차량 온도", value: truck.temperature, unit: "°C" },
    { label: "상·하차 진행률", value: truck.loadProgress, unit: "%" },
    { label: "처리 수량", value: truck.handled, unit: `/${truck.quantity} EA` },
    { label: "배정 도크", value: truck.dockLabel, unit: "" },
  ],
  production: {
    workOrder: truck.shipmentOrder, product: truck.cargo,
    target: truck.quantity, completed: truck.handled, unit: "EA",
    cycleTime: truck.departureAt,
  },
  operatingHours: truck.mileage,
  alert: truck.status === "warning"
    ? "출하 문서와 적재 수량의 대조 확인이 필요합니다."
    : `${truck.stageLabel} 작업이 정상적으로 진행 중입니다.`,
  logistics: { kind: "truck", ...truck },
}));

const DOCK_CONFIGS = [
  { number: 1, status: "running", stage: "loading", stageLabel: "상차 중", truckId: "TRUCK-LG-01", vehicleNumber: "85아 4107", order: "SO-260911-01", cargo: "BP-400-60", quantity: 240, handled: 173, progress: 72, queue: 0, throughput: 18 },
  { number: 2, status: "idle", stage: "available", stageLabel: "배정 가능", truckId: null, vehicleNumber: "-", order: "-", cargo: "대기 중", quantity: 1, handled: 0, progress: 0, queue: 0, throughput: 12 },
  { number: 3, status: "idle", stage: "reserved", stageLabel: "차량 진입 대기", truckId: "TRUCK-LG-02", vehicleNumber: "91바 2384", order: "SO-260911-02", cargo: "BP-800-95", quantity: 180, handled: 0, progress: 0, queue: 1, throughput: 15 },
  { number: 4, status: "running", stage: "loading", stageLabel: "상차 중", truckId: null, vehicleNumber: "협력사 차량", order: "SO-260911-04", cargo: "BP-400-60", quantity: 210, handled: 126, progress: 60, queue: 0, throughput: 20 },
  { number: 5, status: "warning", stage: "inspection", stageLabel: "출하검사 보류", truckId: "TRUCK-LG-03", vehicleNumber: "83자 7712", order: "SO-260911-03", cargo: "BP-PHEV-18", quantity: 320, handled: 138, progress: 43, queue: 0, throughput: 9 },
  { number: 6, status: "idle", stage: "cleaning", stageLabel: "도크 정리 중", truckId: null, vehicleNumber: "-", order: "-", cargo: "작업 종료", quantity: 1, handled: 1, progress: 100, queue: 0, throughput: 14 },
  { number: 7, status: "running", stage: "unloading", stageLabel: "입고 하차 중", truckId: "TRUCK-LG-04", vehicleNumber: "89사 5529", order: "IN-260911-04", cargo: "각형 셀 CELL-P71", quantity: 96, handled: 96, progress: 100, queue: 1, throughput: 11 },
];

export const LOGISTICS_DOCKS = DOCK_CONFIGS.map((dock) => {
  const number = String(dock.number).padStart(2, "0");
  const temperature = dock.status === "warning" ? 58.4 : 31.5 + dock.number * 0.6;

  return createCommon({
    id: `DOCK-LG-${number}`,
    name: `${dock.number}번 출하 도크`,
    type: "shipping-dock",
    typeLabel: "상하차 도크",
    status: dock.status,
    temperature,
    location: `자재·출하 물류센터 · 전면 도크 ${dock.number}`,
    description: "트럭 도킹, 셔터 제어와 셀·완성 팩 상하차를 관리하는 도크입니다.",
    metrics: [
      { label: "제어반 온도", value: temperature, unit: "°C", emphasis: dock.status === "warning" },
      { label: "작업 진행률", value: dock.progress, unit: "%" },
      { label: "대기 차량", value: dock.queue, unit: "대" },
      { label: "시간당 처리량", value: dock.throughput, unit: "PLT/h" },
    ],
    production: {
      workOrder: dock.order, product: dock.cargo,
      target: dock.quantity, completed: dock.handled, unit: "EA",
      cycleTime: dock.stageLabel,
    },
    operatingHours: `${(1840 + dock.number * 173).toLocaleString("ko-KR")} Cycle`,
    alert: dock.status === "warning"
      ? "출하 검사 보류 상태입니다. 문서와 적재 수량을 확인하세요."
      : "도크 인터록과 안전 센서가 정상입니다.",
    logistics: {
      kind: "dock", dockNumber: dock.number, doorId: `L-DOOR-${number}`,
      assignedTruckId: dock.truckId, ...dock,
    },
  });
});

export const LOGISTICS_EQUIPMENT = [...LOGISTICS_TRUCKS, ...LOGISTICS_DOCKS];

const equipmentById = new Map(LOGISTICS_EQUIPMENT.map((equipment) => [equipment.id, equipment]));

export function getLogisticsEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
