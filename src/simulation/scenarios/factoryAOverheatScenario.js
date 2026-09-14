const TARGET_EQUIPMENT_ID = "CNC-A-01";

function setMetric(equipment, label, value, emphasis = false) {
  const metric = equipment.metrics.find((item) => item.label === label);

  if (!metric) {
    throw new Error(`${equipment.id}에서 지표를 찾을 수 없습니다: ${label}`);
  }

  metric.value = value;
  metric.emphasis = emphasis;
}

function addTemperaturePoint(equipment, time, value) {
  equipment.temperatureHistory = [
    ...(equipment.temperatureHistory ?? []).slice(-11),
    { time, value },
  ];
}

function updateCnc({
  status,
  temperature,
  load,
  rpm,
  vibration,
  alert,
  time,
}) {
  return (equipment) => {
    equipment.status = status;
    equipment.alert = alert;

    setMetric(equipment, "주축 온도", temperature, temperature >= 60);
    setMetric(equipment, "주축 부하", load, load >= 85);
    setMetric(
      equipment,
      "회전 속도",
      rpm.toLocaleString("ko-KR"),
    );
    setMetric(equipment, "진동", vibration, vibration >= 3);
    addTemperaturePoint(equipment, time, temperature);

    return equipment;
  };
}

export const FACTORY_A_OVERHEAT_SCENARIO = Object.freeze({
  id: "factory-a-cnc-overheat",
  title: "A동 CNC 과열 대응",
  targetEquipmentId: TARGET_EQUIPMENT_ID,
  duration: 19,
  steps: [
    {
      at: 0,
      stage: "정상 가동 확인",
      tone: "normal",
      message: "1호 CNC 선반이 정상 가동 중입니다.",
      focusViewId: "factory-a-interior",
    },
    {
      at: 4,
      stage: "과열 경고 발생",
      tone: "warning",
      message: "주축 온도와 진동이 경고 기준을 초과했습니다.",
      openDetail: true,
      apply({ store }) {
        store.updateEquipment(
          TARGET_EQUIPMENT_ID,
          updateCnc({
            status: "warning",
            temperature: 72.4,
            load: 96,
            rpm: 2380,
            vibration: 4.8,
            alert: "주축 과열 및 진동 이상이 감지되었습니다. 정지 점검이 필요합니다.",
            time: "+04초",
          }),
        );
      },
    },
    {
      at: 9,
      stage: "설비 안전 정지",
      tone: "danger",
      message: "보호 로직이 설비를 안전 정지했습니다.",
      apply({ store }) {
        store.updateEquipment(
          TARGET_EQUIPMENT_ID,
          updateCnc({
            status: "stopped",
            temperature: 79.8,
            load: 0,
            rpm: 0,
            vibration: 0.3,
            alert: "과열 보호 정지 상태입니다. 냉각 및 주축 점검을 진행하고 있습니다.",
            time: "+09초",
          }),
        );
      },
    },
    {
      at: 14,
      stage: "냉각 및 복구 점검",
      tone: "recovery",
      message: "온도가 안정되어 재가동 대기 상태로 전환했습니다.",
      apply({ store }) {
        store.updateEquipment(
          TARGET_EQUIPMENT_ID,
          updateCnc({
            status: "idle",
            temperature: 56.2,
            load: 0,
            rpm: 0,
            vibration: 0.2,
            alert: "냉각 완료 후 재가동 승인 대기 중입니다.",
            time: "+14초",
          }),
        );
      },
    },
    {
      at: 19,
      stage: "정상 운전 복귀",
      tone: "normal",
      message: "점검을 완료하고 정상 운전으로 복귀했습니다.",
      apply({ store }) {
        store.updateEquipment(
          TARGET_EQUIPMENT_ID,
          updateCnc({
            status: "running",
            temperature: 45.1,
            load: 68,
            rpm: 1920,
            vibration: 1.1,
            alert: "복구 점검을 완료했습니다. 현재 정상 가동 중입니다.",
            time: "+19초",
          }),
        );
      },
    },
  ],
});
