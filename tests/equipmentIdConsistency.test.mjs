import assert from "node:assert/strict";
import test from "node:test";

import * as THREE from "three";

import { createFactoryAInterior } from "../src/interiors/createFactoryAInterior.js";
import { createFactoryBInterior } from "../src/interiors/createFactoryBInterior.js";

import {
  EQUIPMENT_DATA,
  getEquipmentByFacility,
} from "../src/data/equipmentDataRegistry.js";

import { PROCESS_STEPS } from "../src/config/processConfig.js";

/*
 * 3D 객체의 equipmentId 와 설비 데이터의 id 는 반드시 같아야 한다.
 * 어긋나면 설비를 클릭해도 상세정보가 뜨지 않고
 * 상태등 색도 갱신되지 않는데, 화면상으로는 멀쩡해 보여
 * 눈으로는 잡기 어렵다.
 */
function collectSceneEquipmentIds(buildInterior) {
  const root = new THREE.Group();

  buildInterior(root);

  const ids = new Set();

  root.traverse((node) => {
    const id = node.userData?.equipmentId;

    if (id) {
      ids.add(id);
    }
  });

  return ids;
}

const INTERIORS = [
  {
    label: "모듈 조립동",
    facilityId: "factory-a",
    build: createFactoryAInterior,
  },
  {
    label: "팩 조립동",
    facilityId: "factory-b",
    build: createFactoryBInterior,
  },
];

INTERIORS.forEach(({ label, facilityId, build }) => {
  test(`${label} 3D 설비는 모두 설비 데이터에 있다`, () => {
    const sceneIds = collectSceneEquipmentIds(build);
    const dataIds = new Set(
      getEquipmentByFacility(facilityId).map((equipment) => equipment.id),
    );

    assert.ok(sceneIds.size > 0, "3D 설비가 하나도 없다");

    const missing = [...sceneIds].filter((id) => !dataIds.has(id));

    assert.deepEqual(
      missing,
      [],
      `데이터가 없는 3D 설비: ${missing.join(", ")}`,
    );
  });
});

test("설비 ID는 단지 전체에서 중복되지 않는다", () => {
  const ids = EQUIPMENT_DATA.map((equipment) => equipment.id);

  assert.equal(new Set(ids).size, ids.length);
});

test("생산동 설비의 공정 단계는 공정 정의 안에 있다", () => {
  const stepIds = new Set(PROCESS_STEPS.map((step) => step.id));

  const invalid = EQUIPMENT_DATA.filter(
    (equipment) =>
      equipment.processStep !== undefined &&
      !stepIds.has(equipment.processStep),
  ).map((equipment) => `${equipment.id}:${equipment.processStep}`);

  assert.deepEqual(
    invalid,
    [],
    `정의되지 않은 공정 단계: ${invalid.join(", ")}`,
  );
});

test("모든 공정 단계에는 설비가 최소 한 대 배정된다", () => {
  const assigned = new Set(
    EQUIPMENT_DATA.map((equipment) => equipment.processStep).filter(Boolean),
  );

  const empty = PROCESS_STEPS.filter(
    (step) => !assigned.has(step.id),
  ).map((step) => step.name);

  assert.deepEqual(empty, [], `설비가 없는 공정: ${empty.join(", ")}`);
});
