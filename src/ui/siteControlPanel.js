/*
 * 우측 상단 통합 관제 패널.
 *
 * 설비 데이터의 정적 상태 위에 물류 트럭·도크의 실시간 상태를 덮어
 * 설비 수, 상태별 집계, 가동률, 경고 목록, 물류 작업 현황을 보여준다.
 *
 * 표시 범위는 현재 시점을 따라간다.
 *   단지 전체 시점 → 전체 집계 + 건물별 가동률 + 전체 경고
 *   건물 시점     → 그 건물만. KPI 카드와 가동률이 건물 지표로 바뀐다.
 */

import {
  createSiteKpiDashboard,
} from "./siteKpiDashboard.js";

import {
  hasFacilityKpi,
} from "../data/facilityKpiData.js";

import {
  calculateLineBalance,
  createStationStateReader,
  LINE_TARGET_TAKT_SECONDS,
} from "../data/lineBalance.js";

import {
  MODULE_CONVEYOR_STATIONS,
} from "../interiors/createFactoryAInterior.js";

import {
  PACK_CONVEYOR_STATIONS,
} from "../interiors/createFactoryBInterior.js";

/*
 * 라인 밸런싱을 보여 줄 건물과 그 라인의 스테이션 순서.
 *
 * 뱅크는 라인 순서대로 연속한 같은 설비를 묶어서 나오므로
 * 여기 순서가 곧 공정 순서다.
 */
const LINE_STATIONS = Object.freeze({
  "factory-a": MODULE_CONVEYOR_STATIONS,
  "factory-b": PACK_CONVEYOR_STATIONS,
});

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

function createUtilizationRow(group) {
  const item = document.createElement("li");
  const head = document.createElement("div");
  const name = document.createElement("strong");
  const count = document.createElement("small");
  const alert = document.createElement("mark");
  const rate = document.createElement("em");
  const bar = document.createElement("i");
  const fill = document.createElement("b");

  /*
   * 색은 건물별로 정해져 있어 설비 유형 행에도 같은 값을 물린다.
   */
  item.dataset.facility = group.facilityId;
  head.className = "site-utilization-head";
  bar.className = "site-utilization-bar";
  alert.className = "site-utilization-alert";
  alert.hidden = true;
  name.textContent = group.label;

  head.append(name, count, alert, rate);
  bar.append(fill);
  item.append(head, bar);

  return {
    element: item,
    count,
    alert,
    rate,
    fill,
  };
}

function createAlertItem(equipment, metaLabel) {
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
  meta.textContent = `${metaLabel} · ${equipment.id}`;
  arrow.textContent = "›";

  body.append(name, meta);
  button.append(body, arrow);
  item.append(button);

  return item;
}

function createEmptyAlertItem(message) {
  const item = document.createElement("li");
  const text = document.createElement("p");

  text.className = "site-alert-empty";
  text.textContent = message;
  item.append(text);

  return item;
}

/*
 * 라인 밸런싱 한 줄을 만든다.
 *
 * 막대는 목표 택트 대비 그 공정이 얼마나 차 있는지를 보여 준다.
 * 병목은 막대가 가장 길고 표식이 붙는다.
 */
function createBalanceRow(bank) {
  const item = document.createElement("li");
  const head = document.createElement("div");
  const name = document.createElement("strong");
  const count = document.createElement("small");
  const flag = document.createElement("mark");
  const takt = document.createElement("em");
  const bar = document.createElement("i");
  const fill = document.createElement("b");

  item.dataset.bank = bank.type;
  head.className = "site-utilization-head";
  bar.className = "site-utilization-bar";
  flag.className = "site-balance-flag";
  flag.textContent = "병목";
  flag.hidden = true;
  name.textContent = bank.label;

  head.append(name, count, flag, takt);
  bar.append(fill);
  item.append(head, bar);

  return { element: item, count, flag, takt, fill };
}

function formatTakt(seconds) {
  return Number.isFinite(seconds) ? `${seconds.toFixed(1)}초` : "정지";
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

  const titleValue = root.querySelector("#site-panel-title");
  const summaryLabel = root.querySelector("#site-summary-label");
  const totalValue = root.querySelector("#site-total-count");
  const updatedValue = root.querySelector("#site-panel-updated");
  const utilizationTitle = root.querySelector(
    "#site-utilization-title",
  );
  const utilizationList = root.querySelector(
    "#site-utilization-list",
  );
  const kpiSection = root.querySelector("#site-kpi-dashboard");
  const logisticsSection = root.querySelector(
    "#site-logistics-section",
  );
  const balanceSection = root.querySelector(
    "#site-line-balance-section",
  );
  const balanceList = root.querySelector("#site-balance-list");
  const taktValue = root.querySelector("#site-takt-value");
  const taktSummary = root.querySelector("#site-takt-summary");
  const alertList = root.querySelector("#site-alert-list");
  const alertCount = root.querySelector("#site-alert-count");
  const kpiDashboard = createSiteKpiDashboard({
    root: kpiSection,
  });

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

  const facilityById = new Map(
    facilities.map((facility) => [facility.id, facility]),
  );

  const totalDocks = equipment.filter(
    (item) => item.type === "shipping-dock",
  ).length;

  const totalTrucks = equipment.filter(
    (item) => item.type === "truck",
  ).length;

  /*
   * 가동률 행의 묶음 단위.
   * 단지 전체 시점은 건물별로, 건물 시점은 설비 유형별로 나눈다.
   */
  function createGroups(facility) {
    if (!facility) {
      return facilities.map((item) => ({
        facilityId: item.id,
        label: item.label,
        items: item.items,
      }));
    }

    const byTypeLabel = new Map();

    facility.items.forEach((item) => {
      const group = byTypeLabel.get(item.typeLabel) ?? [];

      group.push(item);
      byTypeLabel.set(item.typeLabel, group);
    });

    return [...byTypeLabel].map(([label, items]) => ({
      facilityId: facility.id,
      label,
      items,
    }));
  }

  let activeFacility = null;
  let groups = [];
  let rows = [];
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
        ? alerts.map((item) =>
          createAlertItem(
            item,
            activeFacility
              ? item.typeLabel
              : item.facilityLabel,
          ))
        : [
          createEmptyAlertItem(
            activeFacility
              ? "이 건물에는 경고 상태인 설비가 없습니다."
              : "현재 경고 상태인 설비가 없습니다.",
          ),
        ]),
    );
  }

  /*
   * 라인 밸런싱은 지금 돌아가는 설비만으로 다시 계산한다.
   * 설비가 멈추면 그 뱅크가 느려지고 병목이 옮겨 가기도 한다.
   * 화면에서 그 변화를 바로 볼 수 있어야 한다.
   */
  let balanceRows = [];
  let renderedBalanceKey = null;

  function renderLineBalance() {
    const stations = LINE_STATIONS[activeFacility?.id];

    if (!stations) return;

    /* 설비의 현재 상태를 덮어 실시간 밸런싱을 구한다 */
    const balance = calculateLineBalance(
      stations,
      createStationStateReader(
        equipment.map((item) => ({
          ...item,
          status: resolveStatus(item),
        })),
      ),
      { onlyAvailable: true },
    );

    const signature = balance.banks
      .map((bank) => bank.type)
      .join("|");

    if (signature !== renderedBalanceKey) {
      renderedBalanceKey = signature;
      balanceRows = balance.banks.map(createBalanceRow);
      balanceList.replaceChildren(
        ...balanceRows.map((row) => row.element),
      );
    }

    taktValue.textContent = formatTakt(balance.taktSeconds);
    taktSummary.textContent =
      `병목 ${balance.bottleneck.label} · ` +
      `스테이션 ${balance.stationCount}대 · ` +
      `목표 ${LINE_TARGET_TAKT_SECONDS}초`;

    balance.banks.forEach((bank, index) => {
      const row = balanceRows[index];
      const isBottleneck = bank.type === balance.bottleneck.type;
      const isOverTarget =
        !Number.isFinite(bank.effectiveTaktSeconds) ||
        bank.effectiveTaktSeconds > LINE_TARGET_TAKT_SECONDS;

      row.element.dataset.state = isOverTarget ? "over" : "normal";
      row.count.textContent =
        `${bank.availableCount}/${bank.machineCount}대 · ` +
        `사이클 ${bank.slowestSeconds.toFixed(1)}초`;
      row.takt.textContent = formatTakt(bank.effectiveTaktSeconds);
      row.flag.hidden = !isBottleneck;

      const ratio = Number.isFinite(bank.effectiveTaktSeconds)
        ? (bank.effectiveTaktSeconds / LINE_TARGET_TAKT_SECONDS) * 100
        : 100;

      row.fill.style.width = `${Math.min(Math.max(ratio, 0), 100)}%`;
    });
  }

  function readLogisticsSummary() {
    const summary = getLogisticsSummary?.() ?? {
      handlingTrucks: 0,
      movingTrucks: 0,
      occupiedDocks: 0,
    };

    return {
      ...summary,
      totalDocks,
      totalTrucks,
    };
  }

  function update(elapsedSeconds = 0) {
    if (!balanceSection.hidden) {
      renderLineBalance();
    }

    const counts = {
      running: 0,
      warning: 0,
      idle: 0,
      stopped: 0,
    };

    const alerts = [];

    groups.forEach((group, index) => {
      let running = 0;
      let warning = 0;

      group.items.forEach((item) => {
        const status = resolveStatus(item);

        if (status in counts) {
          counts[status] += 1;
        }

        if (status === "running") {
          running += 1;
        }

        if (status === "warning") {
          warning += 1;
          alerts.push(item);
        }
      });

      const rate = Math.round(
        (running / group.items.length) * 100,
      );
      const row = rows[index];

      row.count.textContent =
        `${running} / ${group.items.length}대`;
      row.rate.textContent = `${rate}%`;
      row.fill.style.width = `${rate}%`;
      row.alert.textContent = `경고 ${warning}`;
      row.alert.hidden = warning === 0;
    });

    STATUS_KEYS.forEach((status) => {
      statusValues.get(status).textContent =
        String(counts[status]);
    });

    const logistics = readLogisticsSummary();

    if (!kpiSection.hidden) {
      kpiDashboard.update({
        elapsedSeconds,
        statusCounts: counts,
        logistics,
      });
    }

    alertCount.textContent = `${alerts.length}건`;
    renderAlerts(alerts);

    if (!logisticsSection.hidden) {
      logisticsValues.handling.textContent =
        `${logistics.handlingTrucks} / ${totalTrucks}대`;

      logisticsValues.moving.textContent =
        `${logistics.movingTrucks}대`;

      logisticsValues.docks.textContent =
        `${logistics.occupiedDocks} / ${totalDocks}`;
    }

    updatedValue.textContent =
      new Date().toLocaleTimeString("ko-KR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
  }

  /*
   * 현재 시점의 건물로 패널 범위를 바꾼다.
   * facilityId가 없으면 단지 전체를 본다.
   */
  function setFacility(facilityId = null) {
    const facility = facilityId
      ? facilityById.get(facilityId) ?? null
      : null;

    activeFacility = facility;
    groups = createGroups(facility);
    rows = groups.map(createUtilizationRow);

    utilizationList.replaceChildren(
      ...rows.map((row) => row.element),
    );

    titleValue.textContent = facility
      ? `${facility.label} 관제`
      : "단지 통합 관제";

    summaryLabel.textContent = facility
      ? `${facility.label} 설비`
      : "전체 설비";

    utilizationTitle.textContent = facility
      ? "설비 유형별 가동률"
      : "건물별 가동률";

    totalValue.textContent = String(
      (facility ? facility.items : equipment).length,
    );

    /*
     * KPI 카드는 건물 시점 전용이다.
     * 단지 전체 시점은 가동률·경고 요약만 남긴다.
     */
    const showKpi =
      Boolean(facility) && hasFacilityKpi(facility.id);

    kpiSection.hidden = !showKpi;

    if (showKpi) {
      kpiDashboard.setFacility(facility.id, facility.label);
    }

    /* 라인 밸런싱은 컨베이어 라인이 있는 생산동에서만 보여 준다 */
    balanceSection.hidden = !LINE_STATIONS[facility?.id];

    if (!balanceSection.hidden) {
      renderLineBalance();
    }

    logisticsSection.hidden = facility?.id !== "logistics";

    renderedAlertKey = null;
    update();
  }

  alertList.addEventListener("click", handleAlertClick);
  setFacility(null);

  return {
    update,
    setFacility,

    destroy() {
      alertList.removeEventListener("click", handleAlertClick);
    },
  };
}
