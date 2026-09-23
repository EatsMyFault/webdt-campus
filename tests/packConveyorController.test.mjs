import assert from "node:assert/strict";
import test from "node:test";

import * as THREE from "three";

import {
  createPackConveyorController,
  createPackConveyorPath,
} from "../src/animations/packConveyorController.js";

import {
  PACK_CONVEYOR_PATH,
  PACK_CONVEYOR_STATIONS,
} from "../src/interiors/createFactoryBInterior.js";

import {
  calculateLineBalance,
  createStationStateReader,
} from "../src/data/lineBalance.js";
import { createEquipmentStore } from "../src/data/equipmentStore.js";
import { PACK_ASSEMBLY_EQUIPMENT } from "../src/data/packAssemblyEquipmentData.js";

/* 렌더 루프와 같은 폭으로 시간을 밀어 준다 */
const FRAME_SECONDS = 0.05;

function createController(store, { warmUpSeconds = 5400 } = {}) {
  const parent = new THREE.Group();
  const controller = createPackConveyorController({
    parent,
    path: PACK_CONVEYOR_PATH,
    stations: PACK_CONVEYOR_STATIONS,
    taktSeconds: calculateLineBalance(
      PACK_CONVEYOR_STATIONS,
      createStationStateReader(PACK_ASSEMBLY_EQUIPMENT),
    ).taktSeconds,
    warmUpSeconds,
    equipmentId: "CNV-PA-01",
    equipmentStore: store,

    getStationState(stationId) {
      const equipment = store.getEquipmentById(stationId);

      return {
        type: equipment?.type,
        cycleSeconds: equipment?.production?.cycleSeconds ?? 60,
        available:
          equipment?.status !== "idle" && equipment?.status !== "stopped",
      };
    },
  });

  return { parent, controller };
}

function visibleCarriers(controller) {
  return controller.root.children.filter(
    (child) => child.name.includes("-carrier-") && child.visible,
  );
}

function advance(controller, seconds) {
  const steps = Math.round(seconds / FRAME_SECONDS);

  for (let step = 0; step < steps; step += 1) {
    controller.update(FRAME_SECONDS);
  }
}

test("ㄷ자 경로는 세 구간으로 이어진다", () => {
  const [first, second, third, fourth] = PACK_CONVEYOR_PATH;

  /* 상단 가로: z 가 같고 x 만 줄어든다 */
  assert.equal(first[2], second[2]);
  assert.ok(second[0] < first[0]);

  /* 좌측 세로: x 가 같고 z 만 늘어난다 */
  assert.equal(second[0], third[0]);
  assert.ok(third[2] > second[2]);

  /* 하단 가로: z 가 같고 x 만 늘어난다 */
  assert.equal(third[2], fourth[2]);
  assert.ok(fourth[0] > third[0]);

  /* 열린 쪽이 같은 방향이라 시작과 끝의 x 가 맞는다 */
  assert.equal(first[0], fourth[0]);
});

test("스테이션 거리는 ㄷ자 경로 위에 놓인다", () => {
  const path = createPackConveyorPath(PACK_CONVEYOR_PATH);
  const pathLength = path.getLength();
  const point = new THREE.Vector3();

  PACK_CONVEYOR_STATIONS.forEach((station) => {
    path.getPointAt(station.distance / pathLength, point);

    /*
     * 스테이션은 벨트 바로 옆에 서 있으므로
     * 경로 위 같은 거리 지점과 x 가 맞아야 한다.
     * 어긋나면 팩이 엉뚱한 자리에서 멈춘다.
     *
     * getPointAt 은 길이 기준으로 되짚어 가느라 소수점 오차가 남는다.
     * 스테이션 간격이 23 이 넘으므로 1 이면 충분히 촘촘한 기준이다.
     */
    assert.ok(
      Math.abs(point.x - station.x) < 1,
      `${station.id} 위치가 경로와 어긋난다: ${point.x} / ${station.x}`,
    );
  });
});

test("화면을 열자마자 병목 앞에 팩이 쌓여 있다", () => {
  const store = createEquipmentStore(PACK_ASSEMBLY_EQUIPMENT);
  const { controller } = createController(store);

  const packs = controller.simulation.getPacks();

  assert.ok(packs.length > 10, `예열이 안 됐다: ${packs.length}대`);
  assert.equal(visibleCarriers(controller).length, packs.length);

  controller.destroy();
});

test("팩 메시는 시뮬레이션 팩 수를 따라간다", () => {
  const store = createEquipmentStore(PACK_ASSEMBLY_EQUIPMENT);
  const { controller } = createController(store);

  advance(controller, 60);

  assert.equal(
    visibleCarriers(controller).length,
    controller.simulation.getPacks().length,
  );

  controller.destroy();
});

test("팩 메시는 출하가 일어나도 라인을 가로질러 튀지 않는다", () => {
  const store = createEquipmentStore(PACK_ASSEMBLY_EQUIPMENT);
  const { controller } = createController(store);

  /*
   * 메시를 인덱스로 짝지으면 앞 팩이 빠질 때마다 한 칸씩 밀려
   * 팩들이 순간이동하는 것처럼 보인다.
   * 팩 하나에 메시 하나가 고정으로 물려 있어야 한다.
   */
  const before = new Map(
    visibleCarriers(controller).map((carrier) => [
      carrier.name,
      carrier.position.clone(),
    ]),
  );

  advance(controller, 300);

  visibleCarriers(controller).forEach((carrier) => {
    const previous = before.get(carrier.name);

    if (!previous) return;

    assert.ok(
      carrier.position.distanceTo(previous) < 300,
      `${carrier.name} 이 라인을 가로질러 튀었다`,
    );
  });

  controller.destroy();
});

test("컨베이어가 멈추면 팩도 멈춘다", () => {
  const store = createEquipmentStore(PACK_ASSEMBLY_EQUIPMENT);
  const { controller } = createController(store);

  store.updateEquipment("CNV-PA-01", { status: "stopped" });
  controller.update(FRAME_SECONDS);

  const before = visibleCarriers(controller).map((carrier) =>
    carrier.position.clone(),
  );

  advance(controller, 600);

  const after = visibleCarriers(controller).map((carrier) =>
    carrier.position.clone(),
  );

  assert.equal(before.length, after.length);
  before.forEach((position, index) => {
    assert.ok(
      position.distanceTo(after[index]) < 0.0001,
      "정지 상태인데 팩이 움직였다",
    );
  });

  controller.destroy();
});

test("정리하면 팩과 클리트가 모두 사라진다", () => {
  const store = createEquipmentStore(PACK_ASSEMBLY_EQUIPMENT);
  const { parent, controller } = createController(store, {
    warmUpSeconds: 60,
  });

  assert.equal(parent.children.length, 1);

  controller.destroy();

  assert.equal(parent.children.length, 0);
  assert.equal(controller.root.children.length, 0);
});
