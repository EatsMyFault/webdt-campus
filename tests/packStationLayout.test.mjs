import assert from "node:assert/strict";
import test from "node:test";

import * as THREE from "three";

import {
  createFactoryBInterior,
  PACK_CONVEYOR_PATH,
  PACK_CONVEYOR_STATION_COUNT,
} from "../src/interiors/createFactoryBInterior.js";

import { getEquipmentByFacility } from "../src/data/equipmentDataRegistry.js";

/*
 * 팩 조립동은 벨트가 라인의 척추다.
 * 설비가 벨트에서 떨어져 있으면 팩을 실은 채로 작업할 수 없고,
 * 반대로 벨트를 가로막으면 팩이 지나가지 못한다.
 * 그 두 조건을 배치 단계에서 잡아 둔다.
 */

/* 벨트 난간 바깥선까지의 반폭 */
const BELT_HALF_WIDTH = 3.15;

/* 설비가 벨트에 붙었다고 볼 수 있는 최대 간격 */
const ATTACHED_GAP = 2;

/*
 * 모듈 장착 로봇만 벨트 위로 팔을 뻗는다.
 * 팩에 모듈을 얹어야 하므로 이건 의도된 침범이다.
 */
const REACHES_OVER_BELT = /^MMT-PA-/;

const BELT_CORRIDORS = [
  { name: "상단 벨트", minX: -180, maxX: 180, minZ: -50 - BELT_HALF_WIDTH, maxZ: -50 + BELT_HALF_WIDTH },
  { name: "하단 벨트", minX: -180, maxX: 180, minZ: 50 - BELT_HALF_WIDTH, maxZ: 50 + BELT_HALF_WIDTH },
  { name: "좌측 벨트", minX: -180 - BELT_HALF_WIDTH, maxX: -180 + BELT_HALF_WIDTH, minZ: -50, maxZ: 50 },
];

function buildStations() {
  const root = new THREE.Group();

  createFactoryBInterior(root);

  const stations = [];

  root.traverse((node) => {
    const id = node.userData?.equipmentId;

    if (id && id !== "CNV-PA-01" && !id.startsWith("AGV")) {
      stations.push({ id, box: new THREE.Box3().setFromObject(node) });
    }
  });

  return stations;
}

function gapToBelt(box) {
  const gaps = BELT_CORRIDORS.map((corridor) => {
    const dx = Math.max(corridor.minX - box.max.x, box.min.x - corridor.maxX, 0);
    const dz = Math.max(corridor.minZ - box.max.z, box.min.z - corridor.maxZ, 0);

    return Math.hypot(dx, dz);
  });

  return Math.min(...gaps);
}

function intrudesBelt(box) {
  return BELT_CORRIDORS.some(
    (corridor) =>
      box.max.x > corridor.minX &&
      box.min.x < corridor.maxX &&
      box.max.z > corridor.minZ &&
      box.min.z < corridor.maxZ,
  );
}

test("공정 설비가 모두 벨트에 붙어 있다", () => {
  const stations = buildStations();

  assert.equal(stations.length, PACK_CONVEYOR_STATION_COUNT);

  const detached = stations
    .filter((station) => gapToBelt(station.box) > ATTACHED_GAP)
    .map((station) => `${station.id}(${gapToBelt(station.box).toFixed(2)})`);

  assert.deepEqual(
    detached,
    [],
    `벨트에서 떨어진 설비: ${detached.join(", ")}`,
  );
});

test("모듈 장착 로봇만 벨트 위로 팔을 뻗는다", () => {
  const stations = buildStations();

  const unexpected = stations
    .filter(
      (station) =>
        intrudesBelt(station.box) && !REACHES_OVER_BELT.test(station.id),
    )
    .map((station) => station.id);

  assert.deepEqual(
    unexpected,
    [],
    `벨트를 가로막는 설비: ${unexpected.join(", ")}`,
  );

  const reaching = stations.filter(
    (station) =>
      REACHES_OVER_BELT.test(station.id) && intrudesBelt(station.box),
  );

  assert.ok(reaching.length > 0, "로봇이 벨트에 닿지 않는다");
});

test("설비끼리 겹치지 않는다", () => {
  const stations = buildStations();
  const collisions = [];

  for (let i = 0; i < stations.length; i += 1) {
    for (let j = i + 1; j < stations.length; j += 1) {
      if (stations[i].box.intersectsBox(stations[j].box)) {
        collisions.push(`${stations[i].id} ↔ ${stations[j].id}`);
      }
    }
  }

  assert.deepEqual(collisions, [], `겹친 설비: ${collisions.join(", ")}`);
});

test("스테이션 수와 팩 조립동 설비 데이터가 맞는다", () => {
  const stations = buildStations();
  const dataIds = new Set(
    getEquipmentByFacility("factory-b").map((equipment) => equipment.id),
  );

  stations.forEach((station) => {
    assert.ok(
      dataIds.has(station.id),
      `데이터에 없는 스테이션: ${station.id}`,
    );
  });
});

test("모든 스테이션이 벨트 경로 범위 안에 선다", () => {
  const stations = buildStations();
  const minX = Math.min(...PACK_CONVEYOR_PATH.map((corner) => corner[0]));
  const maxX = Math.max(...PACK_CONVEYOR_PATH.map((corner) => corner[0]));

  stations.forEach((station) => {
    assert.ok(
      station.box.min.x > minX - 40 && station.box.max.x < maxX + 40,
      `${station.id} 가 라인 밖으로 나갔다`,
    );
  });
});
