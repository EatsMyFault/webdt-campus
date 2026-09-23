/*
 * 팩 조립 라인 운행 시뮬레이션.
 *
 * 벨트 위 팩을 하나씩 따로 굴린다.
 * 팩은 설비에 올라가 사이클 타임만큼 작업을 받고,
 * 다음 공정에 자리가 나야 넘어간다.
 *
 * 그래서 느린 공정 앞에는 팩이 줄을 서고 뒤는 비는데,
 * 그게 병목이 라인에 나타나는 모습이다.
 *
 * 공정마다 설비가 여러 대인 병렬 뱅크는 서버가 여럿인 창구와 같다.
 * 팩은 그중 빈 설비 한 대만 거친다. 다섯 대를 줄줄이 지나지 않는다.
 *
 * 공정 사이 벨트에는 대기 자리가 몇 칸뿐이다.
 * 그 칸이 다 차면 앞 공정 설비가 완성품을 못 내려놓아 그대로 잡혀 있는다.
 * 이 막힘이 위로 번지면서 병목 앞 구간이 팩으로 꽉 찬다.
 *
 * THREE 에 기대지 않는 순수 로직이라 그대로 시험할 수 있다.
 */

/* 팩 길이에 여유를 더한 최소 간격 */
const PACK_GAP = 9;

/* 공정 사이 대기 칸 수의 상·하한 */
const MIN_BUFFER = 1;
const MAX_BUFFER = 3;

/* 한 번에 굴릴 수 있는 시간 폭. 큰 값이 들어와도 쪼개서 돈다. */
const MAX_STEP_SECONDS = 0.5;

export const PACK_PHASE = Object.freeze({
  moving: "moving",
  working: "working",
  waiting: "waiting",
  blocked: "blocked",
  leaving: "leaving",
});

/*
 * 같은 공정 설비가 벨트에 나란히 붙어 있으므로
 * 연속 구간으로 묶으면 그게 곧 병렬 뱅크다.
 */
function buildBanks(stations, getStationState) {
  const banks = [];

  stations.forEach((station) => {
    const state = getStationState(station.id);
    const type = state.type ?? station.id.slice(0, 3);
    const last = banks[banks.length - 1];

    const server = {
      id: station.id,
      distance: station.distance,
      cycleSeconds: state.cycleSeconds,
      available: state.available,
      pack: null,
    };

    if (last && last.type === type) {
      last.servers.push(server);
      return;
    }

    banks.push({
      type,
      servers: [server],
      queue: [],
      entryDistance: station.distance,
      bufferSize: MIN_BUFFER,
    });
  });

  /*
   * 대기 칸은 앞 공정과의 빈 벨트 길이만큼만 둘 수 있다.
   * 칸을 더 잡으면 팩이 앞 설비 위에 겹쳐 보인다.
   */
  banks.forEach((bank, index) => {
    const previous = banks[index - 1];
    const upstreamEnd = previous
      ? previous.servers[previous.servers.length - 1].distance
      : 0;
    const room = Math.floor(
      (bank.entryDistance - upstreamEnd - PACK_GAP) / PACK_GAP,
    );

    bank.bufferSize = Math.min(
      MAX_BUFFER,
      Math.max(MIN_BUFFER, room),
    );
  });

  return banks;
}

export function createPackLineSimulation({
  stations,
  pathLength,
  getStationState,
  travelSpeed = 3,
}) {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("스테이션 목록이 필요합니다.");
  }

  if (!(pathLength > 0)) {
    throw new Error("경로 길이가 필요합니다.");
  }

  const banks = buildBanks(stations, getStationState);
  const packs = [];

  let nextPackId = 1;

  function refreshServers() {
    banks.forEach((bank) => {
      bank.servers.forEach((server) => {
        const state = getStationState(server.id);

        server.cycleSeconds = state.cycleSeconds;
        server.available = state.available;
      });
    });
  }

  /* 대기 중인 팩이 설 자리. 뒤로 갈수록 한 칸씩 물러선다. */
  function queueSlotDistance(bank, index) {
    return bank.entryDistance - PACK_GAP * (index + 1);
  }

  function enqueue(pack, bankIndex) {
    const bank = banks[bankIndex];

    pack.bankIndex = bankIndex;
    pack.server = null;
    pack.phase = PACK_PHASE.waiting;
    bank.queue.push(pack);
  }

  /*
   * 작업이 끝난 팩을 다음 공정으로 넘긴다.
   * 다음 대기줄이 꽉 차 있으면 설비에 그대로 붙잡힌다.
   */
  function handOff(pack) {
    const nextIndex = pack.bankIndex + 1;

    if (nextIndex >= banks.length) {
      if (pack.server) pack.server.pack = null;

      pack.server = null;
      pack.bankIndex = nextIndex;
      pack.target = pathLength;
      pack.phase = PACK_PHASE.leaving;
      return true;
    }

    if (banks[nextIndex].queue.length >= banks[nextIndex].bufferSize) {
      pack.phase = PACK_PHASE.blocked;
      return false;
    }

    if (pack.server) pack.server.pack = null;

    enqueue(pack, nextIndex);
    return true;
  }

  /*
   * 대기줄 앞에서부터 빈 설비에 올린다.
   */
  function dispatch(bank) {
    while (bank.queue.length > 0) {
      const server = bank.servers.find(
        (item) => item.available && item.pack === null,
      );

      if (!server) return;

      const pack = bank.queue.shift();

      server.pack = pack;
      pack.server = server;
      pack.target = server.distance;
      pack.phase = PACK_PHASE.moving;
      pack.remaining = server.cycleSeconds;
    }
  }

  function advance(pack, deltaSeconds, target) {
    pack.distance = Math.min(
      target,
      pack.distance + travelSpeed * deltaSeconds,
    );

    return pack.distance >= target - 0.001;
  }

  function step(deltaSeconds) {
    refreshServers();

    /* 작업 진행과 인계. 앞 공정부터 비워야 뒤가 따라 들어온다. */
    for (let index = banks.length - 1; index >= 0; index -= 1) {
      banks[index].servers.forEach((server) => {
        const pack = server.pack;

        if (!pack) return;

        if (pack.phase === PACK_PHASE.moving) {
          if (advance(pack, deltaSeconds, pack.target)) {
            pack.phase = PACK_PHASE.working;
          }

          return;
        }

        if (pack.phase === PACK_PHASE.working) {
          pack.remaining -= deltaSeconds;

          if (pack.remaining <= 0) handOff(pack);

          return;
        }

        if (pack.phase === PACK_PHASE.blocked) handOff(pack);
      });

      dispatch(banks[index]);
    }

    /* 대기 중인 팩을 자기 자리까지 밀어 준다 */
    banks.forEach((bank) => {
      bank.queue.forEach((pack, index) => {
        advance(pack, deltaSeconds, queueSlotDistance(bank, index));
      });
    });

    /* 라인을 빠져나간 팩은 출하된 것으로 보고 걷어낸다 */
    for (let index = packs.length - 1; index >= 0; index -= 1) {
      const pack = packs[index];

      if (pack.phase !== PACK_PHASE.leaving) continue;

      if (advance(pack, deltaSeconds, pathLength)) {
        packs.splice(index, 1);
      }
    }

    /* 첫 공정 대기줄에 자리가 나면 트레이를 새로 올린다 */
    const first = banks[0];

    if (first.queue.length < first.bufferSize) {
      const pack = {
        id: nextPackId,
        distance: 0,
        phase: PACK_PHASE.waiting,
        bankIndex: 0,
        server: null,
        target: 0,
        remaining: 0,
      };

      nextPackId += 1;
      packs.push(pack);
      first.queue.push(pack);
      dispatch(first);
    }
  }

  function update(deltaSeconds) {
    let remaining = Math.max(deltaSeconds, 0);

    while (remaining > 0) {
      const slice = Math.min(remaining, MAX_STEP_SECONDS);

      step(slice);
      remaining -= slice;
    }
  }

  return {
    update,

    /*
     * 라인을 미리 돌려 정상 상태로 만든다.
     * 화면을 열자마자 병목 앞에 팩이 쌓여 있어야 한눈에 읽힌다.
     */
    warmUp(seconds) {
      update(seconds);
    },

    getPacks() {
      return packs.map((pack) => ({
        id: pack.id,
        distance: pack.distance,
        phase: pack.phase,
        bankIndex: pack.bankIndex,
        stationId: pack.server?.id ?? null,
      }));
    },

    getBanks() {
      return banks.map((bank) => ({
        type: bank.type,
        entryDistance: bank.entryDistance,
        bufferSize: bank.bufferSize,
        queueLength: bank.queue.length,
        servers: bank.servers.map((server) => ({
          id: server.id,
          available: server.available,
          busy: server.pack !== null,
        })),
      }));
    },

    getPackCount() {
      return packs.length;
    },
  };
}
