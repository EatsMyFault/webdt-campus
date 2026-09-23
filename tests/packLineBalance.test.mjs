import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePackLineBalance,
  PACK_LINE_BANKS,
  PACK_LINE_BOTTLENECK,
  PACK_LINE_STATION_COUNT,
  PACK_LINE_TAKT_SECONDS,
  PACK_LINE_TARGET_TAKT_SECONDS,
} from "../src/data/packLineBalance.js";

import { PACK_ASSEMBLY_EQUIPMENT } from "../src/data/packAssemblyEquipmentData.js";
import { PACK_CONVEYOR_STATION_COUNT } from "../src/interiors/createFactoryBInterior.js";
import { PROCESS_STEPS } from "../src/config/processConfig.js";

/*
 * 라인 택트는 손으로 적어 둔 숫자가 아니라 설비 구성에서 나온다.
 * 설비를 빼거나 사이클이 늘어나면 택트가 목표를 넘고,
 * 그러면 컨베이어가 실제보다 빨리 돌게 된다. 그걸 여기서 잡는다.
 */

test("병목 공정이 목표 택트 안에 든다", () => {
  assert.ok(
    PACK_LINE_TAKT_SECONDS <= PACK_LINE_TARGET_TAKT_SECONDS,
    `병목 ${PACK_LINE_BOTTLENECK.label} ${PACK_LINE_TAKT_SECONDS}초 > ` +
      `목표 ${PACK_LINE_TARGET_TAKT_SECONDS}초. 설비가 모자란다`,
  );
});

test("모든 뱅크가 목표 택트를 감당한다", () => {
  const overloaded = PACK_LINE_BANKS.filter(
    (bank) => bank.effectiveTaktSeconds > PACK_LINE_TARGET_TAKT_SECONDS,
  ).map(
    (bank) =>
      `${bank.label} ${bank.machineCount}대 → ${bank.effectiveTaktSeconds}초`,
  );

  assert.deepEqual(
    overloaded,
    [],
    `목표 택트를 넘는 공정: ${overloaded.join(", ")}`,
  );
});

test("사이클이 긴 공정일수록 설비가 많다", () => {
  /*
   * 병렬 대수는 사이클 길이를 나누려고 깐 것이다.
   * 필요한 최소 대수보다 적으면 배치가 뒤틀린 것이다.
   */
  const short = PACK_LINE_BANKS.filter(
    (bank) =>
      bank.machineCount <
      Math.ceil(bank.slowestSeconds / PACK_LINE_TARGET_TAKT_SECONDS),
  ).map(
    (bank) =>
      `${bank.label}: ${bank.machineCount}대 / 최소 ` +
      `${Math.ceil(bank.slowestSeconds / PACK_LINE_TARGET_TAKT_SECONDS)}대`,
  );

  assert.deepEqual(short, [], `대수가 모자란 공정: ${short.join(", ")}`);
});

test("뱅크 합계가 3D 스테이션 수와 맞는다", () => {
  assert.equal(PACK_LINE_STATION_COUNT, PACK_CONVEYOR_STATION_COUNT);
});

test("모든 공정 스테이션이 숫자 사이클을 갖는다", () => {
  const stations = PACK_ASSEMBLY_EQUIPMENT.filter(
    (equipment) =>
      equipment.type !== "conveyor" && equipment.type !== "agv",
  );

  const missing = stations
    .filter(
      (equipment) =>
        typeof equipment.production.cycleSeconds !== "number" ||
        !(equipment.production.cycleSeconds > 0),
    )
    .map((equipment) => equipment.id);

  assert.deepEqual(missing, [], `사이클 값이 없는 설비: ${missing.join(", ")}`);
  assert.equal(stations.length, PACK_LINE_STATION_COUNT);
});

test("쉬고 있는 설비도 설치 기준으로 센다", () => {
  const idle = PACK_ASSEMBLY_EQUIPMENT.find(
    (equipment) => equipment.id === "PEL-PA-04",
  );

  /* 화면에는 대기라고 나오지만 택트 계산에는 사이클이 들어가야 한다 */
  assert.equal(idle.status, "idle");
  assert.equal(idle.production.cycleTime, "대기");
  assert.ok(idle.production.cycleSeconds > 0);

  const bank = PACK_LINE_BANKS.find(
    (item) => item.type === "pack-eol-tester",
  );

  assert.ok(bank.machineIds.includes("PEL-PA-04"));
});

test("뱅크의 공정 단계가 공정 정의 안에 있다", () => {
  const stepIds = new Set(PROCESS_STEPS.map((step) => step.id));
  const invalid = PACK_LINE_BANKS.filter(
    (bank) => !stepIds.has(bank.processStep),
  ).map((bank) => `${bank.label}:${bank.processStep}`);

  assert.deepEqual(invalid, [], `정의 밖 공정: ${invalid.join(", ")}`);
});

test("사이클 타임 표시는 1분을 넘으면 분으로 읽힌다", () => {
  const long = PACK_ASSEMBLY_EQUIPMENT.find(
    (equipment) => equipment.id === "CLF-PA-01",
  );
  const short = PACK_ASSEMBLY_EQUIPMENT.find(
    (equipment) => equipment.id === "MRK-PA-01",
  );

  assert.match(long.production.cycleTime, /분/);
  assert.match(short.production.cycleTime, /초$/);
});


/*
 * 여기부터는 가동 기준 밸런싱이다.
 *
 * 병목을 계산만 해 두고 화면과 라인 거동에 안 쓰면 아무 의미가 없다.
 * 설비가 멈추면 그 뱅크가 느려지고, 병목이 옮겨 가기도 하고,
 * 벨트도 그만큼 느려져야 한다.
 */
function withStatus(overrides) {
  return PACK_ASSEMBLY_EQUIPMENT.map((equipment) =>
    overrides[equipment.id]
      ? { ...equipment, status: overrides[equipment.id] }
      : equipment,
  );
}

function bankOf(balance, type) {
  return balance.banks.find((bank) => bank.type === type);
}

test("멈춘 설비를 빼고 세면 그 뱅크가 느려진다", () => {
  const design = calculatePackLineBalance(PACK_ASSEMBLY_EQUIPMENT);
  const live = calculatePackLineBalance(PACK_ASSEMBLY_EQUIPMENT, {
    onlyAvailable: true,
  });

  const designed = bankOf(design, "pack-eol-tester");
  const actual = bankOf(live, "pack-eol-tester");

  /* PEL-PA-04 가 대기라 5대 중 4대만 돈다 */
  assert.equal(designed.machineCount, 5);
  assert.equal(actual.availableCount, 4);
  assert.ok(actual.effectiveTaktSeconds > designed.effectiveTaktSeconds);
  assert.equal(actual.effectiveTaktSeconds, 70);
});

test("설비가 멈추면 병목이 다른 공정으로 옮겨 간다", () => {
  const before = calculatePackLineBalance(PACK_ASSEMBLY_EQUIPMENT, {
    onlyAvailable: true,
  });

  assert.equal(before.bottleneck.type, "pack-eol-tester");

  /* 냉각수 주입기 세 대 중 두 대를 세우면 한 대가 다 받아 낸다 */
  const after = calculatePackLineBalance(
    withStatus({ "CLF-PA-02": "stopped", "CLF-PA-03": "stopped" }),
    { onlyAvailable: true },
  );

  assert.equal(after.bottleneck.type, "coolant-filler");
  assert.equal(bankOf(after, "coolant-filler").effectiveTaktSeconds, 124.6);
  assert.ok(after.taktSeconds > before.taktSeconds);
});

test("뱅크가 통째로 서면 라인이 선다", () => {
  const balance = calculatePackLineBalance(
    withStatus({ "TRY-PA-01": "stopped" }),
    { onlyAvailable: true },
  );

  assert.equal(bankOf(balance, "tray-washer").availableCount, 0);
  assert.equal(balance.taktSeconds, Infinity);
});

test("설치 기준은 설비 상태에 흔들리지 않는다", () => {
  const stopped = calculatePackLineBalance(
    withStatus({ "PEL-PA-01": "stopped", "PEL-PA-02": "stopped" }),
  );

  assert.equal(
    bankOf(stopped, "pack-eol-tester").effectiveTaktSeconds,
    PACK_LINE_BOTTLENECK.effectiveTaktSeconds,
  );
});
