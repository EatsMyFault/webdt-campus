import assert from "node:assert/strict";
import test from "node:test";

import {
  SITE_KPI_BASE,
  createSiteKpiTracker,
} from "../src/data/siteKpiData.js";

const STATUS_COUNTS = Object.freeze({
  running: 22,
  warning: 10,
  idle: 12,
  stopped: 1,
});

test("설비 상태 집계로 단지 가동률을 계산한다", () => {
  const tracker = createSiteKpiTracker();
  const snapshot = tracker.createSnapshot(STATUS_COUNTS);

  assert.equal(snapshot.utilization.operating, 32);
  assert.equal(snapshot.utilization.total, 45);
  assert.equal(snapshot.utilization.value, 71.1);
  assert.equal(snapshot.production.value, 2864);
  assert.equal(snapshot.defect.value, 1.36);
  assert.equal(snapshot.energy.value, 6842.4);
});

test("운전 시간과 가동률에 따라 생산량과 에너지가 누적된다", () => {
  const tracker = createSiteKpiTracker();
  const fullOperation = {
    running: 45,
    warning: 0,
    idle: 0,
    stopped: 0,
  };

  const before = tracker.createSnapshot(fullOperation);
  const after = tracker.update(5, fullOperation);

  assert.ok(after.production.value >= before.production.value);
  assert.ok(after.energy.value > before.energy.value);
  assert.ok(
    after.energy.value <=
      before.energy.value + SITE_KPI_BASE.energy.currentPowerKw,
  );
});
