import * as THREE from "three";

import {
  LOGISTICS_CAMPUS_LOOP,
  LOGISTICS_YARD,
  getDockX,
} from "../config/logisticsYardConfig.js";

import {
  LOGISTICS_STAGES,
  LOGISTICS_HANDLING_LABEL,
  LOGISTICS_TRUCK_OPERATIONS,
} from "../data/logisticsOperationData.js";

import {
  getLogisticsEquipmentById,
} from "../data/logisticsEquipmentData.js";

/*
 * 한 프레임에 반영할 수 있는 최대 시간.
 * 탭을 다시 열었을 때 트럭이 순간이동하는 것을 막는다.
 */
const MAX_DELTA_SECONDS = 0.05;

/*
 * 회전 속도(라디안/초).
 * 코너에서 차체가 진행 방향으로 서서히 돌아간다.
 */
const TURN_RATE = 2.4;

/*
 * 도착 판정 거리
 */
const ARRIVAL_EPSILON = 0.05;

function formatClock(time) {
  if (!time) {
    return null;
  }

  return time.toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/*
 * 트럭 한 대의 전체 주행 경로.
 *
 *   정문 → 대기 위치 → 배정 도크 → 출차 게이트
 *   → 단지 외곽 순환도로 한 바퀴(동 → 북 → 서 → 남)
 *   → 정문 밖 대기열
 */
export function createLogisticsRoute(plan) {
  const dockX = getDockX(plan.dockNumber);
  const waitX = dockX + LOGISTICS_YARD.waitOffsetX;
  const dockLabel = `${plan.dockNumber}번 도크`;
  const loopSpeed =
    plan.driveSpeed * LOGISTICS_CAMPUS_LOOP.speedMultiplier;
  const {
    eastX,
    westX,
    northZ,
    southZ,
    cornerRadius,
  } = LOGISTICS_CAMPUS_LOOP;

  const createLoopLeg = (x, z, zone) => ({
    target: { x, z },
    speed: loopSpeed,
    zone,
  });

  const standby = {
    x:
      LOGISTICS_YARD.entryGateX -
      plan.standbySlot * LOGISTICS_YARD.standbySpacingX,
    z: LOGISTICS_YARD.standbyZ,
  };

  return {
    standby,
    standbyZone: "정문 밖 배차 대기열",
    waitZone: `${dockLabel} 대기 구역`,
    dockZone: `${dockLabel} 접안`,

    approaching: [
      {
        target: {
          x: Math.min(
            standby.x + LOGISTICS_YARD.standbyMergeX,
            LOGISTICS_YARD.entryGateX,
          ),
          z: LOGISTICS_YARD.standbyLaneZ,
        },
        speed: plan.driveSpeed,
        zone: "대기열 출발",
      },
      {
        target: {
          x: LOGISTICS_YARD.entryGateX,
          z: LOGISTICS_YARD.standbyLaneZ,
        },
        speed: plan.driveSpeed,
        zone: "정문 진입로",
      },
      {
        target: {
          x: LOGISTICS_YARD.entryGateX,
          z: LOGISTICS_YARD.gateZ,
        },
        speed: plan.driveSpeed,
        zone: "구내 정문 통과",
        gateIn: true,
      },
      {
        target: {
          x: LOGISTICS_YARD.entryGateX,
          z: LOGISTICS_YARD.entryLaneZ,
        },
        speed: plan.driveSpeed,
        zone: "야드 입차 레인",
      },
      {
        target: {
          x: waitX,
          z: LOGISTICS_YARD.entryLaneZ,
        },
        speed: plan.driveSpeed,
        zone: `${dockLabel} 대기 구역 이동`,
      },
    ],

    docking: [
      {
        target: {
          x: dockX,
          z: LOGISTICS_YARD.entryLaneZ,
        },
        speed: plan.dockingSpeed * 1.6,
        zone: `${dockLabel} 정렬`,
      },
      {
        target: {
          x: dockX,
          z: LOGISTICS_YARD.dockZ,
        },
        speed: plan.dockingSpeed,
        reverse: true,
        zone: `${dockLabel} 후진 접안`,
      },
    ],

    departing: [
      {
        target: {
          x: dockX,
          z: LOGISTICS_YARD.exitLaneZ - cornerRadius,
        },
        speed: plan.dockingSpeed * 1.6,
        zone: `${dockLabel} 출발`,
      },
      {
        target: {
          x: dockX + cornerRadius * 0.25,
          z: LOGISTICS_YARD.exitLaneZ - cornerRadius * 0.25,
        },
        speed: plan.dockingSpeed * 1.6,
        zone: `${dockLabel} 출차 레인 합류`,
      },
      {
        target: {
          x: dockX + cornerRadius,
          z: LOGISTICS_YARD.exitLaneZ,
        },
        speed: plan.dockingSpeed * 1.6,
        zone: `${dockLabel} 출차 레인 합류`,
      },
      {
        target: {
          x: LOGISTICS_YARD.exitGateX - cornerRadius,
          z: LOGISTICS_YARD.exitLaneZ,
        },
        speed: plan.driveSpeed,
        zone: "야드 출차 레인",
      },
      {
        target: {
          x: LOGISTICS_YARD.exitGateX,
          z: LOGISTICS_YARD.exitLaneZ,
        },
        speed: plan.driveSpeed,
        zone: "출차 게이트 통과",
        gateOut: true,
      },
      {
        target: {
          x: eastX - cornerRadius * 0.25,
          z: LOGISTICS_YARD.exitLaneZ - cornerRadius * 0.25,
        },
        speed: plan.driveSpeed,
        zone: "단지 동측 순환도로 합류",
      },
      {
        target: {
          x: eastX,
          z: LOGISTICS_YARD.exitLaneZ - cornerRadius,
        },
        speed: plan.driveSpeed,
        zone: "단지 동측 순환도로 진입",
      },
    ],

    /*
     * 출차 게이트에서 동측도로로 좌회전해 북상한 뒤
     * 동 → 북 → 서 → 남 순서로 외곽을 한 바퀴 돈다.
     * 각 모서리에는 회전 반경을 둬 직각 이동과 U턴을 피한다.
     *
     * 대기열은 정문 서쪽으로 늘어서므로 마지막 남측 구간은
     * 서쪽에서 동쪽으로 달려 대기열 꼬리 방향에서 합류한다.
     * 반대로 돌면 대기 중인 트럭을 정면으로 통과하게 된다.
     */
    circulating: [
      createLoopLeg(
        eastX,
        northZ + cornerRadius,
        "단지 동측 순환도로",
      ),
      createLoopLeg(
        eastX - cornerRadius * 0.25,
        northZ + cornerRadius * 0.25,
        "단지 북동측 회전 구간",
      ),
      createLoopLeg(
        eastX - cornerRadius,
        northZ,
        "단지 북측 순환도로",
      ),
      createLoopLeg(
        westX + cornerRadius,
        northZ,
        "단지 북측 순환도로",
      ),
      createLoopLeg(
        westX + cornerRadius * 0.25,
        northZ + cornerRadius * 0.25,
        "단지 북서측 회전 구간",
      ),
      createLoopLeg(
        westX,
        northZ + cornerRadius,
        "단지 서측 순환도로",
      ),
      createLoopLeg(
        westX,
        southZ - cornerRadius,
        "단지 서측 순환도로",
      ),
      createLoopLeg(
        westX + cornerRadius * 0.25,
        southZ - cornerRadius * 0.25,
        "단지 남서측 회전 구간",
      ),
      createLoopLeg(
        westX + cornerRadius,
        southZ,
        "단지 남측 순환도로",
      ),
      createLoopLeg(
        standby.x - LOGISTICS_YARD.standbyMergeX,
        LOGISTICS_YARD.standbyLaneZ,
        "대기열 주행 차선",
      ),
      /*
       * 정차 줄에 비스듬히 붙은 뒤 마지막 한 칸은 곧게 들어간다.
       * 정차 방향과 진행 방향이 같아야 차체가 튀지 않는다.
       */
      {
        target: {
          x: standby.x - LOGISTICS_YARD.standbySpacingX / 4,
          z: standby.z,
        },
        speed: plan.driveSpeed,
        zone: "대기열 진입",
      },
      {
        target: {
          x: standby.x,
          z: standby.z,
        },
        speed: plan.driveSpeed,
        zone: "물류센터 배차 대기열 복귀",
      },
    ],
  };
}

function findTruckObject(root, truckId) {
  let found = null;

  root.traverse((object) => {
    if (found) return;
    if (object.userData.equipmentId === truckId) {
      found = object;
    }
  });

  return found;
}

function createTruckState(plan, root) {
  const object = findTruckObject(root, plan.truckId);

  if (!object) {
    throw new Error(
      `물류 트럭 오브젝트를 찾을 수 없습니다: ${plan.truckId}`,
    );
  }

  if (!getLogisticsEquipmentById(plan.truckId)) {
    throw new Error(
      `물류 트럭 설비 데이터를 찾을 수 없습니다: ${plan.truckId}`,
    );
  }

  return {
    plan,
    object,
    route: createLogisticsRoute(plan),
    groundY: object.position.y,

    stageId: "standby",
    stageTimer: 0,
    legIndex: 0,
    progress: 0,

    statusOverride: null,
    stageLabelOverride: null,
    dockLabelOverride: null,
    alertOverride: null,
    zone: "정문 밖 배차 대기열",

    holdRemaining: 0,
    holdDone: false,

    gateInAt: null,
    dockedAt: null,
    gateOutAt: null,
    cycleCount: 0,
  };
}

export function createLogisticsOperationController({
  root,
  plans = LOGISTICS_TRUCK_OPERATIONS,
}) {
  if (!root) {
    throw new Error("트럭이 속한 물류센터 그룹이 필요합니다.");
  }

  const states = plans.map(
    (plan) => createTruckState(plan, root),
  );

  const stateByTruckId = new Map(
    states.map((state) => [state.plan.truckId, state]),
  );

  const stateByDockId = new Map(
    states.map((state) => [state.plan.dockId, state]),
  );

  const worldPosition = new THREE.Vector3();

  /*
   * 야드 차선은 한 번에 한 대만 사용한다.
   * 주행 중인 트럭이 없을 때만 다음 트럭이 진입·출차할 수 있다.
   */
  let laneOwnerId = null;

  function isLaneFree(state) {
    return (
      laneOwnerId === null ||
      laneOwnerId === state.plan.truckId
    );
  }

  function acquireLane(state) {
    laneOwnerId = state.plan.truckId;
  }

  function releaseLane(state) {
    if (laneOwnerId === state.plan.truckId) {
      laneOwnerId = null;
    }
  }

  function handlingLabel(state) {
    return (
      LOGISTICS_HANDLING_LABEL[state.plan.direction] ??
      LOGISTICS_HANDLING_LABEL.outbound
    );
  }

  function enterStage(state, stageId) {
    state.stageId = stageId;
    state.stageTimer = 0;
    state.legIndex = 0;
    state.statusOverride = null;
    state.stageLabelOverride = null;
    state.dockLabelOverride = null;
    state.alertOverride = null;
  }

  function moveToStandby(state) {
    const { standby } = state.route;

    state.object.position.set(
      standby.x,
      state.groundY,
      standby.z,
    );

    /*
     * 대기열에서는 정문 방향(+x)을 보고 선다.
     */
    state.object.rotation.y = Math.PI / 2;
    state.object.visible = true;
    state.progress = 0;
    state.holdRemaining = 0;
    state.holdDone = false;
    state.gateInAt = null;
    state.dockedAt = null;
    state.gateOutAt = null;
    state.zone = state.route.standbyZone;

    enterStage(state, "standby");
  }

  function currentLegs(state) {
    return state.route[state.stageId] ?? null;
  }

  /*
   * 차체를 진행 방향으로 서서히 돌린다.
   * 후진 구간에서는 진행 방향의 반대를 바라본다.
   */
  function rotateToward(state, directionX, directionZ, deltaSeconds) {
    if (directionX === 0 && directionZ === 0) {
      return;
    }

    const targetAngle = Math.atan2(directionX, directionZ);
    const difference =
      THREE.MathUtils.euclideanModulo(
        targetAngle - state.object.rotation.y + Math.PI,
        Math.PI * 2,
      ) - Math.PI;

    const maxStep = TURN_RATE * deltaSeconds;

    state.object.rotation.y += THREE.MathUtils.clamp(
      difference,
      -maxStep,
      maxStep,
    );
  }

  /*
   * 현재 구간을 따라 이동한다.
   * 구간 끝에 닿으면 true를 돌려준다.
   */
  function followLegs(state, deltaSeconds) {
    const legs = currentLegs(state);

    if (!legs) {
      return true;
    }

    let remaining = deltaSeconds;

    while (remaining > 0 && state.legIndex < legs.length) {
      const leg = legs[state.legIndex];
      const deltaX = leg.target.x - state.object.position.x;
      const deltaZ = leg.target.z - state.object.position.z;
      const distance = Math.hypot(deltaX, deltaZ);

      state.zone = leg.zone;

      if (distance <= ARRIVAL_EPSILON) {
        state.object.position.x = leg.target.x;
        state.object.position.z = leg.target.z;

        if (leg.gateIn && !state.gateInAt) {
          state.gateInAt = new Date();
        }

        if (leg.gateOut && !state.gateOutAt) {
          state.gateOutAt = new Date();
        }

        state.legIndex += 1;
        continue;
      }

      const directionX = deltaX / distance;
      const directionZ = deltaZ / distance;

      rotateToward(
        state,
        leg.reverse ? -directionX : directionX,
        leg.reverse ? -directionZ : directionZ,
        remaining,
      );

      const step = leg.speed * remaining;

      if (step >= distance) {
        state.object.position.x = leg.target.x;
        state.object.position.z = leg.target.z;
        remaining -= distance / leg.speed;
        continue;
      }

      state.object.position.x += directionX * step;
      state.object.position.z += directionZ * step;
      remaining = 0;
    }

    return state.legIndex >= legs.length;
  }

  function updateStandby(state) {
    const waitTarget =
      state.cycleCount === 0
        ? state.plan.dispatchDelay
        : state.plan.standbyDuration;

    if (state.stageTimer < waitTarget) {
      return;
    }

    if (!isLaneFree(state)) {
      state.stageLabelOverride = "구내 진입 순번 대기";
      return;
    }

    acquireLane(state);
    enterStage(state, "approaching");
  }

  function updateApproaching(state, deltaSeconds) {
    if (followLegs(state, deltaSeconds)) {
      enterStage(state, "waiting");
      state.zone = state.route.waitZone;
    }
  }

  function updateWaiting(state) {
    if (state.stageTimer < state.plan.waitDuration) {
      return;
    }

    enterStage(state, "docking");
  }

  function updateDocking(state, deltaSeconds) {
    if (!followLegs(state, deltaSeconds)) {
      return;
    }

    enterStage(state, "handling");
    state.zone = state.route.dockZone;
    state.dockedAt = new Date();
    state.progress = 0;

    /*
     * 접안을 마치면 차선을 비워 다음 트럭이 들어올 수 있게 한다.
     */
    releaseLane(state);
  }

  function updateHandling(state, deltaSeconds) {
    const { inspectionHold } = state.plan;

    if (state.holdRemaining > 0) {
      state.holdRemaining -= deltaSeconds;
      state.statusOverride = "warning";
      state.stageLabelOverride = inspectionHold.label;
      state.dockLabelOverride = inspectionHold.label;
      state.alertOverride = inspectionHold.alert;
      return;
    }

    state.statusOverride = null;
    state.stageLabelOverride = null;
    state.dockLabelOverride = null;
    state.alertOverride = null;

    if (state.progress < 100) {
      state.progress = Math.min(
        100,
        state.progress +
          (100 / state.plan.handlingDuration) * deltaSeconds,
      );

      if (
        inspectionHold &&
        !state.holdDone &&
        state.progress >= inspectionHold.atProgress
      ) {
        state.progress = inspectionHold.atProgress;
        state.holdRemaining = inspectionHold.duration;
        state.holdDone = true;
      }

      return;
    }

    /*
     * 작업을 마쳐도 야드 차선이 비어야 출차할 수 있다.
     */
    if (!isLaneFree(state)) {
      state.stageLabelOverride = "출차 대기";
      state.dockLabelOverride = "출차 대기";
      return;
    }

    acquireLane(state);
    enterStage(state, "departing");
  }

  function updateDeparting(state, deltaSeconds) {
    if (!followLegs(state, deltaSeconds)) {
      return;
    }

    releaseLane(state);
    enterStage(state, "circulating");
  }

  function updateCirculating(state, deltaSeconds) {
    if (!followLegs(state, deltaSeconds)) {
      return;
    }

    state.cycleCount += 1;
    moveToStandby(state);
  }

  const STAGE_UPDATERS = {
    standby: updateStandby,
    approaching: updateApproaching,
    waiting: updateWaiting,
    docking: updateDocking,
    handling: updateHandling,
    departing: updateDeparting,
    circulating: updateCirculating,
  };

  function update(deltaSeconds) {
    const safeDeltaSeconds = Math.min(
      Math.max(deltaSeconds, 0),
      MAX_DELTA_SECONDS,
    );

    if (safeDeltaSeconds === 0) {
      return;
    }

    /*
     * 차선을 기다리는 트럭이 여럿이면
     * 가장 오래 기다린 트럭에게 순번을 준다.
     */
    states.sort(
      (left, right) => right.stageTimer - left.stageTimer,
    );

    states.forEach((state) => {
      state.stageTimer += safeDeltaSeconds;

      STAGE_UPDATERS[state.stageId]?.(
        state,
        safeDeltaSeconds,
      );
    });
  }

  /*
   * 아래부터는 상세정보 UI가 읽어가는 현재 상태다.
   */
  function getStageView(state) {
    const stage =
      LOGISTICS_STAGES[state.stageId] ??
      LOGISTICS_STAGES.standby;

    const handling = handlingLabel(state);
    const isHandling = state.stageId === "handling";

    return {
      stage,
      status: state.statusOverride ?? stage.status,
      dockStatus: state.statusOverride ?? stage.dockStatus,
      truckLabel:
        state.stageLabelOverride ??
        (isHandling ? handling.truck : stage.label),
      dockLabel:
        state.dockLabelOverride ??
        (isHandling ? handling.dock : stage.dockLabel),
      alert: state.alertOverride ?? stage.alert,
    };
  }

  function getTruckState(truckId) {
    const state = stateByTruckId.get(truckId);

    if (!state) {
      return null;
    }

    const view = getStageView(state);
    const progress = Math.round(state.progress);

    state.object.getWorldPosition(worldPosition);

    return {
      truckId,
      dockId: state.plan.dockId,
      dockNumber: state.plan.dockNumber,
      direction: state.plan.direction,
      stage: state.stageId,
      stageLabel: view.truckLabel,
      dockStageLabel: view.dockLabel,
      status: view.status,
      dockStatus: view.dockStatus,
      alert: view.alert,
      progress,
      zone: state.zone,
      isDocked:
        state.stageId === "handling" ||
        state.stageId === "docking",
      isInbound:
        state.stageId === "approaching" ||
        state.stageId === "waiting",
      arrivalAt: formatClock(state.gateInAt),
      dockedAt: formatClock(state.dockedAt),
      departureAt: formatClock(state.gateOutAt),
      cycleCount: state.cycleCount,
      position: {
        x: Math.round(worldPosition.x),
        z: Math.round(worldPosition.z),
      },
    };
  }

  /*
   * 단지 관제 패널이 설비 상태를 덮어쓸 때 사용한다.
   * 운행 데이터가 없는 설비면 null을 돌려준다.
   */
  function getLiveStatus(equipmentId) {
    const truckState = stateByTruckId.get(equipmentId);

    if (truckState) {
      return getStageView(truckState).status;
    }

    const dockState = stateByDockId.get(equipmentId);

    if (dockState) {
      return getStageView(dockState).dockStatus;
    }

    return null;
  }

  /*
   * 상·하차 작업 중인 트럭, 구내를 주행 중인 트럭,
   * 차량이 붙어 있는 도크 수
   */
  function getLogisticsSummary() {
    let handlingTrucks = 0;
    let movingTrucks = 0;
    let occupiedDocks = 0;

    states.forEach((state) => {
      if (state.stageId === "handling") {
        handlingTrucks += 1;
        occupiedDocks += 1;
        return;
      }

      if (state.stageId === "docking") {
        movingTrucks += 1;
        occupiedDocks += 1;
        return;
      }

      if (state.stageId !== "standby") {
        movingTrucks += 1;
      }
    });

    return {
      handlingTrucks,
      movingTrucks,
      occupiedDocks,
    };
  }

  function getDockState(dockId) {
    const state = stateByDockId.get(dockId);

    if (!state) {
      return null;
    }

    return getTruckState(state.plan.truckId);
  }

  function createLiveTruckEquipment(base, truckState) {
    const quantity = base.logistics.quantity ?? 0;

    const handled = Math.round(
      (quantity * truckState.progress) / 100,
    );

    const positionLabel =
      `X ${truckState.position.x.toLocaleString("ko-KR")} · ` +
      `Z ${truckState.position.z.toLocaleString("ko-KR")}`;

    return {
      ...base,
      status: truckState.status,
      location: `자재·출하 물류센터 · ${truckState.zone}`,

      metrics: [
        {
          label: "차량 온도",
          value: base.temperature,
          unit: "°C",
        },
        {
          label: "상·하차 진행률",
          value: truckState.progress,
          unit: "%",
          emphasis: truckState.stage === "handling",
        },
        {
          label: "처리 수량",
          value: handled,
          unit: `/${quantity} EA`,
        },
        {
          label: "배정 도크",
          value: base.logistics.dockLabel,
          unit: "",
        },
      ],

      production: {
        ...base.production,
        completed: handled,
        cycleTime: truckState.departureAt ?? "출차 전",
      },

      alert: truckState.alert,

      logistics: {
        ...base.logistics,
        stage: truckState.stage,
        stageLabel: truckState.stageLabel,
        loadProgress: truckState.progress,
        handled,
        arrivalAt: truckState.arrivalAt,
        departureAt: truckState.departureAt,
        dockedAt: truckState.dockedAt,
        positionLabel,
        cycleCount: truckState.cycleCount,
      },
    };
  }

  function createLiveDockEquipment(base, truckState) {
    const quantity = base.logistics.quantity ?? 0;

    const handled = Math.round(
      (quantity * truckState.progress) / 100,
    );

    const queue = truckState.isInbound ? 1 : 0;

    const vehicleNumber = truckState.isDocked
      ? base.logistics.vehicleNumber
      : "배정 차량 없음";

    return {
      ...base,
      status: truckState.dockStatus,

      metrics: [
        {
          label: "제어반 온도",
          value: base.temperature,
          unit: "°C",
          emphasis: truckState.dockStatus === "warning",
        },
        {
          label: "작업 진행률",
          value: truckState.progress,
          unit: "%",
        },
        {
          label: "대기 차량",
          value: queue,
          unit: "대",
        },
        {
          label: "시간당 처리량",
          value: base.logistics.throughput,
          unit: "PLT/h",
        },
      ],

      production: {
        ...base.production,
        completed: handled,
        cycleTime: truckState.dockStageLabel,
      },

      alert: truckState.alert,

      logistics: {
        ...base.logistics,
        stage: truckState.stage,
        stageLabel: truckState.dockStageLabel,
        progress: truckState.progress,
        handled,
        queue,
        vehicleNumber,
        arrivalAt: truckState.arrivalAt,
        departureAt: truckState.departureAt,
        dockedAt: truckState.dockedAt,
        positionLabel: truckState.isDocked
          ? `X ${truckState.position.x.toLocaleString("ko-KR")} · ` +
            `Z ${truckState.position.z.toLocaleString("ko-KR")}`
          : "접안 차량 없음",
      },
    };
  }

  /*
   * 상세정보 모달이 다시 그릴 때 사용할 실시간 설비 데이터.
   * 운행 중인 트럭·도크가 아니면 null을 돌려준다.
   */
  function createLiveEquipment(equipmentId) {
    const base = getLogisticsEquipmentById(equipmentId);

    if (!base) {
      return null;
    }

    if (base.logistics?.kind === "truck") {
      const truckState = getTruckState(equipmentId);

      return truckState
        ? createLiveTruckEquipment(base, truckState)
        : null;
    }

    const dockState = getDockState(equipmentId);

    return dockState
      ? createLiveDockEquipment(base, dockState)
      : null;
  }

  states.forEach((state) => {
    moveToStandby(state);
  });

  return {
    update,
    getTruckState,
    getDockState,
    getLiveStatus,
    getLogisticsSummary,
    createLiveEquipment,

    destroy() {
      laneOwnerId = null;
      states.length = 0;
      stateByTruckId.clear();
      stateByDockId.clear();
    },
  };
}
