import assert from "node:assert/strict";
import test from "node:test";

import * as THREE from "three";

import {
  createFactoryAInterior,
  MODULE_CONVEYOR_PATH,
  MODULE_CONVEYOR_STATIONS,
} from "../src/interiors/createFactoryAInterior.js";

import {
  createFactoryBInterior,
  PACK_CONVEYOR_PATH,
  PACK_CONVEYOR_STATIONS,
} from "../src/interiors/createFactoryBInterior.js";

import { getEquipmentByFacility } from "../src/data/equipmentDataRegistry.js";
import { createPackConveyorPath } from "../src/animations/packConveyorController.js";

/*
 * 두 생산동 모두 벨트가 라인의 척추다.
 * 설비가 벨트에서 떨어져 있으면 제품을 실은 채로 작업할 수 없고,
 * 반대로 벨트를 가로막으면 제품이 지나가지 못한다.
 * 그 두 조건을 배치 단계에서 잡아 둔다.
 */

/* 벨트 난간 바깥선까지의 반폭 */
const BELT_HALF_WIDTH = 3.15;

/* 설비가 벨트에 붙었다고 볼 수 있는 최대 간격 */
const ATTACHED_GAP = 2;

/*
 * 팩 조립동의 모듈 장착 로봇만 벨트 위로 팔을 뻗는다.
 * 팩에 모듈을 얹어야 하므로 이건 의도된 침범이다.
 */
const REACHES_OVER_BELT = /^MMT-PA-/;

function cornersOf(pathPoints) {
  return pathPoints.map((point) => ({ x: point[0], z: point[2] }));
}

/*
 * ㄷ자 경로를 세 개의 직선 통로로 바꾼다.
 */
function corridorsOf(pathPoints) {
  const corners = cornersOf(pathPoints);
  const corridors = [];

  for (let index = 0; index < corners.length - 1; index += 1) {
    const from = corners[index];
    const to = corners[index + 1];

    corridors.push({
      minX: Math.min(from.x, to.x) - (from.z === to.z ? 0 : BELT_HALF_WIDTH),
      maxX: Math.max(from.x, to.x) + (from.z === to.z ? 0 : BELT_HALF_WIDTH),
      minZ: Math.min(from.z, to.z) - (from.x === to.x ? 0 : BELT_HALF_WIDTH),
      maxZ: Math.max(from.z, to.z) + (from.x === to.x ? 0 : BELT_HALF_WIDTH),
    });
  }

  return corridors;
}

const LINES = [
  {
    label: "모듈 조립동",
    facilityId: "factory-a",
    build: createFactoryAInterior,
    stations: MODULE_CONVEYOR_STATIONS,
    path: MODULE_CONVEYOR_PATH,
  },
  {
    label: "팩 조립동",
    facilityId: "factory-b",
    build: createFactoryBInterior,
    stations: PACK_CONVEYOR_STATIONS,
    path: PACK_CONVEYOR_PATH,
  },
];

function buildStations(line) {
  const root = new THREE.Group();

  line.build(root);

  const wanted = new Set(line.stations.map((station) => station.id));
  const found = [];

  root.traverse((node) => {
    const id = node.userData?.equipmentId;

    if (id && wanted.has(id)) {
      found.push({ id, box: new THREE.Box3().setFromObject(node) });
    }
  });

  return found;
}

function gapToBelt(box, corridors) {
  return Math.min(
    ...corridors.map((corridor) => {
      const dx = Math.max(
        corridor.minX - box.max.x,
        box.min.x - corridor.maxX,
        0,
      );
      const dz = Math.max(
        corridor.minZ - box.max.z,
        box.min.z - corridor.maxZ,
        0,
      );

      return Math.hypot(dx, dz);
    }),
  );
}

function intrudesBelt(box, corridors) {
  return corridors.some(
    (corridor) =>
      box.max.x > corridor.minX &&
      box.min.x < corridor.maxX &&
      box.max.z > corridor.minZ &&
      box.min.z < corridor.maxZ,
  );
}

LINES.forEach((line) => {
  const corridors = corridorsOf(line.path);

  test(`${line.label} 공정 설비가 모두 벨트에 붙어 있다`, () => {
    const stations = buildStations(line);

    assert.equal(stations.length, line.stations.length);

    const detached = stations
      .filter((station) => gapToBelt(station.box, corridors) > ATTACHED_GAP)
      .map(
        (station) =>
          `${station.id}(${gapToBelt(station.box, corridors).toFixed(2)})`,
      );

    assert.deepEqual(
      detached,
      [],
      `벨트에서 떨어진 설비: ${detached.join(", ")}`,
    );
  });

  test(`${line.label} 설비가 벨트를 가로막지 않는다`, () => {
    const unexpected = buildStations(line)
      .filter(
        (station) =>
          intrudesBelt(station.box, corridors) &&
          !REACHES_OVER_BELT.test(station.id),
      )
      .map((station) => station.id);

    assert.deepEqual(
      unexpected,
      [],
      `벨트를 가로막는 설비: ${unexpected.join(", ")}`,
    );
  });

  test(`${line.label} 설비끼리 겹치지 않는다`, () => {
    const stations = buildStations(line);
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

  test(`${line.label} 스테이션이 설비 데이터에 있다`, () => {
    const known = new Set(
      getEquipmentByFacility(line.facilityId).map(
        (equipment) => equipment.id,
      ),
    );

    const missing = line.stations
      .filter((station) => !known.has(station.id))
      .map((station) => station.id);

    assert.deepEqual(missing, [], `데이터에 없는 스테이션: ${missing.join(", ")}`);
  });

  test(`${line.label} 스테이션 거리는 벨트 경로 위에 놓인다`, () => {
    const path = createPackConveyorPath(line.path);
    const pathLength = path.getLength();
    const point = new THREE.Vector3();

    line.stations.forEach((station) => {
      path.getPointAt(station.distance / pathLength, point);

      /*
       * 어긋나면 제품이 엉뚱한 자리에서 멈춘다.
       * getPointAt 은 길이 기준으로 되짚어 가느라 소수점 오차가 남으므로
       * 스테이션 간격보다 한참 작은 1 을 기준으로 둔다.
       */
      assert.ok(
        Math.abs(point.x - station.x) < 1,
        `${station.id} 위치가 경로와 어긋난다: ${point.x} / ${station.x}`,
      );
    });
  });

  test(`${line.label} 스테이션은 공정 순서대로 늘어선다`, () => {
    line.stations.forEach((station, index) => {
      if (index === 0) return;

      assert.ok(
        station.distance > line.stations[index - 1].distance,
        `${station.id} 이 앞 스테이션보다 뒤에 있지 않다`,
      );
    });
  });
});

test("모듈 조립동 라인은 팩 조립동과 같은 ㄷ자 구조다", () => {
  [MODULE_CONVEYOR_PATH, PACK_CONVEYOR_PATH].forEach((pathPoints) => {
    const [first, second, third, fourth] = pathPoints;

    /* 상단 가로 → 세로 → 하단 가로 */
    assert.equal(first[2], second[2]);
    assert.ok(second[0] < first[0]);
    assert.equal(second[0], third[0]);
    assert.ok(third[2] > second[2]);
    assert.equal(third[2], fourth[2]);
    assert.ok(fourth[0] > third[0]);

    /* 열린 쪽이 같은 방향이라 시작과 끝의 x 가 맞는다 */
    assert.equal(first[0], fourth[0]);
  });
});
