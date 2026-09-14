/*
 * 실제 운행 컨트롤러 · 셔터 컨트롤러 · 자동 개폐를 함께 돌려
 * 트럭 도착에 맞춰 셔터가 실제로 움직이는지 확인한다.
 */

import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  createLogisticsOperationController,
} from "../src/animations/logisticsOperationController.js";

import {
  createDockDoorAutomation,
} from "../src/animations/dockDoorAutomation.js";

import {
  createFactoryDoorController,
} from "../src/interactions/factoryDoorController.js";

import {
  LOGISTICS_TRUCK_OPERATIONS,
} from "../src/data/logisticsOperationData.js";

import {
  LOGISTICS_DOCKS,
} from "../src/data/logisticsEquipmentData.js";

/*
 * 셔터 컨트롤러는 포인터 이벤트와 레이캐스트를 쓰므로
 * 브라우저 객체 자리에 최소한의 대역을 넣는다.
 */
function createStubDomElement() {
  return {
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    },
  };
}

function createDoors() {
  return LOGISTICS_DOCKS.map((dock) => {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial(),
    );

    return {
      id: dock.logistics.doorId,
      name: dock.name,
      panel: new THREE.Group(),
      statusLight: light,
      clickTargets: [],
    };
  });
}

function createWorld() {
  const root = new THREE.Group();

  LOGISTICS_TRUCK_OPERATIONS.forEach((plan) => {
    const truck = new THREE.Group();

    truck.userData.equipmentId = plan.truckId;
    root.add(truck);
  });

  const doors = createDoors();
  const doorController = createFactoryDoorController({
    camera: new THREE.PerspectiveCamera(),
    domElement: createStubDomElement(),
    doors,
    initiallyEnabled: false,
  });

  const operationController =
    createLogisticsOperationController({ root });

  const automation = createDockDoorAutomation({
    operationController,
    doorController,
  });

  const doorById = new Map(
    doors.map((door) => [door.id, door]),
  );

  function step(deltaSeconds) {
    operationController.update(deltaSeconds);
    automation.update();
    doorController.update(deltaSeconds);
  }

  return { step, doorById, operationController, doorController };
}

test("트럭이 도크에 붙는 동안 셔터가 열려 있다", () => {
  const world = createWorld();
  const plan = LOGISTICS_TRUCK_OPERATIONS[0];
  const doorId = `L-DOOR-0${plan.dockNumber}`;
  const door = world.doorById.get(doorId);

  const seen = new Map();

  for (let index = 0; index < 4000; index += 1) {
    world.step(0.05);

    const stage =
      world.operationController.getTruckState(plan.truckId).stage;

    /*
     * 각 단계에서 마지막으로 관측한 셔터 열림 정도를 남긴다.
     */
    seen.set(stage, door.openness);

    if (seen.has("circulating")) {
      break;
    }
  }

  /*
   * 후진 접안과 상·하차 중에는 완전히 열려 있어야 한다.
   */
  assert.equal(seen.get("docking"), 1);
  assert.equal(seen.get("handling"), 1);

  /*
   * 출차를 시작하면 닫히기 시작하고, 순환에 들어가면 닫혀 있다.
   */
  assert.ok(seen.get("departing") < 1);
  assert.equal(seen.get("circulating"), 0);
});

test("배정 트럭이 없는 도크의 셔터는 닫힌 채로 남는다", () => {
  const world = createWorld();
  const assignedDoorIds = new Set(
    LOGISTICS_TRUCK_OPERATIONS.map(
      (plan) => `L-DOOR-0${plan.dockNumber}`,
    ),
  );

  for (let index = 0; index < 2000; index += 1) {
    world.step(0.05);
  }

  [...world.doorById.entries()].forEach(([doorId, door]) => {
    if (assignedDoorIds.has(doorId)) {
      return;
    }

    assert.equal(door.openness, 0, `${doorId}가 움직였습니다.`);
    assert.equal(door.targetOpen, false);
  });
});

test("자동 개폐는 시점 활성화 여부와 무관하게 동작한다", () => {
  /*
   * 물류 시점이 아닐 때 셔터 컨트롤러는 비활성(enabled=false)이다.
   * 클릭은 막히지만 설비는 계속 돌아가야 한다.
   */
  const world = createWorld();
  const plan = LOGISTICS_TRUCK_OPERATIONS[0];
  const door = world.doorById.get(`L-DOOR-0${plan.dockNumber}`);

  world.doorController.setEnabled(false);

  let opened = false;

  for (let index = 0; index < 2000 && !opened; index += 1) {
    world.step(0.05);
    opened = door.openness > 0;
  }

  assert.equal(opened, true);
});
