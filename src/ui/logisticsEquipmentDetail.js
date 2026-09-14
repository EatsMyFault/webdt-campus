const STATUS_VIEW = {
  running: {
    label: "작업 중",
    tone: "normal",
  },

  warning: {
    label: "확인 필요",
    tone: "warning",
  },

  idle: {
    label: "대기",
    tone: "idle",
  },

  stopped: {
    label: "작업 정지",
    tone: "stopped",
  },
};

const TYPE_VIEW = {
  truck: {
    symbol: "TR",
    typeCode: "LOGISTICS TRANSPORT VEHICLE",
  },

  "shipping-dock": {
    symbol: "DK",
    typeCode: "LOADING AND SHIPPING DOCK",
  },
};

function setText(root, selector, value) {
  const element = root.querySelector(selector);

  if (element) {
    element.textContent = value ?? "-";
  }
}

function clampProgress(value) {
  const numericValue = Number(value) || 0;

  return Math.min(
    100,
    Math.max(0, numericValue),
  );
}

function formatNumber(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value ?? "-";
  }

  return numericValue.toLocaleString("ko-KR");
}

function renderMetrics(root, metrics) {
  const metricGrid = root.querySelector(
    "#logistics-detail-metrics",
  );

  if (!metricGrid) {
    return;
  }

  const cards = metrics.map((metric, index) => {
    const card = document.createElement("article");

    card.className = "logistics-kpi-card";

    card.classList.toggle(
      "emphasis",
      Boolean(metric.emphasis),
    );

    const channel = document.createElement("small");

    channel.textContent =
      `KPI ${String(index + 1).padStart(2, "0")}`;

    const label = document.createElement("span");

    label.textContent = metric.label;

    const value = document.createElement("strong");

    value.textContent = String(metric.value);

    const unit = document.createElement("b");

    unit.textContent = metric.unit ?? "";

    value.append(unit);
    card.append(channel, label, value);

    return card;
  });

  metricGrid.replaceChildren(...cards);
}

function renderTruckDetail({
  root,
  equipment,
  logistics,
}) {
  const production = equipment.production ?? {};

  const progress = clampProgress(
    logistics.loadProgress,
  );

  setText(
    root,
    "#logistics-operation-title",
    "차량 상·하차 작업 현황",
  );

  setText(
    root,
    "#logistics-detail-cycle-label",
    "운행 회차",
  );

  setText(
    root,
    "#logistics-detail-cycle",
    Number.isFinite(logistics.cycleCount)
      ? `${logistics.cycleCount + 1}회차 운행`
      : null,
  );

  setText(
    root,
    "#logistics-route-title",
    "차량 운송 경로",
  );

  setText(
    root,
    "#logistics-route-source-label",
    "출발지",
  );

  setText(
    root,
    "#logistics-route-source",
    logistics.origin,
  );

  setText(
    root,
    "#logistics-route-destination-label",
    "목적지",
  );

  setText(
    root,
    "#logistics-route-destination",
    logistics.destination,
  );

  setText(
    root,
    "#logistics-assignment-title",
    "차량 운송 배정",
  );

  setText(
    root,
    "#logistics-assignment-label-1",
    "차량번호",
  );

  setText(
    root,
    "#logistics-assignment-value-1",
    logistics.vehicleNumber,
  );

  setText(
    root,
    "#logistics-assignment-label-2",
    "운송사",
  );

  setText(
    root,
    "#logistics-assignment-value-2",
    logistics.carrier,
  );

  setText(
    root,
    "#logistics-assignment-label-3",
    "담당 기사",
  );

  setText(
    root,
    "#logistics-assignment-value-3",
    logistics.driver,
  );

  setText(
    root,
    "#logistics-assignment-label-4",
    "배정 도크",
  );

  setText(
    root,
    "#logistics-assignment-value-4",
    logistics.dockLabel,
  );

  setText(
    root,
    "#logistics-detail-order",
    logistics.shipmentOrder,
  );

  setText(
    root,
    "#logistics-detail-cargo",
    logistics.cargo,
  );

  setText(
    root,
    "#logistics-detail-quantity",
    `${formatNumber(logistics.handled)} / ` +
      `${formatNumber(logistics.quantity)} ` +
      `${production.unit ?? "EA"}`,
  );

  return progress;
}

function renderDockDetail({
  root,
  equipment,
  logistics,
}) {
  const production = equipment.production ?? {};

  const progress = clampProgress(
    logistics.progress,
  );

  const dockNumber =
    logistics.dockNumber ?? logistics.number ?? "-";

  setText(
    root,
    "#logistics-operation-title",
    "출하 도크 작업 현황",
  );

  setText(
    root,
    "#logistics-detail-cycle-label",
    "현재 작업",
  );

  setText(
    root,
    "#logistics-detail-cycle",
    logistics.stageLabel,
  );

  setText(
    root,
    "#logistics-route-title",
    "도크 작업 연결",
  );

  setText(
    root,
    "#logistics-route-source-label",
    "배정 차량",
  );

  setText(
    root,
    "#logistics-route-source",
    logistics.vehicleNumber || "배정 차량 없음",
  );

  setText(
    root,
    "#logistics-route-destination-label",
    "작업 위치",
  );

  setText(
    root,
    "#logistics-route-destination",
    `${dockNumber}번 출하 도크`,
  );

  setText(
    root,
    "#logistics-assignment-title",
    "도크 운영정보",
  );

  setText(
    root,
    "#logistics-assignment-label-1",
    "셔터 ID",
  );

  setText(
    root,
    "#logistics-assignment-value-1",
    logistics.doorId,
  );

  setText(
    root,
    "#logistics-assignment-label-2",
    "배정 차량",
  );

  setText(
    root,
    "#logistics-assignment-value-2",
    logistics.vehicleNumber || "-",
  );

  setText(
    root,
    "#logistics-assignment-label-3",
    "대기 차량",
  );

  setText(
    root,
    "#logistics-assignment-value-3",
    `${formatNumber(logistics.queue)}대`,
  );

  setText(
    root,
    "#logistics-assignment-label-4",
    "시간당 처리량",
  );

  setText(
    root,
    "#logistics-assignment-value-4",
    `${formatNumber(logistics.throughput)} PLT/h`,
  );

  setText(
    root,
    "#logistics-detail-order",
    logistics.order,
  );

  setText(
    root,
    "#logistics-detail-cargo",
    logistics.cargo,
  );

  setText(
    root,
    "#logistics-detail-quantity",
    `${formatNumber(logistics.handled)} / ` +
      `${formatNumber(logistics.quantity)} ` +
      `${production.unit ?? "EA"}`,
  );

  return progress;
}

export function renderLogisticsEquipmentDetail({
  root,
  equipment,
}) {
  const logistics = equipment.logistics ?? {};

  const kind =
    logistics.kind ??
    (equipment.type === "truck" ? "truck" : "dock");

  const status =
    STATUS_VIEW[equipment.status] ??
    STATUS_VIEW.stopped;

  const typeView =
    TYPE_VIEW[equipment.type] ??
    TYPE_VIEW["shipping-dock"];

  root.dataset.status = status.tone;
  root.dataset.detailMode = "logistics";
  root.dataset.equipmentType = equipment.type;
  root.dataset.logisticsKind = kind;

  setText(
    root,
    "#logistics-detail-type",
    typeView.typeCode,
  );

  setText(
    root,
    "#logistics-detail-symbol",
    typeView.symbol,
  );

  setText(
    root,
    "#logistics-detail-name",
    equipment.name,
  );

  setText(
    root,
    "#logistics-detail-status",
    status.label,
  );

  setText(
    root,
    "#logistics-detail-id",
    equipment.id,
  );

  setText(
    root,
    "#logistics-detail-location",
    equipment.location,
  );

  setText(
    root,
    "#logistics-detail-stage",
    logistics.stageLabel,
  );

  /*
   * 운행 컨트롤러가 채워 주는 실시간 값이다.
   * 정지 데이터만 있을 때는 "-"로 남는다.
   */
  setText(
    root,
    "#logistics-detail-position",
    logistics.positionLabel,
  );

  setText(
    root,
    "#logistics-detail-arrival",
    logistics.arrivalAt,
  );

  setText(
    root,
    "#logistics-detail-departure",
    logistics.departureAt,
  );

  setText(
    root,
    "#logistics-detail-description",
    equipment.description,
  );

  renderMetrics(
    root,
    equipment.metrics ?? [],
  );

  const progress = kind === "truck"
    ? renderTruckDetail({
        root,
        equipment,
        logistics,
      })
    : renderDockDetail({
        root,
        equipment,
        logistics,
      });

  setText(
    root,
    "#logistics-detail-progress-value",
    `${progress}%`,
  );

  const progressBar = root.querySelector(
    "#logistics-detail-progress",
  );

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  setText(
    root,
    "#logistics-detail-alert-message",
    equipment.alert ??
      "현재 감지된 이상이 없습니다.",
  );

  setText(
    root,
    "#logistics-detail-updated",
    new Date().toLocaleTimeString(
      "ko-KR",
      {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      },
    ),
  );
}