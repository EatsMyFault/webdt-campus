import { renderUtilityEquipmentDetail } from "./utilityEquipmentDetail.js";
import { renderLogisticsEquipmentDetail } from "./logisticsEquipmentDetail.js";

const STATUS_VIEW = {
  running: { label: "정상 가동", tone: "normal" },
  warning: { label: "경고", tone: "warning" },
  idle: { label: "대기", tone: "idle" },
  stopped: { label: "정지", tone: "stopped" },
};

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) element.textContent = value;
}

function createSparklinePoints(history) {
  if (!history.length) return "";

  const values = history.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  return history.map((item, index) => {
    const x = history.length === 1 ? 0 : (index / (history.length - 1)) * 100;
    const y = 34 - ((item.value - min) / range) * 27;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function restoreFactoryLabels(root, equipment) {
  const isSupportEquipment =
    equipment?.detailCategory === "support";

  root.dataset.detailMode = "factory";
  delete root.dataset.equipmentType;

  setText(
    root,
    ".equipment-sensor-section .equipment-section-title span",
    "LIVE SENSOR",
  );
  setText(
    root,
    ".equipment-sensor-section .equipment-section-title h3",
    isSupportEquipment
      ? "환경·공압 운전 지표"
      : "현재 운전 지표",
  );
  setText(
    root,
    ".equipment-chart-section .equipment-section-title span",
    "TREND",
  );
  setText(
    root,
    ".equipment-chart-section .equipment-section-title h3",
    isSupportEquipment
      ? "최근 설비 온도 추이"
      : "최근 온도 추이",
  );
  setText(
    root,
    ".equipment-production-section .equipment-section-title span",
    isSupportEquipment ? "OPERATION" : "PRODUCTION",
  );
  setText(
    root,
    ".equipment-production-section .equipment-section-title h3",
    isSupportEquipment
      ? "금일 운전 현황"
      : "금일 생산 현황",
  );
  setText(
    root,
    ".equipment-maintenance-section .equipment-section-title span",
    "MAINTENANCE",
  );
  setText(
    root,
    ".equipment-maintenance-section .equipment-section-title h3",
    "보전 정보",
  );

  const productionLabels = [
    ...root.querySelectorAll(
      ".equipment-production-grid dt",
    ),
  ];
  const labelTexts = isSupportEquipment
    ? ["운전지시", "처리 대상", "가동시간", "운전 방식"]
    : ["작업지시", "품목", "생산 실적", "사이클 타임"];

  productionLabels.forEach((label, index) => {
    label.textContent = labelTexts[index] ?? label.textContent;
  });
}

export function createEquipmentDetailPanel({ root, onClose }) {
  if (!root) {
    throw new Error("설비 상세정보 모달 요소를 찾을 수 없습니다.");
  }

  const closeButtons = [...root.querySelectorAll("[data-equipment-detail-close]")];
  const factoryDetailCard = root.querySelector(
    ".equipment-detail-card",
  );
  const utilityDetailCard = root.querySelector(
    ".utility-equipment-detail-card",
  );
  const logisticsDetailCard = root.querySelector(
    ".logistics-equipment-detail-card",
  );
  const metricGrid = root.querySelector("#equipment-detail-metrics");
  const chartLine = root.querySelector("#equipment-temperature-line");
  const progressBar = root.querySelector("#equipment-production-progress");
  let opened = false;
  let openedEquipmentId = null;

  function showDetailLayout(mode) {
    const showFactory = mode === "factory";
    const showUtility = mode === "utility";
    const showLogistics = mode === "logistics";

    factoryDetailCard.hidden = !showFactory;
    utilityDetailCard.hidden = !showUtility;
    logisticsDetailCard.hidden = !showLogistics;
  }

  function close() {
    if (!opened) return;
    opened = false;
    openedEquipmentId = null;
    root.hidden = true;
    onClose?.();
  }

  function handleBackdropClick(event) {
    if (event.target === root) close();
  }

  function renderMetrics(metrics) {
    metricGrid.replaceChildren(...metrics.map((metric) => {
      const item = document.createElement("div");
      item.className = "equipment-metric";
      item.classList.toggle("emphasis", Boolean(metric.emphasis));

      const label = document.createElement("span");
      label.textContent = metric.label;
      const value = document.createElement("strong");
      value.textContent = String(metric.value);
      const unit = document.createElement("small");
      unit.textContent = metric.unit;

      value.append(unit);
      item.append(label, value);
      return item;
    }));
  }

  /*
   * 모달 내용을 그린다.
   * 최초 열 때와 실시간 갱신에서 함께 사용한다.
   */
  function render(equipment) {
    if (equipment.facilityId === "utility") {
      showDetailLayout("utility");
      renderUtilityEquipmentDetail({
        root,
        equipment,
      });

      return;
    }

    if (equipment.facilityId === "logistics") {
      showDetailLayout("logistics");

      renderLogisticsEquipmentDetail({
        root,
        equipment,
      });

      return;
    }

    showDetailLayout("factory");
    restoreFactoryLabels(root, equipment);

    const status = STATUS_VIEW[equipment.status] ?? STATUS_VIEW.stopped;
    const productionRate = Math.min(
      100,
      Math.round((equipment.production.completed / equipment.production.target) * 100),
    );
    const history = equipment.temperatureHistory ?? [];

    root.dataset.status = status.tone;
    setText(
      root,
      "#equipment-detail-site",
      `${equipment.facilityLabel ?? "공장"} · 설비 상세정보`,
    );
    setText(root, "#equipment-detail-type", equipment.typeLabel);
    setText(root, "#equipment-detail-name", equipment.name);
    setText(root, "#equipment-detail-id", equipment.id);
    setText(root, "#equipment-detail-status", status.label);
    setText(root, "#equipment-detail-location", equipment.location);
    setText(root, "#equipment-detail-description", equipment.description);
    setText(root, "#equipment-work-order", equipment.production.workOrder);
    setText(root, "#equipment-product-name", equipment.production.product);
    setText(root, "#equipment-production-count", `${equipment.production.completed.toLocaleString("ko-KR")} / ${equipment.production.target.toLocaleString("ko-KR")} ${equipment.production.unit}`);
    setText(root, "#equipment-production-rate", `${productionRate}%`);
    setText(root, "#equipment-cycle-time", equipment.production.cycleTime);
    setText(root, "#equipment-last-inspection", equipment.maintenance.lastInspection);
    setText(root, "#equipment-next-inspection", equipment.maintenance.nextInspection);
    setText(root, "#equipment-operating-hours", equipment.maintenance.operatingHours);
    setText(root, "#equipment-alert-message", equipment.alert);
    setText(root, "#equipment-chart-range", history.length ? `${history[0].time} – ${history.at(-1).time}` : "-");

    renderMetrics(equipment.metrics);
    chartLine.setAttribute("points", createSparklinePoints(history));
    progressBar.style.width = `${productionRate}%`;
  }

  function open(equipment) {
    render(equipment);
    openedEquipmentId = equipment.id;
    opened = true;
    root.hidden = false;
  }

  /*
   * 열려 있는 설비의 최신 데이터로 내용만 다시 그린다.
   */
  function refresh(equipment) {
    if (!opened || equipment.id !== openedEquipmentId) return;
    render(equipment);
  }

  closeButtons.forEach((button) => button.addEventListener("click", close));
  root.addEventListener("click", handleBackdropClick);

  return {
    open,
    close,
    refresh,
    isOpen: () => opened,
    getOpenEquipmentId: () => openedEquipmentId,

    destroy() {
      closeButtons.forEach((button) => button.removeEventListener("click", close));
      root.removeEventListener("click", handleBackdropClick);
    },
  };
}
