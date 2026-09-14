const TEMPERATURE_OFFSETS = [
  -1.3, -0.8, -1.0, -0.4, 0.2, 0.6,
  0.4, 1.0, 0.7, 1.4, 0.9, 0,
];

function createTemperatureHistory(baseTemperature) {
  return TEMPERATURE_OFFSETS.map((offset, index) => ({
    time: `${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
    value: Number((baseTemperature + offset).toFixed(1)),
  }));
}

function createEquipment({
  id, name, type, typeLabel, status, location, description,
  temperature, metrics, workOrder, product, target, completed,
  unit = "EA", cycleTime, lastInspection = "2026-09-02",
  nextInspection = "2026-10-02", operatingHours = "3,840 h",
  alert = "현재 감지된 이상이 없습니다.",
}) {
  return {
    id, name, type, typeLabel, status,
    facilityId: "factory-b",
    facilityLabel: "생산 B동",
    location,
    description,
    metrics: [
      { label: "설비 온도", value: temperature, unit: "°C", emphasis: temperature >= 55 },
      ...metrics,
    ],
    temperatureHistory: createTemperatureHistory(temperature),
    production: { workOrder, product, target, completed, unit, cycleTime },
    maintenance: { lastInspection, nextInspection, operatingHours },
    alert,
  };
}

const LINE_CONFIGS = [
  { id: "ASSEMBLY-B-01", name: "1호 자동조립 라인", status: "running", temperature: 39.4, load: 74, takt: 48.2, wip: 18, completed: 418, target: 560, product: "GEARBOX-X1" },
  { id: "ASSEMBLY-B-02", name: "2호 자동조립 라인", status: "warning", temperature: 55.8, load: 89, takt: 53.7, wip: 27, completed: 351, target: 520, product: "GEARBOX-X2", alert: "평균 사이클 타임이 관리 기준을 초과했습니다." },
  { id: "ASSEMBLY-B-03", name: "3호 자동조립 라인", status: "stopped", temperature: 27.6, load: 0, takt: 0, wip: 0, completed: 284, target: 480, product: "ACTUATOR-Z4", alert: "자재 공급 대기로 라인이 일시 정지되었습니다." },
];

const assemblyLines = LINE_CONFIGS.map((config, index) => createEquipment({
  ...config,
  type: "assembly-line",
  typeLabel: "자동조립 생산라인",
  location: `생산 B동 · 자동조립 라인 ${index + 1}`,
  description: "부품 공급, 조립, 체결과 공정 간 이송을 연속으로 수행하는 자동조립 라인입니다.",
  metrics: [
    { label: "라인 부하", value: config.load, unit: "%", emphasis: config.load >= 85 },
    { label: "택트 타임", value: config.takt || "-", unit: config.takt ? "초" : "" },
    { label: "공정 재공품", value: config.wip, unit: "EA" },
  ],
  workOrder: `WO-260910-B0${index + 1}`,
  cycleTime: config.takt ? `${config.takt.toFixed(1)}초` : "정지",
  operatingHours: `${(5210 + index * 486).toLocaleString("ko-KR")} h`,
}));

const ROBOT_CONFIGS = [
  { id: "ASSEMBLY-B-01-ROBOT-01", name: "1라인 조립 로봇 1호", status: "running", temperature: 43.1, load: 68, torque: 38.4, repeatability: 0.04, completed: 421 },
  { id: "ASSEMBLY-B-01-ROBOT-02", name: "1라인 조립 로봇 2호", status: "running", temperature: 44.6, load: 72, torque: 41.2, repeatability: 0.03, completed: 419 },
  { id: "ASSEMBLY-B-02-ROBOT-01", name: "2라인 체결 로봇 1호", status: "warning", temperature: 62.4, load: 92, torque: 47.8, repeatability: 0.09, completed: 354, alert: "3축 서보 모터 온도가 주의 기준을 초과했습니다." },
  { id: "ASSEMBLY-B-02-ROBOT-02", name: "2라인 조립 로봇 2호", status: "running", temperature: 46.2, load: 77, torque: 40.6, repeatability: 0.04, completed: 352 },
  { id: "ASSEMBLY-B-03-ROBOT-01", name: "3라인 조립 로봇 1호", status: "idle", temperature: 28.1, load: 0, torque: 0, repeatability: 0.04, completed: 286, alert: "상위 조립라인 정지로 안전 대기 중입니다." },
  { id: "ASSEMBLY-B-03-ROBOT-02", name: "3라인 조립 로봇 2호", status: "idle", temperature: 27.8, load: 0, torque: 0, repeatability: 0.03, completed: 284, alert: "상위 조립라인 정지로 안전 대기 중입니다." },
];

const assemblyRobots = ROBOT_CONFIGS.map((config) => {
  const lineNumber = Number(config.id.match(/ASSEMBLY-B-(\d{2})/)?.[1]);
  return createEquipment({
    ...config,
    type: "assembly-robot",
    typeLabel: "6축 산업용 로봇",
    location: `생산 B동 · ${lineNumber}호 조립라인 로봇 셀`,
    description: "부품 픽업, 위치 정렬과 자동 체결 작업을 수행하는 6축 산업용 로봇입니다.",
    metrics: [
      { label: "로봇 부하", value: config.load, unit: "%", emphasis: config.load >= 90 },
      { label: "체결 토크", value: config.torque, unit: "N·m", emphasis: config.torque >= 46 },
      { label: "반복 정밀도", value: config.repeatability, unit: "mm", emphasis: config.repeatability >= 0.08 },
    ],
    workOrder: `RB-260910-${config.id.slice(-8)}`,
    product: "자동조립 및 체결",
    target: 560,
    unit: "Cycle",
    cycleTime: config.status === "idle" ? "대기" : `${(21.8 + config.load * 0.04).toFixed(1)}초`,
    lastInspection: "2026-08-28",
    nextInspection: "2026-09-28",
    operatingHours: `${(3280 + config.completed * 3).toLocaleString("ko-KR")} h`,
  });
});

const PREPARATION_CONFIGS = [
  { id: "PREP-B-01", name: "부품 준비 스테이션 1호", status: "running", temperature: 31.8, prepared: 438, target: 560, shortage: 0, pending: 14 },
  { id: "PREP-B-02", name: "부품 준비 스테이션 2호", status: "warning", temperature: 38.6, prepared: 361, target: 520, shortage: 3, pending: 26, alert: "베어링 키트 3종의 보충이 필요합니다." },
  { id: "PREP-B-03", name: "부품 준비 스테이션 3호", status: "idle", temperature: 27.2, prepared: 284, target: 480, shortage: 0, pending: 0, alert: "3호 조립라인 정지로 키팅 작업을 대기 중입니다." },
];

const preparationStations = PREPARATION_CONFIGS.map((config, index) => createEquipment({
  ...config,
  type: "preparation-station",
  typeLabel: "부품 키팅 스테이션",
  location: `생산 B동 · 자재 준비 구역 ${index + 1}`,
  description: "조립 순서에 맞춰 부품을 분류하고 생산라인에 공급하는 키팅 작업대입니다.",
  metrics: [
    { label: "준비 완료", value: config.prepared, unit: "Kit" },
    { label: "부족 품목", value: config.shortage, unit: "종", emphasis: config.shortage > 0 },
    { label: "공급 대기", value: config.pending, unit: "Kit", emphasis: config.pending >= 20 },
  ],
  workOrder: `KIT-260910-0${index + 1}`,
  product: `${index + 1}호 라인 조립 키트`,
  completed: config.prepared,
  unit: "Kit",
  cycleTime: config.status === "idle" ? "대기" : `${(32.5 + index * 2.4).toFixed(1)}초`,
  lastInspection: "2026-09-05",
  nextInspection: "2026-10-05",
}));

const qualityInspection = createEquipment({
  id: "QUALITY-B-01", name: "B동 비전 품질검사기",
  type: "quality-inspection", typeLabel: "AI 비전 검사 설비",
  status: "warning", location: "생산 B동 · 최종 품질검사 구역",
  description: "조립 완료품의 외관, 치수와 누락 부품을 카메라 영상으로 자동 검사합니다.",
  temperature: 52.3,
  metrics: [
    { label: "금일 검사", value: 892, unit: "EA" },
    { label: "양품률", value: 98.4, unit: "%" },
    { label: "불량 검출", value: 14, unit: "EA", emphasis: true },
  ],
  workOrder: "QC-260910-B01", product: "조립 완성품 최종검사",
  target: 1080, completed: 892, cycleTime: "4.8초",
  nextInspection: "2026-09-16", operatingHours: "4,218 h",
  alert: "카메라 하우징 온도가 권장 범위보다 높습니다.",
});

const AGV_CONFIGS = [
  { id: "AGV-B-01", name: "B동 물류 AGV 1호", status: "running", temperature: 36.7, battery: 78, speed: 1.4, missions: 64, target: 90 },
  { id: "AGV-B-02", name: "B동 물류 AGV 2호", status: "idle", temperature: 29.8, battery: 34, speed: 0, missions: 51, target: 90, alert: "충전 스테이션 이동 명령을 대기 중입니다." },
];

const agvs = AGV_CONFIGS.map((config, index) => createEquipment({
  ...config,
  type: "agv", typeLabel: "자율주행 운반차",
  location: `생산 B동 · AGV 물류 레인 ${index + 1}`,
  description: "부품 키트와 완성품을 생산 구역 사이에서 자율 운반하는 AGV입니다.",
  metrics: [
    { label: "배터리", value: config.battery, unit: "%", emphasis: config.battery <= 35 },
    { label: "주행 속도", value: config.speed, unit: "m/s" },
    { label: "완료 미션", value: config.missions, unit: "회" },
  ],
  workOrder: `AGV-260910-0${index + 1}`, product: "부품 및 완성품 운반",
  completed: config.missions, unit: "Mission",
  cycleTime: config.status === "idle" ? "충전 대기" : "6분 18초",
  lastInspection: "2026-09-06", nextInspection: "2026-09-20",
}));

export const FACTORY_B_EQUIPMENT = [
  ...assemblyLines,
  ...assemblyRobots,
  ...preparationStations,
  qualityInspection,
  ...agvs,
];

const equipmentById = new Map(
  FACTORY_B_EQUIPMENT.map((equipment) => [equipment.id, equipment]),
);

export function getFactoryBEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
