import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLineBalance,
  createStationStateReader,
  LINE_TARGET_TAKT_SECONDS,
} from "../src/data/lineBalance.js";

import { MODULE_CONVEYOR_STATIONS } from "../src/interiors/createFactoryAInterior.js";
import { PACK_CONVEYOR_STATIONS } from "../src/interiors/createFactoryBInterior.js";

import { MODULE_ASSEMBLY_EQUIPMENT } from "../src/data/moduleAssemblyEquipmentData.js";
import { PACK_ASSEMBLY_EQUIPMENT } from "../src/data/packAssemblyEquipmentData.js";
import { EQUIPMENT_DATA } from "../src/data/equipmentDataRegistry.js";
import { PROCESS_STEPS } from "../src/config/processConfig.js";

/*
 * 라인 택트는 손으로 적어 둔 숫자가 아니라 설비 구성에서 나온다.
 * 설비를 빼거나 사이클이 늘어나면 택트가 목표를 넘고,
 * 그러면 컨베이어가 실제보다 빨리 돌게 된다. 그걸 여기서 잡는다.
 */

const LINES = [
  {
    label: "모듈 조립동",
    stations: MODULE_CONVEYOR_STATIONS,
    equipment: MODULE_ASSEMBLY_EQUIPMENT,
  },
  {
    label: "팩 조립동",
    stations: PACK_CONVEYOR_STATIONS,
    equipment: PACK_ASSEMBLY_EQUIPMENT,
  },
];

function balanceOf(line, options) {
  return calculateLineBalance(
    line.stations,
    createStationStateReader(line.equipment),
    options,
  );
}

function withStatus(line, overrides) {
  return calculateLineBalance(
    line.stations,
    createStationStateReader(
      line.equipment.map((equipment) =>
        overrides[equipment.id]
          ? { ...equipment, status: overrides[equipment.id] }
          : equipment,
      ),
    ),
    { onlyAvailable: true },
  );
}

LINES.forEach((line) => {
  test(`${line.label} 병목이 목표 택트 안에 든다`, () => {
    const balance = balanceOf(line);

    assert.ok(
      balance.taktSeconds <= LINE_TARGET_TAKT_SECONDS,
      `병목 ${balance.bottleneck.label} ${balance.taktSeconds}초 > ` +
        `목표 ${LINE_TARGET_TAKT_SECONDS}초. 설비가 모자란다`,
    );
  });

  test(`${line.label} 사이클이 긴 공정일수록 설비가 많다`, () => {
    const short = balanceOf(line)
      .banks.filter(
        (bank) =>
          bank.machineCount <
          Math.ceil(bank.slowestSeconds / LINE_TARGET_TAKT_SECONDS),
      )
      .map(
        (bank) =>
          `${bank.label}: ${bank.machineCount}대 / 최소 ` +
          `${Math.ceil(bank.slowestSeconds / LINE_TARGET_TAKT_SECONDS)}대`,
      );

    assert.deepEqual(short, [], `대수가 모자란 공정: ${short.join(", ")}`);
  });

  test(`${line.label} 모든 스테이션이 숫자 사이클을 갖는다`, () => {
    const byId = new Map(
      line.equipment.map((equipment) => [equipment.id, equipment]),
    );

    const missing = line.stations
      .filter(
        (station) =>
          !(byId.get(station.id)?.production?.cycleSeconds > 0),
      )
      .map((station) => station.id);

    assert.deepEqual(missing, [], `사이클 값이 없는 설비: ${missing.join(", ")}`);
  });

  test(`${line.label} 뱅크의 공정 단계가 공정 정의 안에 있다`, () => {
    const stepIds = new Set(PROCESS_STEPS.map((step) => step.id));
    const invalid = balanceOf(line)
      .banks.filter((bank) => !stepIds.has(bank.processStep))
      .map((bank) => `${bank.label}:${bank.processStep}`);

    assert.deepEqual(invalid, [], `정의 밖 공정: ${invalid.join(", ")}`);
  });

  test(`${line.label} 설치 기준은 설비 상태에 흔들리지 않는다`, () => {
    const stopped = calculateLineBalance(
      line.stations,
      createStationStateReader(
        line.equipment.map((equipment) => ({
          ...equipment,
          status: "stopped",
        })),
      ),
    );

    assert.equal(stopped.taktSeconds, balanceOf(line).taktSeconds);
  });
});

/*
 * 뱅크는 라인 순서대로 연속한 같은 설비만 묶어야 한다.
 *
 * 모듈 조립동에는 비전 검사기가 셀 외관과 용접부 두 군데에 따로 있다.
 * 타입만 보고 전체에서 묶으면 한 창구로 합쳐져 택트가 절반으로
 * 잘못 나오는데, 화면상으로는 그럴듯해 보여 눈으로는 잡기 어렵다.
 */
test("떨어져 있는 같은 설비는 다른 뱅크로 나뉜다", () => {
  const banks = balanceOf(LINES[0]).banks;
  const visionBanks = banks.filter(
    (bank) => bank.type === "vision-inspector",
  );

  assert.equal(visionBanks.length, 2);
  assert.deepEqual(visionBanks[0].machineIds, ["CVS-MA-01"]);
  assert.deepEqual(visionBanks[1].machineIds, ["WVS-MA-01"]);
  assert.notEqual(visionBanks[0].processStep, visionBanks[1].processStep);
});

test("나란히 붙은 같은 설비는 한 뱅크로 묶인다", () => {
  const banks = balanceOf(LINES[1]).banks;
  const eol = banks.find((bank) => bank.type === "pack-eol-tester");

  assert.equal(eol.machineCount, 5);
  assert.equal(eol.effectiveTaktSeconds, 56);
});

test("멈춘 설비를 빼고 세면 그 뱅크가 느려진다", () => {
  const design = balanceOf(LINES[0]);
  const live = balanceOf(LINES[0], { onlyAvailable: true });

  const designed = design.banks.find(
    (bank) => bank.type === "module-eol-tester",
  );
  const actual = live.banks.find(
    (bank) => bank.type === "module-eol-tester",
  );

  /* MEL-MA-04 가 정지라 4대 중 3대만 돈다 */
  assert.equal(designed.machineCount, 4);
  assert.equal(actual.availableCount, 3);
  assert.ok(actual.effectiveTaktSeconds > designed.effectiveTaktSeconds);
});

test("설비가 멈추면 병목이 다른 공정으로 옮겨 간다", () => {
  const before = balanceOf(LINES[1], { onlyAvailable: true });

  assert.equal(before.bottleneck.type, "pack-eol-tester");

  /* 냉각수 주입기 세 대 중 두 대를 세우면 한 대가 다 받아 낸다 */
  const after = withStatus(LINES[1], {
    "CLF-PA-02": "stopped",
    "CLF-PA-03": "stopped",
  });

  assert.equal(after.bottleneck.type, "coolant-filler");
  assert.ok(after.taktSeconds > before.taktSeconds);
});

test("뱅크가 통째로 서면 라인이 선다", () => {
  const balance = withStatus(LINES[0], { "HPT-MA-01": "stopped" });

  assert.equal(balance.taktSeconds, Infinity);
});

test("셀 검사 사이클은 모듈 기준으로 환산된다", () => {
  const inspector = MODULE_ASSEMBLY_EQUIPMENT.find(
    (equipment) => equipment.id === "CIN-MA-01",
  );

  /*
   * 설비는 셀 한 장씩 처리하지만 라인에 흐르는 것은 모듈이다.
   * 셀당 2.4초 × 12셀 = 28.8초가 라인 관점의 사이클이다.
   */
  const perCell = inspector.metrics.find(
    (metric) => metric.label === "셀당 측정",
  );

  assert.equal(perCell.value, 2.4);
  assert.equal(inspector.production.cycleSeconds, 28.8);
});

test("라인 스테이션은 모두 설비 데이터에 있다", () => {
  const known = new Set(EQUIPMENT_DATA.map((equipment) => equipment.id));

  LINES.forEach((line) => {
    const missing = line.stations
      .filter((station) => !known.has(station.id))
      .map((station) => station.id);

    assert.deepEqual(missing, [], `${line.label}: ${missing.join(", ")}`);
  });
});
