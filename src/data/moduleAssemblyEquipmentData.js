/*
 * 모듈 조립동(MA-01) 설비 데이터.
 *
 * 공정 순서대로 늘어놓았다.
 *   셀 수입검사 → 셀 스태킹 → 버스바 레이저 용접 → 모듈 EOL 검사
 *
 * 값은 모두 데모용 더미 데이터다.
 * 실제 설비를 연결할 때는 같은 모양의 객체만 넘기면 UI는 그대로 쓴다.
 */

const TEMPERATURE_OFFSETS = [
  -1.8, -1.2, -1.5, -0.6, -0.2, 0.7,
  0.3, 1.1, 0.8, 1.5, 1.1, 0,
];

/*
 * 모듈 한 대에 들어가는 셀 수.
 *
 * 셀 검사 설비는 셀 한 장씩 처리하지만 라인에 흐르는 것은 모듈이다.
 * 그래서 라인 관점의 사이클은 셀당 시간에 이 수를 곱한 값이다.
 */
const CELLS_PER_MODULE = 12;

/*
 * 1분이 넘는 공정은 초로만 적으면 길이가 잘 안 와닿는다.
 */
function formatCycleTime(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);

  return rest > 0 ? `${minutes}분 ${rest}초` : `${minutes}분`;
}

function createTemperatureHistory(baseTemperature) {
  return TEMPERATURE_OFFSETS.map((offset, index) => ({
    time: `${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
    value: Number((baseTemperature + offset).toFixed(1)),
  }));
}

/*
 * 공정 단계별 설비를 같은 모양으로 만든다.
 * metrics 첫 줄은 어느 설비든 대표 온도로 맞춰 둔다.
 *
 * 공기압축기는 토출 열 때문에 70도 부근이 정상이라
 * 온도만으로 경고를 띄우지 않는다.
 */
function createEquipment({
  id, name, type, typeLabel, processStep, status, location,
  description, temperature, metrics, workOrder, product,
  target, completed, unit = "EA", cycleSeconds, cycleLabel,
  lastInspection = "2026-09-05", nextInspection = "2026-10-05",
  operatingHours = "4,120 h", detailCategory,
  alert = "현재 감지된 이상이 없습니다.",
}) {
  return {
    id,
    name,
    type,
    typeLabel,
    processStep,
    ...(detailCategory ? { detailCategory } : {}),
    status,
    facilityId: "factory-a",
    facilityLabel: "모듈 조립동",
    location,
    description,
    metrics: [
      {
        label: "설비 온도",
        value: temperature,
        unit: "°C",
        emphasis: temperature >= 60 && type !== "air-compressor",
      },
      ...metrics,
    ],
    temperatureHistory: createTemperatureHistory(temperature),
    production: {
      workOrder, product, target, completed, unit,

      /*
       * 설비가 쉬고 있어도 설비 자체의 사이클은 그대로다.
       * 라인 택트 계산에는 설치 기준 값을 쓰고,
       * 화면에는 지금 상태를 보여 준다.
       */
      cycleSeconds,
      cycleTime: cycleLabel ?? formatCycleTime(cycleSeconds),
    },
    maintenance: {
      lastInspection, nextInspection, operatingHours,
    },
    alert,
  };
}


/*
 * 1공정 · 셀 수입검사
 *
 * 입고한 각형 셀을 전기적 특성과 외관으로 두 번 거른다.
 * 여기서 걸러내지 못한 셀은 모듈에 들어간 뒤에는 되돌릴 수 없다.
 */
const CELL_INSPECTION_CONFIGS = [
  {
    id: "CIN-MA-01", name: "1호 셀 전기특성 검사기",
    status: "running", temperature: 27.4,
    ocv: 3.684, resistance: 0.42, rejectRate: 0.34, perCellSeconds: 2.4,
    product: "CELL-P71", part: "각형 셀",
    completed: 4820, target: 6400,
  },
  {
    id: "CIN-MA-02", name: "2호 셀 전기특성 검사기",
    status: "running", temperature: 28.1,
    ocv: 3.691, resistance: 0.44, rejectRate: 0.41, perCellSeconds: 2.6,
    product: "CELL-P71", part: "각형 셀",
    completed: 4655, target: 6400,
  },
];

const cellInspectors = CELL_INSPECTION_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "cell-inspector",
    typeLabel: "셀 전기특성 검사 설비",
    processStep: "cell-inspection",
    location: `모듈 조립동 · 셀 수입검사 구역 ${index + 1}`,
    description:
      "입고 셀의 개방전압과 내부저항을 측정해 등급별로 선별하는 검사 설비입니다.",
    metrics: [
      { label: "평균 개방전압", value: config.ocv, unit: "V" },
      { label: "내부저항", value: config.resistance, unit: "mΩ", emphasis: config.resistance >= 0.5 },
      { label: "선별 불합격률", value: config.rejectRate, unit: "%", emphasis: config.rejectRate >= 0.6 },
      { label: "셀당 측정", value: config.perCellSeconds, unit: "초" },
    ],
    workOrder: `WO-YC-260922-I${String(index + 1).padStart(2, "0")}`,
    unit: "Cell",
    cycleSeconds: Number(
      (config.perCellSeconds * CELLS_PER_MODULE).toFixed(1),
    ),
    operatingHours: `${(5240 + index * 380).toLocaleString("ko-KR")} h`,
  }),
);

const cellVisionInspector = createEquipment({
  id: "CVS-MA-01",
  name: "셀 외관 비전 검사기",
  type: "vision-inspector",
  typeLabel: "AI 비전 검사 설비",
  processStep: "cell-inspection",
  status: "warning",
  temperature: 41.8,
  location: "모듈 조립동 · 셀 수입검사 구역 3",
  description:
    "셀 캔의 찍힘, 부풀음과 단자 치수를 카메라 영상으로 자동 검사합니다.",
  metrics: [
    { label: "금일 검사", value: "9,475", unit: "Cell" },
    { label: "양품률", value: 99.2, unit: "%" },
    { label: "불량 검출", value: 76, unit: "Cell", emphasis: true },
    { label: "셀당 측정", value: 1.8, unit: "초" },
  ],
  workOrder: "QC-YC-260922-I03",
  product: "CELL-P71",
  target: 12800,
  completed: 9475,
  unit: "Cell",
  cycleSeconds: Number((1.8 * CELLS_PER_MODULE).toFixed(1)),
  lastInspection: "2026-08-30",
  nextInspection: "2026-09-30",
  operatingHours: "4,982 h",
  alert: "조명 유닛 온도가 권장 범위보다 높아 판정 편차가 커질 수 있습니다.",
});


/*
 * 2공정 · 셀 스태킹
 *
 * 셀과 절연 필름을 번갈아 쌓고 규정 압력으로 눌러 스택을 만든다.
 * 가압력이 낮으면 주행 진동에서 셀이 흔들리고,
 * 높으면 셀 캔이 변형된다.
 */
const STACKING_CONFIGS = [
  {
    id: "STK-MA-01", name: "1호 셀 스태킹 셀",
    status: "running", temperature: 31.2,
    cells: 12, pressure: 4.8, alignment: 0.06,
    product: "BM-P12", part: "12셀 스택",
    completed: 386, target: 520,
  },
  {
    id: "STK-MA-02", name: "2호 셀 스태킹 셀",
    status: "running", temperature: 32.6,
    cells: 12, pressure: 4.6, alignment: 0.07,
    product: "BM-P12", part: "12셀 스택",
    completed: 371, target: 520,
  },
  {
    id: "STK-MA-03", name: "3호 셀 스태킹 셀",
    status: "idle", temperature: 24.8,
    cells: 12, pressure: 0, alignment: 0.05,
    product: "BM-P12", part: "12셀 스택",
    completed: 208, target: 520,
    alert: "선행 셀 공급 대기로 적층 작업을 멈추고 있습니다.",
  },
];

const stackingCells = STACKING_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "stacking-cell",
    typeLabel: "셀 스태킹 자동화 설비",
    processStep: "stacking",
    location: `모듈 조립동 · 셀 스태킹 구역 ${index + 1}`,
    description:
      `셀과 절연 필름을 번갈아 적층하고 가압해 ${config.part}을(를) 만드는 설비입니다.`,
    metrics: [
      { label: "적층 셀 수", value: config.cells, unit: "Cell/pc" },
      { label: "가압력", value: config.pressure || "-", unit: config.pressure ? "kN" : "", emphasis: config.pressure > 0 && config.pressure <= 4.2 },
      { label: "적층 정렬 오차", value: config.alignment, unit: "mm", emphasis: config.alignment >= 0.1 },
    ],
    workOrder: `WO-YC-260922-S${String(index + 1).padStart(2, "0")}`,
    cycleSeconds: Number((58.4 + index * 2.1).toFixed(1)),
    cycleLabel: config.status === "idle" ? "대기" : undefined,
    operatingHours: `${(4180 + index * 296).toLocaleString("ko-KR")} h`,
  }),
);


/*
 * 3공정 · 버스바 레이저 용접
 *
 * 셀 탭과 버스바를 레이저로 붙여 직병렬 회로를 만든다.
 * 출력이 흔들리면 용입 깊이가 달라져 접촉 저항이 올라가고,
 * 그 저항이 그대로 주행 중 발열로 이어진다.
 */
const WELDING_CONFIGS = [
  {
    id: "LWD-MA-01", name: "1호 버스바 레이저 용접기",
    status: "running", temperature: 44.6,
    power: 3.2, speed: 128, nitrogen: 18.4, resistance: 0.038,
    product: "BM-P12", part: "12셀 모듈",
    completed: 364, target: 500,
  },
  {
    id: "LWD-MA-02", name: "2호 버스바 레이저 용접기",
    status: "running", temperature: 46.2,
    power: 3.1, speed: 124, nitrogen: 17.8, resistance: 0.041,
    product: "BM-P12", part: "12셀 모듈",
    completed: 352, target: 500,
  },
  {
    id: "LWD-MA-03", name: "3호 버스바 레이저 용접기",
    status: "warning", temperature: 63.4,
    power: 2.7, speed: 118, nitrogen: 12.6, resistance: 0.068,
    product: "BM-P12", part: "12셀 모듈",
    completed: 281, target: 500,
    alert: "레이저 출력이 하한에 근접해 용접부 접촉 저항이 올라가고 있습니다.",
  },
  {
    id: "LWD-MA-04", name: "4호 버스바 레이저 용접기",
    status: "running", temperature: 43.1,
    power: 3.3, speed: 131, nitrogen: 19.1, resistance: 0.036,
    product: "BM-P12", part: "12셀 모듈",
    completed: 378, target: 500,
  },
];

const laserWelders = WELDING_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "laser-welder",
    typeLabel: "버스바 레이저 용접 설비",
    processStep: "laser-welding",
    location: `모듈 조립동 · 레이저 용접 구역 ${index + 1}`,
    description:
      "셀 탭과 버스바를 레이저로 용접해 모듈 내부 직병렬 회로를 연결합니다.",
    metrics: [
      { label: "레이저 출력", value: config.power, unit: "kW", emphasis: config.power <= 2.8 },
      { label: "용접 속도", value: config.speed, unit: "mm/s" },
      { label: "보호가스 유량", value: config.nitrogen, unit: "L/min", emphasis: config.nitrogen <= 14 },
      { label: "접촉 저항", value: config.resistance, unit: "mΩ", emphasis: config.resistance >= 0.06 },
    ],
    workOrder: `WO-YC-260922-W${String(index + 1).padStart(2, "0")}`,
    cycleSeconds: Number((41.6 + index * 1.4).toFixed(1)),
    operatingHours: `${(5620 + index * 418).toLocaleString("ko-KR")} h`,
  }),
);

const weldVisionInspector = createEquipment({
  id: "WVS-MA-01",
  name: "용접부 3D 비전 검사기",
  type: "vision-inspector",
  typeLabel: "AI 비전 검사 설비",
  processStep: "laser-welding",
  status: "running",
  temperature: 39.4,
  location: "모듈 조립동 · 레이저 용접 구역 5",
  description:
    "용접 비드의 형상과 높이를 3D로 측정해 용입 불량과 스패터를 선별합니다.",
  metrics: [
    { label: "검사 포인트", value: 96, unit: "점/pc" },
    { label: "금일 검사", value: "1,375", unit: "EA" },
    { label: "용접 불량 검출", value: 22, unit: "EA", emphasis: true },
  ],
  workOrder: "QC-YC-260922-W05",
  product: "BM-P12",
  target: 2000,
  completed: 1375,
  cycleSeconds: 12.4,
  lastInspection: "2026-09-01",
  nextInspection: "2026-10-01",
  operatingHours: "5,108 h",
});


/*
 * 4공정 · 모듈 EOL 검사
 *
 * 엔드플레이트를 체결한 모듈을 충방전으로 용량을 재고,
 * 절연내압으로 고전압 안전을 확인한다.
 * 여기를 통과한 모듈만 팩 조립동으로 넘어간다.
 */
const MODULE_EOL_CONFIGS = [
  {
    id: "MEL-MA-01", name: "1호 모듈 충방전 시험기",
    status: "running", temperature: 34.8,
    current: 120, capacity: 7.92, deviation: 14,
    product: "BM-P12", part: "12셀 모듈",
    completed: 342, target: 480,
  },
  {
    id: "MEL-MA-02", name: "2호 모듈 충방전 시험기",
    status: "running", temperature: 36.2,
    current: 118, capacity: 7.88, deviation: 17,
    product: "BM-P12", part: "12셀 모듈",
    completed: 336, target: 480,
  },
  {
    id: "MEL-MA-03", name: "3호 모듈 충방전 시험기",
    status: "running", temperature: 35.1,
    current: 121, capacity: 7.94, deviation: 12,
    product: "BM-P12", part: "12셀 모듈",
    completed: 351, target: 480,
  },
  {
    id: "MEL-MA-04", name: "4호 모듈 충방전 시험기",
    status: "stopped", temperature: 23.6,
    current: 0, capacity: 0, deviation: 0,
    product: "BM-P12", part: "12셀 모듈",
    completed: 164, target: 480,
    alert: "충방전 채널 점검을 위해 설비를 정지했습니다.",
  },
];

const moduleEolTesters = MODULE_EOL_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "module-eol-tester",
    typeLabel: "모듈 EOL 충방전 시험 설비",
    processStep: "module-eol",
    location: `모듈 조립동 · 모듈 EOL 구역 ${index + 1}`,
    description:
      "모듈을 충방전해 실용량을 측정하고 셀 간 전압 편차와 온도센서 도통을 확인합니다.",
    metrics: [
      { label: "충방전 전류", value: config.current || "-", unit: config.current ? "A" : "" },
      { label: "측정 용량", value: config.capacity || "-", unit: config.capacity ? "kWh" : "" },
      { label: "셀 전압 편차", value: config.deviation || "-", unit: config.deviation ? "mV" : "", emphasis: config.deviation >= 20 },
    ],
    workOrder: `WO-YC-260922-E${String(index + 1).padStart(2, "0")}`,
    cycleSeconds: 186 + index * 4,
    cycleLabel: config.status === "stopped" ? "정지" : undefined,
    operatingHours: `${(4460 + index * 312).toLocaleString("ko-KR")} h`,
  }),
);

const hipotTester = createEquipment({
  id: "HPT-MA-01",
  name: "모듈 절연내압 시험기",
  type: "hipot-tester",
  typeLabel: "절연내압 시험 설비",
  processStep: "module-eol",
  status: "running",
  temperature: 29.6,
  location: "모듈 조립동 · 모듈 EOL 구역 5",
  description:
    "모듈 고전압 회로와 하우징 사이의 절연저항과 누설전류를 시험합니다.",
  metrics: [
    { label: "시험 전압", value: "1,000", unit: "V DC" },
    { label: "절연저항", value: 842, unit: "MΩ" },
    { label: "누설전류", value: 0.18, unit: "mA" },
  ],
  workOrder: "QC-YC-260922-E05",
  product: "BM-P12",
  target: 1920,
  completed: 1193,
  cycleSeconds: 24.8,
  lastInspection: "2026-09-03",
  nextInspection: "2026-10-03",
  operatingHours: "4,336 h",
});


/*
 * 공정 간 이송
 *
 * 셀검사 → 스태킹 → 용접 → 모듈 EOL 을 잇는 이송 라인이다.
 */
const moduleConveyor = createEquipment({
  id: "CNV-MA-01",
  name: "모듈 조립 공정 이송 컨베이어",
  type: "conveyor",
  typeLabel: "공정 간 이송 설비",
  processStep: "stacking",
  detailCategory: "support",
  status: "running",
  temperature: 37.2,
  location: "모듈 조립동 · 공정 이송 라인",
  description:
    "셀 스택과 모듈을 다음 공정으로 자동 이송하는 공정 간 컨베이어입니다.",
  metrics: [
    { label: "벨트 속도", value: 14.6, unit: "m/min" },
    { label: "적재율", value: 58, unit: "%" },
    { label: "시간당 처리량", value: 84, unit: "EA/h" },
  ],
  workOrder: "TR-YC-260922-MA",
  product: "셀 스택·모듈 이송",
  target: 1920,
  completed: 1204,
  cycleLabel: "연속 운전",
  lastInspection: "2026-08-30",
  nextInspection: "2026-09-30",
  operatingHours: "6,284 h",
});


/*
 * 지원 설비
 *
 * 레이저 용접 흄을 잡는 집진기, 적층 구간의 습도를 낮추는 제습 공조기,
 * 공압 공급 압축기다.
 * detailCategory 를 support 로 두면 상세 패널이 생산 실적 대신
 * 지원 설비용 구성으로 바뀐다.
 */
const supportEquipment = [
  createEquipment({
    id: "FUM-MA-01",
    name: "레이저 용접 흄 집진기",
    type: "dust-collector",
    typeLabel: "공정 집진 설비",
    processStep: "laser-welding",
    detailCategory: "support",
    status: "running",
    temperature: 35.8,
    location: "모듈 조립동 · 집진·공조 지원실",
    description:
      "레이저 용접 중 발생하는 금속 흄과 미세 분진을 포집하는 집진 설비입니다.",
    metrics: [
      { label: "차압", value: 1.34, unit: "kPa" },
      { label: "필터 부하", value: 58, unit: "%" },
      { label: "배출 분진", value: 1.8, unit: "mg/m³" },
    ],
    workOrder: "ENV-YC-260922-01",
    product: "레이저 용접 흄",
    target: 24,
    completed: 18,
    unit: "h",
    cycleLabel: "연속 운전",
    lastInspection: "2026-09-02",
    nextInspection: "2026-10-02",
    operatingHours: "4,812 h",
    alert: "필터와 배출 농도가 정상 범위입니다.",
  }),
  createEquipment({
    id: "DHM-MA-01",
    name: "적층 구역 제습 공조기",
    type: "dehumidifier",
    typeLabel: "항온항습 공조 설비",
    processStep: "stacking",
    detailCategory: "support",
    status: "warning",
    temperature: 26.4,
    location: "모듈 조립동 · 집진·공조 지원실",
    description:
      "셀 적층 구역의 노점과 습도를 관리해 셀 단자 산화를 막는 공조 설비입니다.",
    metrics: [
      { label: "노점", value: -18.6, unit: "°C", emphasis: true },
      { label: "상대습도", value: 14.2, unit: "%", emphasis: true },
      { label: "급기 풍량", value: "12,400", unit: "m³/h" },
    ],
    workOrder: "ENV-YC-260922-02",
    product: "적층 구역 저습 공기",
    target: 24,
    completed: 17,
    unit: "h",
    cycleLabel: "연속 운전",
    lastInspection: "2026-08-14",
    nextInspection: "2026-09-14",
    operatingHours: "5,327 h",
    alert: "제습 로터 성능이 떨어져 노점이 관리 상한을 넘었습니다.",
  }),
  createEquipment({
    id: "COMP-MA-01",
    name: "모듈 조립동 스크류 공기압축기",
    type: "air-compressor",
    typeLabel: "압축공기 공급 설비",
    processStep: "stacking",
    detailCategory: "support",
    status: "running",
    temperature: 71.6,
    location: "모듈 조립동 · 집진·공조 지원실",
    description:
      "스태킹 가압 지그와 이송 그리퍼에 압축공기를 공급하는 설비입니다.",
    metrics: [
      { label: "토출 압력", value: 7.2, unit: "bar" },
      { label: "공급 유량", value: 16.8, unit: "m³/min" },
      { label: "모터 부하", value: 68, unit: "%" },
    ],
    workOrder: "AIR-YC-260922-01",
    product: "7 bar 압축공기",
    target: 24,
    completed: 19,
    unit: "h",
    cycleLabel: "부하·무부하 제어",
    lastInspection: "2026-08-28",
    nextInspection: "2026-09-28",
    operatingHours: "7,146 h",
    alert: "토출 압력과 모터 부하가 정상 범위입니다.",
  }),
];


export const MODULE_ASSEMBLY_EQUIPMENT = [
  ...cellInspectors,
  cellVisionInspector,
  ...stackingCells,
  ...laserWelders,
  weldVisionInspector,
  ...moduleEolTesters,
  hipotTester,
  moduleConveyor,
  ...supportEquipment,
];

const equipmentById = new Map(
  MODULE_ASSEMBLY_EQUIPMENT.map((equipment) => [equipment.id, equipment]),
);

export function getModuleAssemblyEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
