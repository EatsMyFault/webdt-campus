/*
 * 우측 상단 단지 통합 관제 패널.
 *
 * 설비 데이터의 정적 상태 위에 물류 트럭·도크의 실시간 상태를 덮어
 * 전체 설비 수, 상태별 집계, 건물별 가동률, 경고 목록,
 * 물류 작업 현황을 한 화면에 보여준다.
 */

const STATUS_KEYS = Object.freeze([
  "running",
  "warning",
  "idle",
  "stopped",
]);

/*
 * 패널에 표시하는 건물 순서.
 * 값은 설비 데이터의 facilityId이자 시점 ID와 같다.
 */
const FACILITY_ORDER = Object.freeze([
  "factory-a",
  "factory-b",
  "utility",
  "logistics",
]);

function createUtilizationRow(facility) {
  const item = document.createElement("li");
  const head = document.createElement("div");
  const name = document.createElement("strong");
  const count = document.createElement("small");
  const rate = document.createElement("em");
  const bar = document.createElement("i");
  const fill = document.createElement("b");

  item.dataset.facility = facility.id;
  head.className = "site-utilization-head";
  bar.className = "site-utilization-bar";
  name.textContent = facility.label;

  head.append(name, count, rate);
  bar.append(fill);
  item.append(head, bar);

  return {
    element: item,
    count,
    rate,
    fill,
  };
}

function createAlertItem(equipment) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const body = document.createElement("div");
  const name = document.createElement("strong");
  const meta = document.createElement("small");
  const arrow = document.createElement("i");

  button.type = "button";
  button.dataset.facility = equipment.facilityId;
  button.title = `${equipment.facilityLabel} 시점으로 이동`;
  name.textContent = equipment.name;
  meta.textContent = `${equipment.facilityLabel} · ${equipment.id}`;
  arrow.textContent = "›";

  body.append(name, meta);
  button.append(body, arrow);
  item.append(button);

  return item;
}

function createEmptyAlertItem() {
  const item = document.createElement("li");
  const message = document.createElement("p");

  message.className = "site-alert-empty";
  message.textContent = "현재 경고 상태인 설비가 없습니다.";
  item.append(message);

  return item;
}

export function createSiteControlPanel({
  root,
  equipment,
  getLiveStatus,
  getLogisticsSummary,
  onSelectFacility,
}) {
  if (!root) {
    throw new Error("단지 관제 패널 요소를 찾을 수 없습니다.");
  }

  const totalValue = root.querySelector("#site-total-count");
  const updatedValue = root.querySelector("#site-panel-updated");
  const utilizationList = root.querySelector(
    "#site-utilization-list",
  );
  const alertList = root.querySelector("#site-alert-list");
  const alertCount = root.querySelector("#site-alert-count");

  const statusValues = new Map(
    STATUS_KEYS.map((status) => [
      status,
      root.querySelector(`#site-status-${status}`),
    ]),
  );

  const logisticsValues = {
    handling: root.querySelector("#site-logistics-handling"),
    moving: root.querySelector("#site-logistics-moving"),
    docks: root.querySelector("#site-logistics-docks"),
  };

  /*
   * 건물별 설비 묶음은 한 번만 계산한다.
   */
  const facilities = FACILITY_ORDER.map((facilityId) => {
    const items = equipment.filter(
      (item) => item.facilityId === facilityId,
    );

    return {
      id: facilityId,
      label: items[0]?.facilityLabel ?? facilityId,
      items,
    };
  }).filter((facility) => facility.items.length > 0);

  const totalDocks = equipment.filter(
    (item) => item.type === "shipping-dock",
  ).length;

  const totalTrucks = equipment.filter(
    (item) => item.type === "truck",
  ).length;

  const rows = facilities.map(createUtilizationRow);

  utilizationList.append(
    ...rows.map((row) => row.element),
  );

  totalValue.textContent = String(equipment.length);

  /*
   * 경고 목록은 구성이 바뀔 때만 다시 만든다.
   */
  let renderedAlertKey = null;

  function handleAlertClick(event) {
    const button = event.target.closest("button[data-facility]");

    if (!button) {
      return;
    }

    onSelectFacility?.(button.dataset.facility);
  }

  function resolveStatus(item) {
    return getLiveStatus?.(item.id) ?? item.status;
  }

  function renderAlerts(alerts) {
    const alertKey = alerts
      .map((item) => item.id)
      .join("|");

    if (alertKey === renderedAlertKey) {
      return;
    }

    renderedAlertKey = alertKey;

    alertList.replaceChildren(
      ...(alerts.length
        ? alerts.map(createAlertItem)
        : [createEmptyAlertItem()]),
    );
  }

  function update() {
    const counts = {
      running: 0,
      warning: 0,
      idle: 0,
      stopped: 0,
    };

    const alerts = [];

    facilities.forEach((facility, index) => {
      let running = 0;

      facility.items.forEach((item) => {
        const status = resolveStatus(item);

        if (status in counts) {
          counts[status] += 1;
        }

        if (status === "running") {
          running += 1;
        }

        if (status === "warning") {
          alerts.push(item);
        }
      });

      const rate = Math.round(
        (running / facility.items.length) * 100,
      );
      const row = rows[index];

      row.count.textContent =
        `${running} / ${facility.items.length}대`;
      row.rate.textContent = `${rate}%`;
      row.fill.style.width = `${rate}%`;
    });

    STATUS_KEYS.forEach((status) => {
      statusValues.get(status).textContent =
        String(counts[status]);
    });

    alertCount.textContent = `${alerts.length}건`;
    renderAlerts(alerts);

    const logistics = getLogisticsSummary?.() ?? {
      handlingTrucks: 0,
      movingTrucks: 0,
      occupiedDocks: 0,
    };

    logisticsValues.handling.textContent =
      `${logistics.handlingTrucks} / ${totalTrucks}대`;

    logisticsValues.moving.textContent =
      `${logistics.movingTrucks}대`;

    logisticsValues.docks.textContent =
      `${logistics.occupiedDocks} / ${totalDocks}`;

    updatedValue.textContent =
      new Date().toLocaleTimeString("ko-KR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  }

  alertList.addEventListener("click", handleAlertClick);
  update();

  return {
    update,

    destroy() {
      alertList.removeEventListener("click", handleAlertClick);
    },
  };
}
