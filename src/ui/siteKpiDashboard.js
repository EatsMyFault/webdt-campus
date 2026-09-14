import {
  createSiteKpiTracker,
} from "../data/siteKpiData.js";

const numberFormatter = new Intl.NumberFormat("ko-KR");

function setProgress(element, value) {
  const safeValue = Math.min(100, Math.max(0, value));
  const progress = element.parentElement;

  element.style.width = `${safeValue}%`;
  progress?.setAttribute("aria-valuenow", safeValue.toFixed(1));
}

function formatChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%p`;
}

export function createSiteKpiDashboard({ root }) {
  if (!root) {
    throw new Error("운영 KPI 대시보드 요소를 찾을 수 없습니다.");
  }

  const tracker = createSiteKpiTracker();
  const cards = {
    utilization: root.querySelector(
      '[data-kpi="utilization"]',
    ),
    production: root.querySelector(
      '[data-kpi="production"]',
    ),
    defect: root.querySelector('[data-kpi="defect"]'),
    energy: root.querySelector('[data-kpi="energy"]'),
  };

  const values = {
    utilization: root.querySelector("#site-kpi-utilization"),
    production: root.querySelector("#site-kpi-production"),
    defect: root.querySelector("#site-kpi-defect"),
    energy: root.querySelector("#site-kpi-energy"),
  };

  const descriptions = {
    utilization: root.querySelector(
      "#site-kpi-utilization-description",
    ),
    production: root.querySelector(
      "#site-kpi-production-description",
    ),
    defect: root.querySelector(
      "#site-kpi-defect-description",
    ),
    energy: root.querySelector(
      "#site-kpi-energy-description",
    ),
  };

  const fills = {
    utilization: root.querySelector(
      "#site-kpi-utilization-fill",
    ),
    production: root.querySelector(
      "#site-kpi-production-fill",
    ),
    defect: root.querySelector("#site-kpi-defect-fill"),
    energy: root.querySelector("#site-kpi-energy-fill"),
  };

  function update({ elapsedSeconds = 0, statusCounts = {} } = {}) {
    const snapshot = tracker.update(
      elapsedSeconds,
      statusCounts,
    );

    values.utilization.textContent =
      snapshot.utilization.value.toFixed(1);
    descriptions.utilization.textContent =
      `전일 대비 ${formatChange(snapshot.utilization.change)} · ` +
      `${snapshot.utilization.operating}/${snapshot.utilization.total}대 가동`;
    setProgress(
      fills.utilization,
      snapshot.utilization.progress,
    );

    values.production.textContent = numberFormatter.format(
      snapshot.production.value,
    );
    descriptions.production.textContent =
      `계획 ${snapshot.production.rate.toFixed(1)}% · ` +
      `목표 ${numberFormatter.format(snapshot.production.target)} EA`;
    setProgress(
      fills.production,
      snapshot.production.progress,
    );

    values.defect.textContent = snapshot.defect.value.toFixed(2);
    descriptions.defect.textContent =
      `불량 ${numberFormatter.format(snapshot.defect.count)}건 · ` +
      `목표 ${snapshot.defect.targetRate.toFixed(2)}% 이하`;
    setProgress(fills.defect, snapshot.defect.progress);
    cards.defect.dataset.level =
      snapshot.defect.value <= snapshot.defect.targetRate
        ? "good"
        : "warning";

    values.energy.textContent = numberFormatter.format(
      snapshot.energy.value,
    );
    descriptions.energy.textContent =
      `예산 ${snapshot.energy.rate.toFixed(1)}% · ` +
      `현재 ${numberFormatter.format(snapshot.energy.currentPower)} kW`;
    setProgress(fills.energy, snapshot.energy.progress);

    cards.energy.dataset.level =
      snapshot.energy.rate >= 90 ? "warning" : "normal";

    return snapshot;
  }

  update();

  return {
    update,

    reset() {
      tracker.reset();
      update();
    },
  };
}
