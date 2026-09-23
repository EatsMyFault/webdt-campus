/*
 * 생산 라인 밸런싱.
 *
 * 라인의 속도는 가장 느린 공정이 정한다.
 * 그래서 공정마다 설비를 몇 대 깔았는지가 곧 라인 택트가 된다.
 *
 *   냉각수 주입은 한 대에 2분이 넘지만 세 대를 병렬로 돌리므로
 *   라인 입장에서는 41.5초마다 한 대씩 나온다.
 *
 * 뱅크는 라인에 나란히 붙어 있는 같은 종류의 설비 묶음이다.
 * 타입만 보고 전체에서 묶으면 안 된다. 모듈 조립동에는 비전 검사기가
 * 셀 외관과 용접부 두 군데에 따로 있는데, 이 둘은 서로 다른 공정이라
 * 한 창구로 합치면 택트가 절반으로 잘못 계산된다.
 * 그래서 라인 순서대로 훑으면서 연속 구간만 묶는다.
 *
 * 밸런싱은 두 기준으로 본다.
 *
 *   설치 기준  설비를 깐 대로. 라인 설계가 맞는지 보는 값이다.
 *   가동 기준  지금 돌아가는 설비만. 한 대가 서면 그 뱅크가 느려지고,
 *             병목이 다른 공정으로 옮겨 가기도 한다.
 *
 * 컨베이어는 가동 기준 택트를 따라 돈다.
 */

/* 설계 목표. 병목이 이 값을 넘으면 설비가 모자란 것이다. */
export const LINE_TARGET_TAKT_SECONDS = 60;

/* 멈춰 있어 라인에 기여하지 못하는 상태 */
const DOWN_STATUSES = new Set(["idle", "stopped"]);

/*
 * 설비 목록에서 스테이션 상태를 읽는 함수를 만든다.
 * 시뮬레이션과 밸런싱이 같은 입력을 쓰게 하려고 한곳에 둔다.
 */
export function createStationStateReader(equipmentList) {
  const byId = new Map(
    equipmentList.map((equipment) => [equipment.id, equipment]),
  );

  return function getStationState(stationId) {
    const equipment = byId.get(stationId);

    return {
      type: equipment?.type,
      label: equipment?.typeLabel,
      processStep: equipment?.processStep,
      cycleSeconds: equipment?.production?.cycleSeconds,
      available: !DOWN_STATUSES.has(equipment?.status),
    };
  };
}

/*
 * 라인 순서대로 훑으면서 연속한 같은 타입을 한 뱅크로 묶는다.
 */
export function calculateLineBalance(
  stations,
  getStationState,
  { onlyAvailable = false } = {},
) {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("스테이션 목록이 필요합니다.");
  }

  const banks = [];

  stations.forEach((station) => {
    const state = getStationState(station.id);
    const last = banks[banks.length - 1];
    const member = {
      id: station.id,
      cycleSeconds: state.cycleSeconds,
      available: state.available,
    };

    if (last && last.type === state.type) {
      last.members.push(member);
      return;
    }

    banks.push({
      type: state.type,
      label: state.label,
      processStep: state.processStep,
      members: [member],
    });
  });

  const resolved = banks.map((bank) => {
    const availableCount = bank.members.filter(
      (member) => member.available,
    ).length;
    const counted = onlyAvailable ? availableCount : bank.members.length;

    /*
     * 뱅크 안에서 가장 느린 설비가 그 뱅크의 처리 속도를 정한다.
     * 한 대라도 느리면 그 대기 시간만큼 뒤가 밀린다.
     */
    const slowestSeconds = Math.max(
      ...bank.members.map((member) => member.cycleSeconds),
    );

    return Object.freeze({
      type: bank.type,
      label: bank.label,
      processStep: bank.processStep,
      machineCount: bank.members.length,
      availableCount,
      machineIds: Object.freeze(bank.members.map((member) => member.id)),
      slowestSeconds,
      effectiveTaktSeconds: counted > 0
        ? Number((slowestSeconds / counted).toFixed(1))
        : Infinity,
    });
  });

  const bottleneck = resolved.reduce(
    (slowest, bank) =>
      bank.effectiveTaktSeconds > slowest.effectiveTaktSeconds
        ? bank
        : slowest,
    resolved[0],
  );

  return Object.freeze({
    banks: Object.freeze(resolved),
    bottleneck,
    taktSeconds: bottleneck?.effectiveTaktSeconds ?? Infinity,
    stationCount: stations.length,
  });
}

export function describeLineBalance(balance) {
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
