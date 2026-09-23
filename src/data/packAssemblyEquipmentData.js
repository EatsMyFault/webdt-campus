/*
 * 팩 조립동(PA-01) 설비 데이터.
 *
 * 공정 순서대로 늘어놓았다.
 *   트레이·쿨링플레이트 → 모듈 장착·결선 → 실링·기밀검사 → 팩 EOL 시험
 *
 * 사이클 타임은 cycleSeconds 가 원본이고 화면 문구는 거기서 만든다.
 * 이 값으로 packLineBalance.js 가 라인 택트를 계산하므로
 * 숫자를 고치면 컨베이어 속도까지 따라 바뀐다.
 *
 * 같은 type 을 가진 설비는 같은 공정을 나눠 맡는 병렬 뱅크다.
 * 사이클이 긴 공정일수록 대수가 많다.
 *
 * 값은 모두 데모용 더미 데이터다.
 */

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

function createEquipment({
  id, name, type, typeLabel, processStep, status, location,
  description, temperature, metrics, workOrder, product,
  target, completed, unit = "EA", cycleSeconds, cycleLabel,
  lastInspection = "2026-09-02", nextInspection = "2026-10-02",
  operatingHours = "3,840 h", detailCategory,
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
    facilityId: "factory-b",
    facilityLabel: "팩 조립동",
    location,
    description,
    metrics: [
      {
        label: "설비 온도",
        value: temperature,
        unit: "°C",
        emphasis: temperature >= 55,
      },
      ...metrics,
    ],
    temperatureHistory: createTemperatureHistory(temperature),
    production: {
      workOrder,
      product,
      target,
      completed,
      unit,

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
 * 5공정 · 트레이·쿨링플레이트
 *
 * 팩 트레이를 세정하고 쿨링플레이트를 얹은 뒤 열전도 접착제를 깐다.
 * 접착제 비드가 끊기면 그 자리 모듈만 냉각이 되지 않아
 * 주행 중 온도 편차로 나타난다.
 */
const trayWasher = createEquipment({
  id: "TRY-PA-01",
  name: "팩 트레이 세정·검사기",
  type: "tray-washer",
  typeLabel: "트레이 세정 설비",
  processStep: "tray-cooling",
  status: "running",
  temperature: 42.6,
  location: "팩 조립동 · 트레이 투입 구역 1",
  description:
    "팩 트레이의 가공 이물을 세정하고 실링면 평탄도를 측정하는 설비입니다.",
  metrics: [
    { label: "세정 압력", value: 82, unit: "bar" },
    { label: "잔류 이물", value: 3, unit: "개/pc" },
    { label: "실링면 평탄도", value: 0.12, unit: "mm" },
  ],
  workOrder: "WO-YC-260922-T01",
  product: "BP-400-60",
  target: 480,
  completed: 342,
  cycleSeconds: 52.4,
  operatingHours: "4,286 h",
});

const TIM_CONFIGS = [
  {
    id: "TIM-PA-01", name: "1호 열전도 접착제 디스펜서",
    status: "running", temperature: 38.4,
    output: 412, width: 18.6, breaks: 0,
    product: "BP-400-60",
    completed: 336, target: 480, cycleSeconds: 46.8,
  },
  {
    id: "TIM-PA-02", name: "2호 열전도 접착제 디스펜서",
    status: "warning", temperature: 51.8,
    output: 368, width: 15.2, breaks: 4,
    product: "BP-800-95",
    completed: 254, target: 400, cycleSeconds: 49.0,
    alert: "토출량이 하한에 근접하고 비드 끊김이 반복되고 있습니다.",
  },
];

const timDispensers = TIM_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "tim-dispenser",
    typeLabel: "열전도 접착제 도포 설비",
    processStep: "tray-cooling",
    location: `팩 조립동 · 트레이 투입 구역 ${index + 2}`,
    description:
      "쿨링플레이트와 모듈 사이에 열전도 접착제를 정량 도포하는 설비입니다.",
    metrics: [
      { label: "토출량", value: config.output, unit: "g/pc", emphasis: config.output <= 380 },
      { label: "비드 폭", value: config.width, unit: "mm", emphasis: config.width <= 16 },
      { label: "비드 끊김", value: config.breaks, unit: "회", emphasis: config.breaks > 0 },
    ],
    workOrder: `WO-YC-260922-T${String(index + 2).padStart(2, "0")}`,
    operatingHours: `${(3960 + index * 288).toLocaleString("ko-KR")} h`,
  }),
);


/*
 * 6공정 · 모듈 장착·결선
 *
 * 모듈 한 개가 30kg을 넘어 로봇으로 안착한다.
 * 고전압 버스바는 체결 토크가 규정을 벗어나면
 * 접촉 저항이 올라가 그 지점이 발열점이 된다.
 */
const MOUNTING_CONFIGS = [
  {
    id: "MMT-PA-01", name: "1호 모듈 장착 로봇",
    status: "running", temperature: 43.2,
    load: 72, payload: 38.4, repeatability: 0.04,
    product: "BP-400-60",
    completed: 338, target: 480, cycleSeconds: 64.2,
  },
  {
    id: "MMT-PA-02", name: "2호 모듈 장착 로봇",
    status: "running", temperature: 44.8,
    load: 76, payload: 38.4, repeatability: 0.05,
    product: "BP-400-60",
    completed: 331, target: 480, cycleSeconds: 66.0,
  },
  {
    id: "MMT-PA-03", name: "3호 모듈 장착 로봇",
    status: "warning", temperature: 61.4,
    load: 93, payload: 41.2, repeatability: 0.09,
    product: "BP-800-95",
    completed: 248, target: 400, cycleSeconds: 67.8,
    alert: "3축 서보 모터 온도가 주의 기준을 넘어 반복 정밀도가 흔들립니다.",
  },
  {
    id: "MMT-PA-04", name: "4호 모듈 장착 로봇",
    status: "running", temperature: 42.1,
    load: 69, payload: 37.8, repeatability: 0.03,
    product: "BP-PHEV-18",
    completed: 286, target: 360, cycleSeconds: 69.6,
  },
];

const mountingRobots = MOUNTING_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "mounting-robot",
    typeLabel: "모듈 장착 6축 로봇",
    processStep: "module-mounting",
    location: `팩 조립동 · 모듈 장착 구역 ${index + 1}`,
    description:
      "모듈을 집어 트레이의 지정 위치에 안착하고 체결 위치를 정렬하는 로봇입니다.",
    metrics: [
      { label: "로봇 부하", value: config.load, unit: "%", emphasis: config.load >= 90 },
      { label: "취급 중량", value: config.payload, unit: "kg" },
      { label: "반복 정밀도", value: config.repeatability, unit: "mm", emphasis: config.repeatability >= 0.08 },
    ],
    workOrder: `WO-YC-260922-M${String(index + 1).padStart(2, "0")}`,
    operatingHours: `${(4520 + index * 364).toLocaleString("ko-KR")} h`,
  }),
);

const HV_TORQUE_CONFIGS = [
  {
    id: "HVT-PA-01", name: "1호 고전압 버스바 체결기",
    status: "running", temperature: 36.8,
    torque: 12.4, passRate: 99.6, points: 48,
    product: "BP-400-60",
    completed: 334, target: 480, cycleSeconds: 72.6,
  },
  {
    id: "HVT-PA-02", name: "2호 고전압 버스바 체결기",
    status: "running", temperature: 37.6,
    torque: 12.1, passRate: 99.2, points: 56,
    product: "BP-800-95",
    completed: 251, target: 400, cycleSeconds: 76.0,
  },
];

const hvTorqueStations = HV_TORQUE_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "torque-station",
    typeLabel: "고전압 체결 토크 관리 설비",
    processStep: "module-mounting",
    location: `팩 조립동 · 고전압 결선 구역 ${index + 1}`,
    description:
      "모듈 사이 고전압 버스바를 규정 토크로 체결하고 체결값을 전수 기록합니다.",
    metrics: [
      { label: "체결 토크", value: config.torque, unit: "N·m" },
      { label: "토크 합격률", value: config.passRate, unit: "%", emphasis: config.passRate <= 99 },
      { label: "체결 점수", value: config.points, unit: "점/pc" },
    ],
    workOrder: `WO-YC-260922-H${String(index + 1).padStart(2, "0")}`,
    operatingHours: `${(4180 + index * 302).toLocaleString("ko-KR")} h`,
  }),
);

/*
 * BMS·BDU 장착은 펌웨어를 굽고 통신까지 확인해야 해서
 * 한 대로는 1분 택트를 못 맞춘다. 두 대를 나란히 둔다.
 */
const BMS_CONFIGS = [
  {
    id: "BMS-PA-01", name: "1호 BMS·BDU 장착 스테이션",
    status: "running", temperature: 34.2,
    response: 18, flashRate: 99.8, sensors: "96/96",
    product: "BP-400-60",
    completed: 329, target: 480, cycleSeconds: 88.4,
  },
  {
    id: "BMS-PA-02", name: "2호 BMS·BDU 장착 스테이션",
    status: "running", temperature: 35.0,
    response: 21, flashRate: 99.6, sensors: "96/96",
    product: "BP-800-95",
    completed: 247, target: 400, cycleSeconds: 86.2,
  },
];

const bmsStations = BMS_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "bms-station",
    typeLabel: "제어모듈 장착·검사 설비",
    processStep: "module-mounting",
    location: `팩 조립동 · 고전압 결선 구역 ${index + 3}`,
    description:
      "BMS와 배터리 분배 유닛을 장착하고 펌웨어를 기록한 뒤 통신을 확인합니다.",
    metrics: [
      { label: "통신 응답", value: config.response, unit: "ms" },
      { label: "펌웨어 기록 성공률", value: config.flashRate, unit: "%" },
      { label: "센서 인식", value: config.sensors, unit: "점" },
    ],
    workOrder: `WO-YC-260922-H${String(index + 3).padStart(2, "0")}`,
    operatingHours: `${(3924 + index * 286).toLocaleString("ko-KR")} h`,
  }),
);


/*
 * 7공정 · 실링·기밀검사
 *
 * 커버를 실런트로 붙여 닫고 냉각수를 채운 뒤 기밀을 본다.
 * 팩은 IP67을 만족해야 해서 이 구간의 누설률이 곧 합격 여부다.
 */
const SEALING_CONFIGS = [
  {
    id: "SEL-PA-01", name: "1호 커버 실런트 도포 로봇",
    status: "running", temperature: 39.8,
    output: 268, width: 8.4, speed: 142,
    product: "BP-400-60",
    completed: 326, target: 480, cycleSeconds: 96.4,
  },
  {
    id: "SEL-PA-02", name: "2호 커버 실런트 도포 로봇",
    status: "running", temperature: 40.6,
    output: 274, width: 8.6, speed: 138,
    product: "BP-800-95",
    completed: 246, target: 400, cycleSeconds: 99.0,
  },
];

const sealingRobots = SEALING_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "sealing-robot",
    typeLabel: "커버 실링 도포 설비",
    processStep: "sealing-leak",
    location: `팩 조립동 · 실링 구역 ${index + 1}`,
    description:
      "팩 커버 접합면을 따라 실런트를 끊김 없이 도포하고 볼팅 위치를 잡습니다.",
    metrics: [
      { label: "토출량", value: config.output, unit: "g/pc" },
      { label: "비드 폭", value: config.width, unit: "mm", emphasis: config.width <= 7.5 },
      { label: "도포 속도", value: config.speed, unit: "mm/s" },
    ],
    workOrder: `WO-YC-260922-L${String(index + 1).padStart(2, "0")}`,
    operatingHours: `${(3860 + index * 274).toLocaleString("ko-KR")} h`,
  }),
);

/*
 * 냉각수 주입은 진공을 잡고 채우느라 2분이 넘게 걸린다.
 * 한 대만 두면 이 설비 하나가 라인 전체를 잡아먹어 세 대로 나눈다.
 */
const COOLANT_CONFIGS = [
  {
    id: "CLF-PA-01", name: "1호 냉각수 진공 주입기",
    status: "running", temperature: 33.4,
    vacuum: 4.2, volume: 5.8, bubble: 0.4,
    product: "BP-400-60",
    completed: 318, target: 480, cycleSeconds: 124.6,
  },
  {
    id: "CLF-PA-02", name: "2호 냉각수 진공 주입기",
    status: "running", temperature: 34.1,
    vacuum: 4.4, volume: 5.8, bubble: 0.5,
    product: "BP-800-95",
    completed: 241, target: 400, cycleSeconds: 121.8,
  },
  {
    id: "CLF-PA-03", name: "3호 냉각수 진공 주입기",
    status: "running", temperature: 32.8,
    vacuum: 4.0, volume: 5.9, bubble: 0.3,
    product: "BP-PHEV-18",
    completed: 268, target: 360, cycleSeconds: 118.4,
  },
];

const coolantFillers = COOLANT_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "coolant-filler",
    typeLabel: "냉각수 충전 설비",
    processStep: "sealing-leak",
    location: `팩 조립동 · 실링 구역 ${index + 3}`,
    description:
      "냉각 회로를 진공으로 비운 뒤 규정량의 냉각수를 채우고 잔류 기포를 확인합니다.",
    metrics: [
      { label: "진공도", value: config.vacuum, unit: "mbar" },
      { label: "주입량", value: config.volume, unit: "L/pc" },
      { label: "잔류 기포", value: config.bubble, unit: "%" },
    ],
    workOrder: `WO-YC-260922-L${String(index + 3).padStart(2, "0")}`,
    operatingHours: `${(3742 + index * 254).toLocaleString("ko-KR")} h`,
  }),
);

const LEAK_CONFIGS = [
  {
    id: "LEK-PA-01", name: "1호 팩 기밀 누설 시험기",
    status: "running", temperature: 31.6,
    leakRate: 0.42, pressure: 30, judgeTime: 96,
    product: "BP-400-60",
    completed: 314, target: 480, cycleSeconds: 114.0,
  },
  {
    id: "LEK-PA-02", name: "2호 팩 기밀 누설 시험기",
    status: "warning", temperature: 32.8,
    leakRate: 1.18, pressure: 30, judgeTime: 104,
    product: "BP-800-95",
    completed: 238, target: 400, cycleSeconds: 122.0,
    alert: "누설률이 판정 기준에 근접해 연속 재시험이 발생하고 있습니다.",
  },
  {
    id: "LEK-PA-03", name: "3호 팩 기밀 누설 시험기",
    status: "running", temperature: 30.9,
    leakRate: 0.38, pressure: 30, judgeTime: 92,
    product: "BP-PHEV-18",
    completed: 272, target: 360, cycleSeconds: 110.0,
  },
];

const leakTesters = LEAK_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "leak-tester",
    typeLabel: "팩 기밀 누설 시험 설비",
    processStep: "sealing-leak",
    location: `팩 조립동 · 기밀검사 구역 ${index + 1}`,
    description:
      "팩 내부를 가압해 누설률을 측정하고 IP67 방수 기준 만족 여부를 판정합니다.",
    metrics: [
      { label: "누설률", value: config.leakRate, unit: "cc/min", emphasis: config.leakRate >= 1.0 },
      { label: "시험 압력", value: config.pressure, unit: "kPa" },
      { label: "판정 시간", value: config.judgeTime, unit: "초" },
    ],
    workOrder: `WO-YC-260922-K${String(index + 1).padStart(2, "0")}`,
    operatingHours: `${(3680 + index * 246).toLocaleString("ko-KR")} h`,
  }),
);


/*
 * 8공정 · 팩 EOL 시험
 *
 * 완성 팩을 충방전해 실성능을 보고, 절연과 통신까지 확인한 뒤
 * 출하 SOC로 맞춰 각인한다. 여기를 통과해야 물류센터로 넘어간다.
 *
 * 충방전 한 번에 4분 30초가 넘어 라인에서 가장 느린 공정이다.
 * 다섯 대를 병렬로 돌려야 1분 택트 안으로 들어온다.
 */
const PACK_EOL_CONFIGS = [
  {
    id: "PEL-PA-01", name: "1호 팩 EOL 충방전 시험기",
    status: "running", temperature: 38.6,
    current: 240, voltage: 398, soc: 32, capacity: 59.4,
    product: "BP-400-60",
    completed: 308, target: 480, cycleSeconds: 268,
  },
  {
    id: "PEL-PA-02", name: "2호 팩 EOL 충방전 시험기",
    status: "running", temperature: 40.2,
    current: 236, voltage: 401, soc: 31, capacity: 59.8,
    product: "BP-400-60",
    completed: 296, target: 480, cycleSeconds: 274,
  },
  {
    id: "PEL-PA-03", name: "3호 팩 EOL 충방전 시험기",
    status: "running", temperature: 41.8,
    current: 268, voltage: 792, soc: 30, capacity: 94.2,
    product: "BP-800-95",
    completed: 232, target: 400, cycleSeconds: 280,
  },
  {
    id: "PEL-PA-04", name: "4호 팩 EOL 충방전 시험기",
    status: "idle", temperature: 26.4,
    current: 0, voltage: 0, soc: 0, capacity: 0,
    product: "BP-PHEV-18",
    completed: 254, target: 360, cycleSeconds: 276,
    cycleLabel: "대기",
    alert: "선행 기밀검사 재시험으로 투입 대기 중입니다.",
  },
  {
    id: "PEL-PA-05", name: "5호 팩 EOL 충방전 시험기",
    status: "running", temperature: 39.4,
    current: 242, voltage: 399, soc: 32, capacity: 59.6,
    product: "BP-400-60",
    completed: 301, target: 480, cycleSeconds: 272,
  },
];

const packEolTesters = PACK_EOL_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "pack-eol-tester",
    typeLabel: "팩 EOL 충방전 시험 설비",
    processStep: "pack-eol",
    location: `팩 조립동 · 팩 EOL 구역 ${index + 1}`,
    description:
      "완성 팩을 충방전해 실용량과 출력을 검증하고 출하 SOC로 조정합니다.",
    metrics: [
      { label: "충방전 전류", value: config.current || "-", unit: config.current ? "A" : "" },
      { label: "팩 전압", value: config.voltage || "-", unit: config.voltage ? "V" : "" },
      { label: "측정 용량", value: config.capacity || "-", unit: config.capacity ? "kWh" : "" },
      { label: "출하 SOC", value: config.soc || "-", unit: config.soc ? "%" : "" },
    ],
    workOrder: `WO-YC-260922-P${String(index + 1).padStart(2, "0")}`,
    operatingHours: `${(4060 + index * 318).toLocaleString("ko-KR")} h`,
  }),
);

const packInsulationTester = createEquipment({
  id: "INS-PA-01",
  name: "팩 절연·고전압 안전 시험기",
  type: "hipot-tester",
  typeLabel: "절연내압 시험 설비",
  processStep: "pack-eol",
  status: "running",
  temperature: 29.8,
  location: "팩 조립동 · 팩 EOL 구역 6",
  description:
    "팩 고전압 회로와 케이스 사이의 절연저항, 누설전류와 접지 연속성을 시험합니다.",
  metrics: [
    { label: "시험 전압", value: "2,000", unit: "V DC" },
    { label: "절연저항", value: 964, unit: "MΩ" },
    { label: "누설전류", value: 0.22, unit: "mA" },
  ],
  workOrder: "QC-YC-260922-P06",
  product: "BP-400-60",
  target: 1720,
  completed: 1090,
  cycleSeconds: 42.8,
  operatingHours: "3,986 h",
});

const packMarking = createEquipment({
  id: "MRK-PA-01",
  name: "팩 레이저 각인·최종 비전 검사기",
  type: "vision-inspector",
  typeLabel: "AI 비전 검사 설비",
  processStep: "pack-eol",
  status: "warning",
  temperature: 56.4,
  location: "팩 조립동 · 출하 검사 구역",
  description:
    "완성 팩에 이력 추적 코드를 각인하고 외관과 부품 누락을 최종 검사합니다.",
  metrics: [
    { label: "금일 검사", value: "1,058", unit: "EA" },
    { label: "양품률", value: 98.6, unit: "%" },
    { label: "불량 검출", value: 15, unit: "EA", emphasis: true },
  ],
  workOrder: "QC-YC-260922-P07",
  product: "완성 팩 최종검사",
  target: 1720,
  completed: 1058,
  cycleSeconds: 18.4,
  nextInspection: "2026-09-16",
  operatingHours: "4,218 h",
  alert: "각인 헤드 하우징 온도가 권장 범위보다 높습니다.",
});


/*
 * 공정 간 이송과 구내 물류.
 *
 * 이 둘은 공정 스테이션이 아니라 라인을 받쳐 주는 설비라
 * 택트 계산에서 빠진다. 그래서 cycleSeconds 를 두지 않는다.
 */
const packConveyor = createEquipment({
  id: "CNV-PA-01",
  name: "팩 조립 공정 이송 컨베이어",
  type: "conveyor",
  typeLabel: "공정 간 이송 설비",
  processStep: "module-mounting",
  detailCategory: "support",
  status: "running",
  temperature: 36.4,
  location: "팩 조립동 · ㄷ자 이송 라인",
  description:
    "트레이와 완성 팩을 스테이션 순서대로 실어 나르는 ㄷ자 이송 컨베이어입니다.",
  metrics: [
    { label: "벨트 속도", value: 11.8, unit: "m/min" },
    { label: "적재율", value: 62, unit: "%" },
    { label: "시간당 처리량", value: 58, unit: "EA/h" },
  ],
  workOrder: "TR-YC-260922-PA",
  product: "트레이·완성 팩 이송",
  target: 1720,
  completed: 1082,
  cycleLabel: "연속 운전",
  lastInspection: "2026-08-30",
  nextInspection: "2026-09-30",
  operatingHours: "5,842 h",
});

const AGV_CONFIGS = [
  {
    id: "AGV-PA-01", name: "팩 조립동 운반 AGV 1호",
    status: "running", temperature: 36.7,
    battery: 78, speed: 1.2, missions: 64,
    cycleLabel: "6분 18초",
  },
  {
    id: "AGV-PA-02", name: "팩 조립동 운반 AGV 2호",
    status: "idle", temperature: 29.8,
    battery: 34, speed: 0, missions: 51,
    cycleLabel: "충전 대기",
    alert: "충전 스테이션 이동 명령을 대기 중입니다.",
  },
];

const agvs = AGV_CONFIGS.map((config, index) =>
  createEquipment({
    ...config,
    type: "agv",
    typeLabel: "자율주행 운반차",
    processStep: "module-mounting",
    detailCategory: "support",
    location: `팩 조립동 · AGV 물류 레인 ${index + 1}`,
    description:
      "모듈 대차와 완성 팩을 공정 구역 사이에서 자율 운반하는 AGV입니다.",
    metrics: [
      { label: "배터리", value: config.battery, unit: "%", emphasis: config.battery <= 35 },
      { label: "주행 속도", value: config.speed, unit: "m/s" },
      { label: "완료 미션", value: config.missions, unit: "회" },
    ],
    workOrder: `AGV-YC-260922-0${index + 1}`,
    product: "모듈·완성 팩 운반",
    target: 90,
    completed: config.missions,
    unit: "Mission",
    lastInspection: "2026-09-06",
    nextInspection: "2026-09-20",
  }),
);


export const PACK_ASSEMBLY_EQUIPMENT = [
  trayWasher,
  ...timDispensers,
  ...mountingRobots,
  ...hvTorqueStations,
  ...bmsStations,
  ...sealingRobots,
  ...coolantFillers,
  ...leakTesters,
  ...packEolTesters,
  packInsulationTester,
  packMarking,
  packConveyor,
  ...agvs,
];

const equipmentById = new Map(
  PACK_ASSEMBLY_EQUIPMENT.map((equipment) => [equipment.id, equipment]),
);

export function getPackAssemblyEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
