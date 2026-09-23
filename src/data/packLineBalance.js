import { PACK_ASSEMBLY_EQUIPMENT } from "./packAssemblyEquipmentData.js";

/*
 * 팩 조립 라인 밸런싱.
 *
 * 라인의 속도는 가장 느린 공정이 정한다.
 * 그래서 공정마다 설비를 몇 대 깔았는지가 곧 라인 택트가 된다.
 *
 *   냉각수 주입은 한 대에 2분이 넘지만 세 대를 병렬로 돌리므로
 *   라인 입장에서는 41.5초마다 한 대씩 나온다.
 *
 * 같은 type 을 가진 설비가 한 공정을 나눠 맡는 병렬 뱅크다.
 * type 은 3D 객체와 상세정보 UI 도 함께 쓰는 값이라
 * 뱅크를 따로 적어 두지 않아도 여기서 그대로 묶을 수 있다.
 *
 * 밸런싱은 두 가지 기준으로 본다.
 *
 *   설치 기준  설비를 깐 대로. 라인 설계가 맞는지 보는 값이다.
 *   가동 기준  지금 돌아가는 설비만. 한 대가 서면 그 뱅크가 느려지고,
 *             병목이 다른 공정으로 옮겨 가기도 한다.
 *
 * 컨베이어는 가동 기준 택트를 따라 돈다.
 * 설비가 멈추면 라인도 그만큼 느려진다.
 */

/* 설계 목표. 병목이 이 값을 넘으면 설비가 모자란 것이다. */
export const PACK_LINE_TARGET_TAKT_SECONDS = 60;

/* 멈춰 있어 라인에 기여하지 못하는 상태 */
const DOWN_STATUSES = new Set(["idle", "stopped"]);

/*
 * 공정 스테이션만 고른다.
 * 컨베이어와 AGV 는 라인을 받쳐 주는 설비라 택트를 만들지 않는다.
 */
function isProcessStation(equipment) {
  return (
    equipment.facilityId === "factory-b" &&
    typeof equipment.production?.cycleSeconds === "number"
  );
}

/*
 * 설비 목록에서 뱅크별 처리 속도와 라인 병목을 계산한다.
 *
 * onlyAvailable 을 켜면 멈춘 설비를 빼고 센다.
 * 뱅크가 통째로 서면 그 공정에서 팩이 나오지 못하므로 택트는 무한이다.
 */
export function calculatePackLineBalance(
  equipmentList,
  { onlyAvailable = false } = {},
) {
  const byType = new Map();

  equipmentList.filter(isProcessStation).forEach((equipment) => {
    if (!byType.has(equipment.type)) {
      byType.set(equipment.type, []);
    }

    byType.get(equipment.type).push(equipment);
  });

  const banks = [...byType.entries()].map(([type, members]) => {
    const availableMembers = members.filter(
      (item) => !DOWN_STATUSES.has(item.status),
    );
    const counted = onlyAvailable ? availableMembers : members;

    /*
     * 뱅크 안에서 가장 느린 설비가 그 뱅크의 처리 속도를 정한다.
     * 한 대라도 느리면 그 대기 시간만큼 뒤가 밀린다.
     */
    const slowestSeconds = Math.max(
      ...members.map((item) => item.production.cycleSeconds),
    );

    const effectiveTaktSeconds = counted.length > 0
      ? Number((slowestSeconds / counted.length).toFixed(1))
      : Infinity;

    return Object.freeze({
      type,
      label: members[0].typeLabel,
      processStep: members[0].processStep,
      machineCount: members.length,
      availableCount: availableMembers.length,
      machineIds: Object.freeze(members.map((item) => item.id)),
      slowestSeconds,
      effectiveTaktSeconds,
    });
  });

  const bottleneck = banks.reduce(
    (slowest, bank) =>
      bank.effectiveTaktSeconds > slowest.effectiveTaktSeconds
        ? bank
        : slowest,
    banks[0],
  );

  return Object.freeze({
    banks: Object.freeze(banks),
    bottleneck,
    taktSeconds: bottleneck?.effectiveTaktSeconds ?? Infinity,
    stationCount: banks.reduce(
      (total, bank) => total + bank.machineCount,
      0,
    ),
  });
}

/*
 * 설치 기준 밸런싱.
 * 라인 설계가 목표 택트를 만족하는지 보는 값이다.
 */
const designBalance = calculatePackLineBalance(PACK_ASSEMBLY_EQUIPMENT);

export const PACK_LINE_BANKS = designBalance.banks;
export const PACK_LINE_BOTTLENECK = designBalance.bottleneck;
export const PACK_LINE_TAKT_SECONDS = designBalance.taktSeconds;
export const PACK_LINE_STATION_COUNT = designBalance.stationCount;

export function describePackLineBalance(balance = designBalance) {
  return balance.banks.map((bank) => ({
    공정: bank.label,
    대수: `${bank.availableCount}/${bank.machineCount}`,
    최장사이클: `${bank.slowestSeconds.toFixed(1)}초`,
    유효택트: Number.isFinite(bank.effectiveTaktSeconds)
      ? `${bank.effectiveTaktSeconds.toFixed(1)}초`
      : "정지",
    병목: bank.type === balance.bottleneck.type ? "◀" : "",
  }));
}
