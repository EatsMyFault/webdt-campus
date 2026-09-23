import assert from "node:assert/strict";
import test from "node:test";

import {
  createPackLineSimulation,
  PACK_PHASE,
} from "../src/animations/packLineSimulation.js";

import { PACK_CONVEYOR_STATIONS } from "../src/interiors/createFactoryBInterior.js";
import { PACK_ASSEMBLY_EQUIPMENT } from "../src/data/packAssemblyEquipmentData.js";

/*
 * 병목이 라인에 나타나는 모습을 확인한다.
 *
 * 느린 공정 앞에는 팩이 줄을 서고 뒤는 비어야 한다.
 * 그 분포가 무너지면 병목이 그냥 숫자로만 남은 것이다.
 */

const PATH_LENGTH = 820;
const DOWN_STATUSES = new Set(["idle", "stopped"]);

const equipmentById = new Map(
  PACK_ASSEMBLY_EQUIPMENT.map((item) => [item.id, item]),
);

function createSimulation(statusOverrides = {}) {
  return createPackLineSimulation({
    stations: PACK_CONVEYOR_STATIONS,
    pathLength: PATH_LENGTH,

    getStationState(stationId) {
      const equipment = equipmentById.get(stationId);
      const status = statusOverrides[stationId] ?? equipment.status;

      return {
        type: equipment.type,
        cycleSeconds: equipment.production.cycleSeconds,
        available: !DOWN_STATUSES.has(status),
      };
    },
  });
}

function stationDistance(stationId) {
  return PACK_CONVEYOR_STATIONS.find((item) => item.id === stationId)
    .distance;
}

function bankOf(simulation, type) {
  return simulation.getBanks().find((bank) => bank.type === type);
}

test("뱅크는 같은 공정 설비를 한 덩어리로 묶는다", () => {
  const simulation = createSimulation();
  const banks = simulation.getBanks();

  assert.equal(banks.length, 11);
  assert.equal(bankOf(simulation, "pack-eol-tester").servers.length, 5);
  assert.equal(bankOf(simulation, "coolant-filler").servers.length, 3);
  assert.equal(bankOf(simulation, "tray-washer").servers.length, 1);
});

test("팩은 설비에 올라가 사이클 타임만큼 머문다", () => {
  const simulation = createSimulation();

  /* 첫 설비까지 이동할 시간을 준다 */
  simulation.update(120);

  const working = simulation
    .getPacks()
    .filter((pack) => pack.phase === PACK_PHASE.working);

  assert.ok(working.length > 0, "작업 중인 팩이 없다");

  /* 작업 중인 팩은 설비 자리에 정확히 서 있다 */
  working.forEach((pack) => {
    assert.equal(pack.distance, stationDistance(pack.stationId));
  });
});

test("병목 앞에 팩이 쌓이고 뒤는 빈다", () => {
  const simulation = createSimulation();

  simulation.warmUp(5400);

  const packs = simulation.getPacks();
  const bottleneckStart = stationDistance("PEL-PA-01");

  const before = packs.filter(
    (pack) => pack.distance < bottleneckStart,
  ).length;
  const after = packs.filter(
    (pack) => pack.distance >= bottleneckStart,
  ).length;

  assert.ok(packs.length > 10, `팩이 너무 적다: ${packs.length}`);
  assert.ok(
    before > after * 2,
    `병목 앞뒤 분포가 평평하다: 앞 ${before} / 뒤 ${after}`,
  );
});

test("병목 뒤 마지막 공정은 굶는다", () => {
  const simulation = createSimulation();

  simulation.warmUp(5400);

  /* 라인이 꽉 찼는데도 마지막 검사기는 자주 비어 있다 */
  const marking = bankOf(simulation, "vision-inspector");
  const sealing = bankOf(simulation, "sealing-robot");

  assert.equal(marking.queueLength, 0);
  assert.ok(
    sealing.servers.every((server) => server.busy),
    "병목 앞 공정이 놀고 있다",
  );
});

test("대기 칸이 차면 앞 공정 설비가 팩을 붙들고 있는다", () => {
  const simulation = createSimulation();

  simulation.warmUp(5400);

  const blocked = simulation
    .getPacks()
    .filter((pack) => pack.phase === PACK_PHASE.blocked);

  assert.ok(
    blocked.length > 0,
    "막힌 팩이 없다. 대기 칸 제한이 동작하지 않는다",
  );
});

test("설비가 멈추면 그 공정이 라인을 잡는다", () => {
  /* 냉각수 주입기 세 대 중 두 대를 세운다 */
  const simulation = createSimulation({
    "CLF-PA-02": "stopped",
    "CLF-PA-03": "stopped",
  });

  simulation.warmUp(5400);

  const coolant = bankOf(simulation, "coolant-filler");

  assert.equal(
    coolant.servers.filter((server) => server.available).length,
    1,
  );

  const packs = simulation.getPacks();
  const coolantStart = stationDistance("CLF-PA-01");

  const upstream = packs.filter(
    (pack) => pack.distance < coolantStart,
  ).length;
  const downstream = packs.filter(
    (pack) => pack.distance >= coolantStart,
  ).length;

  assert.ok(
    upstream > downstream,
    `냉각수 주입 앞에 줄이 서지 않았다: 앞 ${upstream} / 뒤 ${downstream}`,
  );
});

test("뱅크가 통째로 서면 그 앞에서 라인이 막힌다", () => {
  const simulation = createSimulation({ "TRY-PA-01": "stopped" });

  simulation.warmUp(1800);

  const washer = bankOf(simulation, "tray-washer");

  assert.equal(washer.servers.filter((s) => s.available).length, 0);

  /* 아무도 첫 공정을 통과하지 못해 라인이 비어 있다 */
  const packs = simulation.getPacks();

  assert.ok(
    packs.every((pack) => pack.distance <= stationDistance("TRY-PA-01")),
    "멈춘 설비를 팩이 통과했다",
  );
});

test("팩은 경로를 벗어나지 않고 뒤로도 가지 않는다", () => {
  const simulation = createSimulation();
  const previous = new Map();

  for (let step = 0; step < 600; step += 1) {
    simulation.update(1);

    simulation.getPacks().forEach((pack) => {
      assert.ok(
        pack.distance >= 0 && pack.distance <= PATH_LENGTH,
        `경로를 벗어났다: ${pack.distance}`,
      );

      const last = previous.get(pack.id);

      if (last !== undefined) {
        assert.ok(
          pack.distance >= last - 0.001,
          `팩이 뒤로 갔다: ${last} → ${pack.distance}`,
        );
      }

      previous.set(pack.id, pack.distance);
    });
  }
});

test("라인은 팩을 계속 내보낸다", () => {
  const simulation = createSimulation();

  simulation.warmUp(5400);

  const before = new Set(
    simulation.getPacks().map((pack) => pack.id),
  );

  simulation.update(1800);

  const after = new Set(simulation.getPacks().map((pack) => pack.id));
  const shipped = [...before].filter((id) => !after.has(id));

  assert.ok(
    shipped.length > 0,
    "30분이 지나도 출하된 팩이 없다",
  );
});
