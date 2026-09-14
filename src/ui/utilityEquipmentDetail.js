const STATUS_VIEW = {
  running: { label: "정상 공급", tone: "normal" },
  warning: { label: "주의 필요", tone: "warning" },
  idle: { label: "공급 대기", tone: "idle" },
  stopped: { label: "공급 정지", tone: "stopped" },
};

const TYPE_VIEW = {
  "storage-tank": {
    symbol: "TK",
    typeCode: "FLUID STORAGE SYSTEM",
    rateLabel: "금일 공급 달성률",
    trendTitle: "탱크 내부 온도 추이",
  },
  chiller: {
    symbol: "CH",
    typeCode: "PROCESS COOLING SYSTEM",
    rateLabel: "금일 냉열 달성률",
    trendTitle: "냉각기 본체 온도 추이",
  },
  transformer: {
    symbol: "TR",
    typeCode: "POWER DISTRIBUTION SYSTEM",
    rateLabel: "금일 전력 공급률",
    trendTitle: "변압기 권선 온도 추이",
  },
};

const FLOW_VIEW = {
  "TANK-UT-01": {
    source: "정수 처리 설비",
    destination: "A·B동 공정용수",
  },
  "TANK-UT-02": {
    source: "공기 압축 설비",
    destination: "생산동 공압 설비",
  },
  "TANK-UT-03": {
    source: "냉각 계통 환수",
    destination: "공정 냉각 계통",
  },
  "CHILLER-UT-01": {
    source: "생산동 냉각수 환수",
    destination: "A동 냉수 공급",
  },
  "CHILLER-UT-02": {
    source: "생산동 냉각수 환수",
    destination: "B동 냉수 공급",
  },
  "TR-UT-01": {
    source: "22.9 kV 수전 계통",
    destination: "A동·공용 전력",
  },
  "TR-UT-02": {
    source: "22.9 kV 수전 계통",
    destination: "B동·냉각 설비",
  },
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

  return history
    .map((item, index) => {
      const x = history.length === 1
        ? 0
        : (index / (history.length - 1)) * 100;
      const y = 38 - ((item.value - min) / range) * 30;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderMetrics(root, metrics) {
  const metricGrid = root.querySelector("#utility-detail-metrics");
  if (!metricGrid) return;

  const cards = metrics.map((metric, index) => {
    const card = document.createElement("article");
    card.className = "utility-kpi-card";
    card.classList.toggle("emphasis", Boolean(metric.emphasis));

    const indexLabel = document.createElement("small");
    indexLabel.textContent = `CH ${String(index + 1).padStart(2, "0")}`;

    const label = document.createElement("span");
    label.textContent = metric.label;

    const value = document.createElement("strong");
    value.textContent = String(metric.value);

    const unit = document.createElement("b");
    unit.textContent = metric.unit ?? "";

    value.append(unit);
    card.append(indexLabel, label, value);
    return card;
  });

  metricGrid.replaceChildren(...cards);
}

function formatAmount(value, unit) {
  const numericValue = Number(value) || 0;
  return `${numericValue.toLocaleString("ko-KR")} ${unit ?? ""}`.trim();
}

export function renderUtilityEquipmentDetail({ root, equipment }) {
  const status = STATUS_VIEW[equipment.status] ?? STATUS_VIEW.stopped;
  const typeView = TYPE_VIEW[equipment.type] ?? TYPE_VIEW["storage-tank"];
  const flowView = FLOW_VIEW[equipment.id] ?? {
    source: "유틸리티 공급원",
    destination: "생산 설비",
  };
  const production = equipment.production ?? {};
  const maintenance = equipment.maintenance ?? {};
  const history = equipment.temperatureHistory ?? [];
  const completed = Number(production.completed) || 0;
  const target = Number(production.target) || 0;
  const supplyRate = target > 0
    ? Math.min(100, Math.round((completed / target) * 100))
    : 0;

  root.dataset.status = status.tone;
  root.dataset.detailMode = "utility";
  root.dataset.equipmentType = equipment.type;

  setText(root, "#utility-detail-type", typeView.typeCode);
  setText(root, "#utility-detail-name", equipment.name);
  setText(root, "#utility-detail-status", status.label);
  setText(root, "#utility-detail-symbol", typeView.symbol);
  setText(root, "#utility-detail-id", equipment.id);
  setText(root, "#utility-detail-location", equipment.location);
  setText(root, "#utility-detail-description", equipment.description);
  setText(root, "#utility-detail-rate", `${supplyRate}%`);
  setText(root, "#utility-detail-rate-label", typeView.rateLabel);
  setText(
    root,
    "#utility-detail-output",
    `${formatAmount(completed, production.unit)} / ${formatAmount(target, production.unit)}`,
  );

  const gauge = root.querySelector("#utility-detail-gauge");
  gauge?.style.setProperty(
    "--utility-gauge-angle",
    `${supplyRate * 3.6}deg`,
  );

  renderMetrics(root, equipment.metrics ?? []);

  setText(root, "#utility-flow-source", flowView.source);
  setText(root, "#utility-flow-equipment", equipment.name);
  setText(root, "#utility-flow-destination", flowView.destination);

  setText(root, "#utility-detail-trend-title", typeView.trendTitle);
  setText(
    root,
    "#utility-detail-chart-range",
    history.length
      ? `${history[0].time} – ${history.at(-1).time}`
      : "-",
  );

  const chartLine = root.querySelector("#utility-detail-temperature-line");
  chartLine?.setAttribute("points", createSparklinePoints(history));

  setText(root, "#utility-detail-work-order", production.workOrder ?? "-");
  setText(root, "#utility-detail-product", production.product ?? "-");
  setText(root, "#utility-detail-cycle-time", production.cycleTime ?? "-");
  setText(root, "#utility-detail-last-inspection", maintenance.lastInspection ?? "-");
  setText(root, "#utility-detail-next-inspection", maintenance.nextInspection ?? "-");
  setText(root, "#utility-detail-operating-hours", maintenance.operatingHours ?? "-");
  setText(
    root,
    "#utility-detail-alert-message",
    equipment.alert ?? "현재 감지된 이상이 없습니다.",
  );

  const progress = root.querySelector("#utility-detail-progress");
  if (progress) progress.style.width = `${supplyRate}%`;

  setText(
    root,
    "#utility-detail-updated",
    new Date().toLocaleTimeString("ko-KR", { hour12: false }),
  );
}
