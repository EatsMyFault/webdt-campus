/*
 * 통합 관제 패널의 KPI 카드 영역.
 *
 * 카드 구성은 건물마다 다르므로 마크업을 고정하지 않고
 * 트래커가 돌려주는 카드 목록대로 그린다.
 */

import {
  createFacilityKpiTracker,
} from "../data/facilityKpiData.js";

function setProgress(element, value) {
  const safeValue = Math.min(100, Math.max(0, value));
  const progress = element.parentElement;

  element.style.width = `${safeValue}%`;
  progress?.setAttribute("aria-valuenow", safeValue.toFixed(1));
}

function createCardElement(card) {
  const article = document.createElement("article");
  const head = document.createElement("div");
  const label = document.createElement("span");
  const dot = document.createElement("i");
  const value = document.createElement("strong");
  const valueText = document.createElement("span");
  const unit = document.createElement("small");
  const description = document.createElement("p");
  const progress = document.createElement("span");
  const fill = document.createElement("i");

  article.className = "site-kpi-card";
  article.dataset.kpi = card.id;
  article.dataset.tone = card.tone;

  head.className = "site-kpi-card-head";
  label.textContent = card.label;
  head.append(label, dot);

  value.className = "site-kpi-value";
  unit.textContent = card.unit;
  value.append(valueText, unit);

  description.className = "site-kpi-description";

  progress.className = "site-kpi-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", card.label);
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  progress.append(fill);

  article.append(head, value, description, progress);

  return {
    element: article,
    card: article,
    value: valueText,
    description,
    fill,
  };
}

export function createSiteKpiDashboard({ root }) {
  if (!root) {
    throw new Error("운영 KPI 대시보드 요소를 찾을 수 없습니다.");
  }

  const grid = root.querySelector(".site-kpi-grid");
  const title = root.querySelector("#site-kpi-title");
  const caption = root.querySelector("#site-kpi-caption");

  let tracker = null;
  let views = [];
  let renderedKey = null;

  /*
   * 카드 구성이 바뀔 때만 DOM을 다시 만든다.
   * 같은 건물을 계속 보고 있으면 값만 갈아 끼운다.
   */
  function render(cards) {
    const key = cards.map((card) => card.id).join("|");

    if (key === renderedKey) {
      return;
    }

    renderedKey = key;
    views = cards.map(createCardElement);

    grid.replaceChildren(
      ...views.map((view) => view.element),
    );
  }

  function paint(cards) {
    render(cards);

    cards.forEach((card, index) => {
      const view = views[index];

      view.value.textContent = card.valueText;
      view.description.textContent = card.description;
      view.card.dataset.level = card.level;
      setProgress(view.fill, card.progress);
    });
  }

  /*
   * 시점이 바뀌면 해당 건물 트래커로 교체한다.
   * 누적 지표는 건물마다 따로 쌓이므로 트래커도 건물마다 유지한다.
   */
  const trackers = new Map();

  function setFacility(facilityId, facilityLabel) {
    if (!trackers.has(facilityId)) {
      trackers.set(
        facilityId,
        createFacilityKpiTracker(facilityId),
      );
    }

    tracker = trackers.get(facilityId);

    title.textContent = `${facilityLabel} 운영 지표`;
    caption.textContent = tracker.caption;
  }

  function update(context = {}) {
    if (!tracker) {
      return null;
    }

    const cards = tracker.update(context);

    paint(cards);

    return cards;
  }

  return {
    setFacility,
    update,

    reset() {
      trackers.forEach((item) => item.reset());
      update();
    },
  };
}
