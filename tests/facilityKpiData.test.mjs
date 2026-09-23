import assert from "node:assert/strict";
import test from "node:test";

import {
  createFacilityKpiTracker,
  hasFacilityKpi,
} from "../src/data/facilityKpiData.js";

import { SITE_KPI_BASE } from "../src/data/siteKpiData.js";
import { EQUIPMENT_DATA } from "../src/data/equipmentDataRegistry.js";

const FACILITY_IDS = Object.freeze([
  "factory-a",
  "factory-b",
  "utility",
  "logistics",
]);

function countStatus(facilityId) {
  const counts = {
    running: 0,
    warning: 0,
    idle: 0,
    stopped: 0,
  };

  EQUIPMENT_DATA.forEach((item) => {
    if (item.facilityId !== facilityId) {
      return;
    }

    if (item.status in counts) {
      counts[item.status] += 1;
    }
  });

  return counts;
}

test("건물마다 서로 다른 KPI 카드 네 장을 만든다", () => {
  const cardIds = FACILITY_IDS.map((facilityId) => {
    const tracker = createFacilityKpiTracker(facilityId);
    const cards = tracker.update({
      statusCounts: countStatus(facilityId),
      logistics: {
        occupiedDocks: 2,
        movingTrucks: 1,
        handlingTrucks: 1,
        totalDocks: 7,
        totalTrucks: 4,
      },
    });

    assert.equal(cards.length, 4);

    cards.forEach((card) => {
      assert.ok(card.label.length > 0);
      assert.ok(card.valueText.length > 0);
      assert.ok(card.description.length > 0);
      assert.ok(card.progress >= 0 && card.progress <= 100);
      assert.ok(card.tone.length > 0);
    });

    /*
     * 첫 장은 어느 건물이든 설비 가동률이다.
     */
    assert.equal(cards[0].id, "utilization");

    return cards.map((card) => card.id).join("|");
  });

  /*
   * 유틸리티와 물류는 생산동과 지표 구성 자체가 달라야 한다.
   */
  assert.notEqual(cardIds[0], cardIds[2]);
  assert.notEqual(cardIds[0], cardIds[3]);
  assert.notEqual(cardIds[2], cardIds[3]);

  /*
   * 모듈 조립동과 팩 조립동은 같은 지표를 쓴다.
   */
  assert.equal(cardIds[0], cardIds[1]);
});

test("생산동 KPI 합계는 단지 합계와 맞는다", () => {
  const snapshots = ["factory-a", "factory-b"].map(
    (facilityId) =>
      createFacilityKpiTracker(facilityId).update({
        statusCounts: countStatus(facilityId),
      }),
  );

  const totalProduction = snapshots.reduce(
    (sum, cards) =>
      sum +
      Number(cards[1].valueText.replaceAll(",", "")),
    0,
  );

  assert.equal(
    totalProduction,
    SITE_KPI_BASE.production.completed,
  );
});

test("가동률이 오르면 누적 지표도 함께 오른다", () => {
  const tracker = createFacilityKpiTracker("factory-a");
  const idle = {
    running: 0,
    warning: 0,
    idle: 12,
    stopped: 0,
  };

  const busy = {
    running: 12,
    warning: 0,
    idle: 0,
    stopped: 0,
  };

  const before = tracker.update({
    elapsedSeconds: 0,
    statusCounts: busy,
  });

  const after = tracker.update({
    elapsedSeconds: 5,
    statusCounts: busy,
  });

  assert.ok(
    Number(after[1].valueText.replaceAll(",", "")) >=
      Number(before[1].valueText.replaceAll(",", "")),
  );

  assert.equal(after[0].valueText, "100.0");

  const stopped = tracker.update({
    elapsedSeconds: 0,
    statusCounts: idle,
  });

  assert.equal(stopped[0].valueText, "0.0");
});

test("등록되지 않은 건물은 KPI를 만들지 않는다", () => {
  assert.equal(hasFacilityKpi("factory-a"), true);
  assert.equal(hasFacilityKpi("campus-overview"), false);

  assert.throws(
    () => createFacilityKpiTracker("campus-overview"),
    /KPI 구성이 없는 건물입니다/,
  );
});
