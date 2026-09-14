import assert from "node:assert/strict";
import test from "node:test";

import {
  createDockDoorAutomation,
  DOCK_DOOR_LINKS,
} from "../src/animations/dockDoorAutomation.js";

function createFakeDoorController() {
  const calls = [];
  const state = new Map();

  return {
    calls,

    setDoorOpen(doorId, open) {
      calls.push({ doorId, open });
      state.set(doorId, open);
    },

    isOpen(doorId) {
      return state.get(doorId) ?? false;
    },
  };
}

function createFakeOperationController(stageByDockId) {
  return {
    getDockState(dockId) {
      const stage = stageByDockId.get(dockId);

      return stage ? { dockId, stage } : null;
    },
  };
}

test("도크 셔터는 설비 데이터의 연결을 그대로 쓴다", () => {
  assert.equal(DOCK_DOOR_LINKS.length, 7);

  DOCK_DOOR_LINKS.forEach((link, index) => {
    const number = String(index + 1).padStart(2, "0");

    assert.equal(link.dockId, `DOCK-LG-${number}`);
    assert.equal(link.doorId, `L-DOOR-${number}`);
  });
});

test("트럭이 도크에 붙으면 열리고 출차하면 닫힌다", () => {
  const stages = new Map([["DOCK-LG-01", "standby"]]);
  const doorController = createFakeDoorController();
  const automation = createDockDoorAutomation({
    operationController: createFakeOperationController(stages),
    doorController,
  });

  automation.update();
  assert.equal(doorController.calls.length, 0);

  /*
   * 도크 대기부터 상·하차까지는 열어 둔다.
   */
  ["waiting", "docking", "handling"].forEach((stage) => {
    stages.set("DOCK-LG-01", stage);
    automation.update();

    assert.equal(doorController.isOpen("L-DOOR-01"), true);
  });

  /*
   * 한 번 연 뒤에는 같은 구간 내내 다시 건드리지 않는다.
   */
  assert.equal(doorController.calls.length, 1);

  stages.set("DOCK-LG-01", "departing");
  automation.update();

  assert.equal(doorController.isOpen("L-DOOR-01"), false);
  assert.equal(doorController.calls.length, 2);

  stages.set("DOCK-LG-01", "circulating");
  automation.update();

  assert.equal(doorController.calls.length, 2);
});

test("배정 트럭이 없는 도크의 셔터는 건드리지 않는다", () => {
  const stages = new Map([["DOCK-LG-03", "handling"]]);
  const doorController = createFakeDoorController();
  const automation = createDockDoorAutomation({
    operationController: createFakeOperationController(stages),
    doorController,
  });

  automation.update();

  assert.deepEqual(
    doorController.calls,
    [{ doorId: "L-DOOR-03", open: true }],
  );
});

test("컨트롤러가 없으면 만들지 않는다", () => {
  assert.throws(
    () => createDockDoorAutomation({
      doorController: createFakeDoorController(),
    }),
    /트럭 운행 컨트롤러가 필요합니다/,
  );

  assert.throws(
    () => createDockDoorAutomation({
      operationController: createFakeOperationController(new Map()),
    }),
    /도크 셔터 컨트롤러가 필요합니다/,
  );
});
