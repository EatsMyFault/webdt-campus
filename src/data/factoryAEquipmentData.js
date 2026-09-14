const TEMPERATURE_OFFSETS = [
  -1.8, -1.2, -1.5, -0.6, -0.2, 0.7,
  0.3, 1.1, 0.8, 1.5, 1.1, 0,
];

function createTemperatureHistory(baseTemperature) {
  return TEMPERATURE_OFFSETS.map((offset, index) => ({
    time: `${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
    value: Number((baseTemperature + offset).toFixed(1)),
  }));
}

const CNC_CONFIGS = [
  { id: "CNC-A-01", name: "1호 CNC 선반", status: "running", temperature: 42.6, load: 78, rpm: 2140, vibration: 1.2, completed: 186, target: 240, product: "SHAFT-A17", workOrder: "WO-260908-01" },
  { id: "CNC-A-02", name: "2호 CNC 선반", status: "running", temperature: 44.1, load: 72, rpm: 1980, vibration: 1.0, completed: 172, target: 220, product: "SHAFT-A18", workOrder: "WO-260908-02" },
  { id: "CNC-A-03", name: "3호 CNC 선반", status: "warning", temperature: 67.8, load: 91, rpm: 2310, vibration: 3.8, completed: 138, target: 210, product: "HOUSING-B04", workOrder: "WO-260908-03", alert: "주축 진동값이 주의 기준을 초과했습니다." },
  { id: "CNC-A-04", name: "4호 CNC 선반", status: "running", temperature: 41.3, load: 66, rpm: 1860, vibration: 0.9, completed: 201, target: 260, product: "SLEEVE-C11", workOrder: "WO-260908-04" },
  { id: "CNC-A-05", name: "5호 CNC 선반", status: "idle", temperature: 29.4, load: 0, rpm: 0, vibration: 0.1, completed: 160, target: 160, product: "FLANGE-D02", workOrder: "WO-260908-05", alert: "금일 작업 완료 후 다음 작업을 대기 중입니다." },
  { id: "CNC-A-06", name: "6호 CNC 선반", status: "running", temperature: 46.8, load: 81, rpm: 2200, vibration: 1.4, completed: 149, target: 200, product: "SHAFT-A17", workOrder: "WO-260908-06" },
  { id: "CNC-A-07", name: "7호 CNC 선반", status: "warning", temperature: 63.2, load: 88, rpm: 2260, vibration: 3.2, completed: 121, target: 190, product: "GEAR-E08", workOrder: "WO-260908-07", alert: "절삭유 온도가 권장 범위보다 높습니다." },
  { id: "CNC-A-08", name: "8호 CNC 선반", status: "running", temperature: 43.7, load: 69, rpm: 1920, vibration: 1.1, completed: 194, target: 250, product: "SLEEVE-C12", workOrder: "WO-260908-08" },
];

const cncEquipment = CNC_CONFIGS.map((config, index) => ({
  id: config.id,
  name: config.name,
  type: "cnc",
  typeLabel: "CNC 정밀가공기",
  status: config.status,
  location: `생산 A동 · CNC 가공 셀 ${index + 1}`,
  description: "금속 부품의 선삭 및 정밀가공 공정을 수행하는 CNC 설비입니다.",
  metrics: [
    { label: "주축 온도", value: config.temperature, unit: "°C", emphasis: config.temperature >= 60 },
    { label: "주축 부하", value: config.load, unit: "%", emphasis: config.load >= 85 },
    { label: "회전 속도", value: config.rpm.toLocaleString("ko-KR"), unit: "RPM" },
    { label: "진동", value: config.vibration, unit: "mm/s", emphasis: config.vibration >= 3 },
  ],
  temperatureHistory: createTemperatureHistory(config.temperature),
  production: {
    workOrder: config.workOrder,
    product: config.product,
    target: config.target,
    completed: config.completed,
    unit: "EA",
    cycleTime: config.status === "idle" ? "-" : `${(42 + index * 1.7).toFixed(1)}초`,
  },
  maintenance: {
    lastInspection: `2026-08-${String(18 + index).padStart(2, "0")}`,
    nextInspection: `2026-09-${String(18 + index).padStart(2, "0")}`,
    operatingHours: `${(3821 + index * 237).toLocaleString("ko-KR")} h`,
  },
  alert: config.alert ?? "현재 감지된 이상이 없습니다.",
}));

const conveyorEquipment = {
  id: "CONVEYOR-A-01",
  name: "A동 조립 이송 컨베이어",
  type: "conveyor",
  typeLabel: "자동 이송 설비",
  status: "running",
  location: "생산 A동 · 조립 및 이송 구역",
  description: "가공 완료 부품을 검사 및 조립 공정으로 자동 이송하는 컨베이어입니다.",
  metrics: [
    { label: "벨트 속도", value: 18.4, unit: "m/min" },
    { label: "모터 온도", value: 38.7, unit: "°C" },
    { label: "적재율", value: 64, unit: "%" },
    { label: "시간당 처리량", value: 126, unit: "EA/h" },
  ],
  temperatureHistory: createTemperatureHistory(38.7),
  production: {
    workOrder: "TR-260908-A",
    product: "가공 완료 부품 이송",
    target: 960,
    completed: 612,
    unit: "EA",
    cycleTime: "28.6초",
  },
  maintenance: {
    lastInspection: "2026-08-30",
    nextInspection: "2026-09-30",
    operatingHours: "6,284 h",
  },
  alert: "현재 감지된 이상이 없습니다.",
};

const supportEquipment = [
  {
    id: "DUST-A-01",
    name: "1호 카트리지 집진기",
    type: "dust-collector",
    typeLabel: "공정 집진 설비",
    detailCategory: "support",
    status: "running",
    location: "생산 A동 · 집진·공압 지원실",
    description: "CNC 가공 중 발생하는 미세 분진과 오일 미스트를 포집하는 집진 설비입니다.",
    metrics: [
      { label: "차압", value: 1.28, unit: "kPa" },
      { label: "필터 부하", value: 62, unit: "%" },
      { label: "송풍기 속도", value: "1,480", unit: "RPM" },
      { label: "배출 분진", value: 2.1, unit: "mg/m³" },
    ],
    temperatureHistory: createTemperatureHistory(36.4),
    production: {
      workOrder: "ENV-A-260910-01",
      product: "CNC 분진·오일 미스트",
      target: 24,
      completed: 18,
      unit: "h",
      cycleTime: "연속 운전",
    },
    maintenance: {
      lastInspection: "2026-09-02",
      nextInspection: "2026-10-02",
      operatingHours: "4,812 h",
    },
    alert: "필터와 배출 농도가 정상 범위입니다.",
  },
  {
    id: "DUST-A-02",
    name: "2호 카트리지 집진기",
    type: "dust-collector",
    typeLabel: "공정 집진 설비",
    detailCategory: "support",
    status: "warning",
    location: "생산 A동 · 집진·공압 지원실",
    description: "CNC 가공 셀 후단의 미세 분진과 오일 미스트를 포집하는 예비 병렬 집진기입니다.",
    metrics: [
      { label: "차압", value: 2.46, unit: "kPa", emphasis: true },
      { label: "필터 부하", value: 88, unit: "%", emphasis: true },
      { label: "송풍기 속도", value: "1,520", unit: "RPM" },
      { label: "배출 분진", value: 4.8, unit: "mg/m³", emphasis: true },
    ],
    temperatureHistory: createTemperatureHistory(43.8),
    production: {
      workOrder: "ENV-A-260910-02",
      product: "CNC 분진·오일 미스트",
      target: 24,
      completed: 16,
      unit: "h",
      cycleTime: "연속 운전",
    },
    maintenance: {
      lastInspection: "2026-08-14",
      nextInspection: "2026-09-14",
      operatingHours: "5,327 h",
    },
    alert: "필터 차압이 주의 기준에 근접했습니다. 필터 점검이 필요합니다.",
  },
  {
    id: "COMP-A-01",
    name: "A동 스크류 공기압축기",
    type: "air-compressor",
    typeLabel: "압축공기 공급 설비",
    detailCategory: "support",
    status: "running",
    location: "생산 A동 · 집진·공압 지원실",
    description: "CNC 척과 공압 액추에이터에 사용하는 압축공기를 생산하고 공급하는 설비입니다.",
    metrics: [
      { label: "토출 압력", value: 7.2, unit: "bar" },
      { label: "토출 온도", value: 71.6, unit: "°C" },
      { label: "공급 유량", value: 18.4, unit: "m³/min" },
      { label: "모터 부하", value: 73, unit: "%" },
    ],
    temperatureHistory: createTemperatureHistory(71.6),
    production: {
      workOrder: "AIR-A-260910-01",
      product: "7 bar 압축공기",
      target: 24,
      completed: 19,
      unit: "h",
      cycleTime: "부하·무부하 제어",
    },
    maintenance: {
      lastInspection: "2026-08-28",
      nextInspection: "2026-09-28",
      operatingHours: "7,146 h",
    },
    alert: "토출 압력과 모터 부하가 정상 범위입니다.",
  },
];

export const FACTORY_A_EQUIPMENT = [
  ...cncEquipment,
  conveyorEquipment,
  ...supportEquipment,
].map((equipment) => ({
  ...equipment,
  facilityId: "factory-a",
  facilityLabel: "생산 A동",
}));

const equipmentById = new Map(
  FACTORY_A_EQUIPMENT.map((equipment) => [equipment.id, equipment]),
);

export function getFactoryAEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
