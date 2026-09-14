import assert from "node:assert/strict";
import test from "node:test";

import {
  createEquipmentStore,
} from "../src/data/equipmentStore.js";
import {
  FACTORY_A_EQUIPMENT,
} from "../src/data/factoryAEquipmentData.js";
import {
  createScenarioEngine,
} from "../src/simulation/scenarioEngine.js";
import {
  FACTORY_A_OVERHEAT_SCENARIO,
} from "../src/simulation/scenarios/factoryAOverheatScenario.js";

test("CNC 과열 시나리오가 경고, 정지, 복구 순서로 진행된다", () => {
  const store = createEquipmentStore(FACTORY_A_EQUIPMENT);
  const engine = createScenarioEngine({
    store,
    scenario: FACTORY_A_OVERHEAT_SCENARIO,
  });

  engine.play();
  assert.equal(store.getEquipmentById("CNC-A-01").status, "running");

  engine.update(4);
  assert.equal(store.getEquipmentById("CNC-A-01").status, "warning");

  engine.update(5);
  assert.equal(store.getEquipmentById("CNC-A-01").status, "stopped");

  engine.update(5);
  assert.equal(store.getEquipmentById("CNC-A-01").status, "idle");

  engine.update(5);
  assert.equal(store.getEquipmentById("CNC-A-01").status, "running");
  assert.equal(engine.getState().state, "completed");
  assert.equal(engine.getState().events.length, 5);
});

test("초기화하면 진행 상태와 설비 상태가 함께 복구된다", () => {
  const store = createEquipmentStore(FACTORY_A_EQUIPMENT);
  const engine = createScenarioEngine({
    store,
    scenario: FACTORY_A_OVERHEAT_SCENARIO,
  });

  engine.play();
  engine.update(9);
  engine.reset();

  assert.equal(engine.getState().state, "idle");
  assert.equal(engine.getState().elapsed, 0);
  assert.equal(engine.getState().events.length, 0);
  assert.equal(store.getEquipmentById("CNC-A-01").status, "running");
  assert.equal(
    store.getEquipmentById("CNC-A-01").metrics[0].value,
    42.6,
  );
});
