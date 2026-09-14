import assert from "node:assert/strict";
import test from "node:test";

import {
  createEquipmentStore,
} from "../src/data/equipmentStore.js";

const INITIAL_EQUIPMENT = [
  {
    id: "TEST-01",
    name: "테스트 설비",
    status: "running",
    metrics: [{ label: "온도", value: 40, unit: "°C" }],
  },
];

test("설비를 갱신하고 초기 상태로 복구한다", () => {
  const store = createEquipmentStore(INITIAL_EQUIPMENT);

  store.updateEquipment("TEST-01", (equipment) => {
    equipment.status = "warning";
    equipment.metrics[0].value = 72;
    return equipment;
  });

  assert.equal(store.getEquipmentById("TEST-01").status, "warning");
  assert.equal(store.getEquipmentById("TEST-01").metrics[0].value, 72);
  assert.equal(INITIAL_EQUIPMENT[0].status, "running");

  store.resetEquipment("TEST-01");

  assert.equal(store.getEquipmentById("TEST-01").status, "running");
  assert.equal(store.getEquipmentById("TEST-01").metrics[0].value, 40);
});

test("설비 변경을 구독자에게 전달한다", () => {
  const store = createEquipmentStore(INITIAL_EQUIPMENT);
  const received = [];
  const unsubscribe = store.subscribe((event) => received.push(event));

  store.updateEquipment("TEST-01", { status: "stopped" });
  unsubscribe();

  assert.equal(received.length, 1);
  assert.equal(received[0].type, "update");
  assert.equal(received[0].equipment.status, "stopped");
  assert.equal(received[0].previous.status, "running");
});
