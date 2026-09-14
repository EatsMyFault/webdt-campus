const TEMPERATURE_OFFSETS = [
  -1.2, -0.8, -0.4, 0.1, 0.5, 0.8,
  0.4, 1.1, 0.7, 0.3, -0.2, 0,
];

function createTemperatureHistory(baseTemperature) {
  return TEMPERATURE_OFFSETS.map((offset, index) => ({
    time: `${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
    value: Number((baseTemperature + offset).toFixed(1)),
  }));
}

function createUtilityEquipment({
  id,
  name,
  type,
  typeLabel,
  status,
  location,
  description,
  temperature,
  metrics,
  workOrder,
  product,
  target,
  completed,
  unit,
  cycleTime = "연속 운전",
  lastInspection = "2026-09-04",
  nextInspection = "2026-10-04",
  operatingHours = "4,320 h",
  alert = "현재 감지된 이상이 없습니다.",
}) {
  return {
    id,
    name,
    type,
    typeLabel,
    status,
    facilityId: "utility",
    facilityLabel: "유틸리티 센터",
    location,
    description,
    metrics: [
      {
        label: "설비 온도",
        value: temperature,
        unit: "°C",
        emphasis: temperature >= 70,
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
      cycleTime,
    },
    maintenance: {
      lastInspection,
      nextInspection,
      operatingHours,
    },
    alert,
  };
}

const storageTanks = [
  createUtilityEquipment({
    id: "TANK-UT-01",
    name: "공정용수 저장 탱크",
    type: "storage-tank",
    typeLabel: "공정용수 저장 설비",
    status: "running",
    location: "유틸리티 센터 · 옥외 탱크 구역 1",
    description: "생산동으로 공급되는 공정용수를 저장하고 수위와 공급 압력을 일정하게 유지합니다.",
    temperature: 23.8,
    metrics: [
      { label: "저장 수위", value: 72.4, unit: "%" },
      { label: "공급 압력", value: 3.8, unit: "bar" },
      { label: "유입 유량", value: 42.6, unit: "m³/h" },
    ],
    workOrder: "UT-WATER-260910",
    product: "공정용수 공급",
    target: 960,
    completed: 684,
    unit: "m³",
    operatingHours: "8,420 h",
  }),
  createUtilityEquipment({
    id: "TANK-UT-02",
    name: "압축공기 저장 탱크",
    type: "storage-tank",
    typeLabel: "압축공기 리시버 탱크",
    status: "warning",
    location: "유틸리티 센터 · 옥외 탱크 구역 2",
    description: "압축공기의 압력 변동을 완화하고 생산 설비에 안정적인 공압을 공급합니다.",
    temperature: 34.6,
    metrics: [
      { label: "탱크 압력", value: 6.1, unit: "bar", emphasis: true },
      { label: "노점 온도", value: 5.8, unit: "°C", emphasis: true },
      { label: "공급 유량", value: 86.4, unit: "Nm³/min" },
    ],
    workOrder: "UT-AIR-260910",
    product: "압축공기 공급",
    target: 18000,
    completed: 12840,
    unit: "Nm³",
    operatingHours: "7,936 h",
    nextInspection: "2026-09-17",
    alert: "탱크 압력이 관리 하한에 근접했습니다. 압축기와 드레인 상태를 확인하세요.",
  }),
  createUtilityEquipment({
    id: "TANK-UT-03",
    name: "축열수 저장 탱크",
    type: "storage-tank",
    typeLabel: "냉·온수 버퍼 탱크",
    status: "running",
    location: "유틸리티 센터 · 옥외 탱크 구역 3",
    description: "냉각 계통의 축열수를 저장해 부하 변화 시 공급 온도와 유량을 안정화합니다.",
    temperature: 58.4,
    metrics: [
      { label: "저장 수위", value: 81.2, unit: "%" },
      { label: "공급·환수 온도차", value: 7.6, unit: "°C" },
      { label: "순환 유량", value: 118.5, unit: "m³/h" },
    ],
    workOrder: "UT-THERMAL-260910",
    product: "축열 에너지 공급",
    target: 7200,
    completed: 5240,
    unit: "kWhₜₕ",
    operatingHours: "6,781 h",
  }),
];

const chillers = [
  createUtilityEquipment({
    id: "CHILLER-UT-01",
    name: "공정 냉각기 1호",
    type: "chiller",
    typeLabel: "수냉식 공정 냉각기",
    status: "running",
    location: "유틸리티 센터 · 냉각기 야드 1",
    description: "생산 설비의 공정열을 제거하기 위한 냉수를 생산하고 순환 계통에 공급합니다.",
    temperature: 38.2,
    metrics: [
      { label: "냉수 공급 온도", value: 7.1, unit: "°C" },
      { label: "냉수 환수 온도", value: 13.8, unit: "°C" },
      { label: "압축기 부하", value: 68, unit: "%" },
      { label: "COP", value: 4.7, unit: "" },
    ],
    workOrder: "UT-CHILLER-01-260910",
    product: "공정 냉수 생산",
    target: 2600,
    completed: 1840,
    unit: "RT·h",
    operatingHours: "9,106 h",
  }),
  createUtilityEquipment({
    id: "CHILLER-UT-02",
    name: "공정 냉각기 2호",
    type: "chiller",
    typeLabel: "수냉식 공정 냉각기",
    status: "warning",
    location: "유틸리티 센터 · 냉각기 야드 2",
    description: "부하 분산 운전 중인 보조 냉각기로, 냉수 공급 온도와 압축기 상태를 감시합니다.",
    temperature: 51.7,
    metrics: [
      { label: "냉수 공급 온도", value: 9.8, unit: "°C", emphasis: true },
      { label: "냉수 환수 온도", value: 16.9, unit: "°C" },
      { label: "압축기 부하", value: 91, unit: "%", emphasis: true },
      { label: "COP", value: 3.4, unit: "", emphasis: true },
    ],
    workOrder: "UT-CHILLER-02-260910",
    product: "공정 냉수 생산",
    target: 2600,
    completed: 1605,
    unit: "RT·h",
    operatingHours: "8,744 h",
    nextInspection: "2026-09-14",
    alert: "냉수 공급 온도와 압축기 부하가 주의 기준을 초과했습니다.",
  }),
];

const transformers = [
  createUtilityEquipment({
    id: "TR-UT-01",
    name: "수전 변압기 1호",
    type: "transformer",
    typeLabel: "산업용 배전 변압기",
    status: "running",
    location: "유틸리티 센터 · 전기 야드 1",
    description: "수전 전압을 생산 설비용 전압으로 변환해 A동과 공용 설비에 전력을 공급합니다.",
    temperature: 64.2,
    metrics: [
      { label: "부하율", value: 73.6, unit: "%" },
      { label: "1차 전압", value: 22.9, unit: "kV" },
      { label: "2차 전압", value: 381, unit: "V" },
      { label: "역률", value: 0.96, unit: "" },
    ],
    workOrder: "UT-POWER-01-260910",
    product: "A동 및 공용 전력 공급",
    target: 9000,
    completed: 6840,
    unit: "kWh",
    operatingHours: "12,486 h",
  }),
  createUtilityEquipment({
    id: "TR-UT-02",
    name: "수전 변압기 2호",
    type: "transformer",
    typeLabel: "산업용 배전 변압기",
    status: "warning",
    location: "유틸리티 센터 · 전기 야드 2",
    description: "B동과 냉각 설비에 전력을 공급하며 권선 온도, 부하율과 출력 전압을 감시합니다.",
    temperature: 78.6,
    metrics: [
      { label: "부하율", value: 92.1, unit: "%", emphasis: true },
      { label: "1차 전압", value: 22.8, unit: "kV" },
      { label: "2차 전압", value: 379, unit: "V" },
      { label: "역률", value: 0.91, unit: "", emphasis: true },
    ],
    workOrder: "UT-POWER-02-260910",
    product: "B동 및 냉각 설비 전력 공급",
    target: 9000,
    completed: 7425,
    unit: "kWh",
    operatingHours: "11,908 h",
    lastInspection: "2026-08-29",
    nextInspection: "2026-09-13",
    alert: "권선 온도와 부하율이 주의 기준을 초과했습니다. 부하 분산을 검토하세요.",
  }),
];

export const UTILITY_EQUIPMENT = [
  ...storageTanks,
  ...chillers,
  ...transformers,
];

const equipmentById = new Map(
  UTILITY_EQUIPMENT.map((equipment) => [equipment.id, equipment]),
);

export function getUtilityEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}
