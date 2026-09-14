import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

import {
  LOGISTICS_CAMPUS_LOOP,
  LOGISTICS_YARD,
} from "../src/config/logisticsYardConfig.js";
import { LOGISTICS_CENTER } from "../src/config/buildingConfig.js";
import { SITE } from "../src/config/siteConfig.js";
import { LOGISTICS_TRUCK_OPERATIONS } from "../src/data/logisticsOperationData.js";
import {
  createLogisticsOperationController,
  createLogisticsRoute,
} from "../src/animations/logisticsOperationController.js";

test("출차 트럭은 외곽 순환도로 한 바퀴를 돌고 대기열로 복귀한다", () => {
  const route = createLogisticsRoute(
    LOGISTICS_TRUCK_OPERATIONS[0],
  );

  const roadInset = SITE.roadWidth / 2 + 16;
  const roadX = SITE.width / 2 - roadInset;
  const roadZ = SITE.depth / 2 - roadInset;

  assert.equal(
    LOGISTICS_CAMPUS_LOOP.eastX,
    roadX - LOGISTICS_CENTER.position[0],
  );
  assert.equal(
    LOGISTICS_CAMPUS_LOOP.westX,
    -roadX - LOGISTICS_CENTER.position[0],
  );
  /*
   * 부지가 원점 대칭이 아니므로 남·북 도로는
   * 부지 중심(SITE.centerZ)을 기준으로 잡힌다.
   */
  assert.equal(
    LOGISTICS_CAMPUS_LOOP.northZ,
    SITE.centerZ - roadZ - LOGISTICS_CENTER.position[2],
  );
  assert.equal(
    LOGISTICS_CAMPUS_LOOP.southZ,
    SITE.centerZ + roadZ - LOGISTICS_CENTER.position[2],
  );

  const exitTarget = route.departing.at(-1).target;
  const firstLoopTarget = route.circulating[0].target;
  const beforeExitTarget = route.departing.at(-2).target;
  const loopTargets = route.circulating.map(
    (leg) => leg.target,
  );
  /*
   * 마지막 두 경유점은 대기열 정차 줄로 붙는 구간이라
   * 순환도로 범위 검사에서 제외한다.
   */
  const roadTargets = loopTargets.slice(0, -2);

  assert.deepEqual(exitTarget, {
    x: LOGISTICS_CAMPUS_LOOP.eastX,
    z:
      LOGISTICS_YARD.exitLaneZ -
      LOGISTICS_CAMPUS_LOOP.cornerRadius,
  });

  /*
   * 출구에서 첫 순환 경유점으로 갈 때 진행 벡터의 내적이 양수면
   * 기존처럼 역방향 U턴하지 않고 전진하며 회전한다.
   */
  const exitDirection = {
    x: exitTarget.x - beforeExitTarget.x,
    z: exitTarget.z - beforeExitTarget.z,
  };
  const mergeDirection = {
    x: firstLoopTarget.x - exitTarget.x,
    z: firstLoopTarget.z - exitTarget.z,
  };

  assert.ok(
    exitDirection.x * mergeDirection.x +
      exitDirection.z * mergeDirection.z >
      0,
  );

  const completePath = [
    {
      x: route.docking.at(-1).target.x,
      z: LOGISTICS_YARD.dockZ,
    },
    ...route.departing.map((leg) => leg.target),
    ...loopTargets,
  ];

  const turnAngles = [];

  for (let index = 1; index < completePath.length - 1; index += 1) {
    const previous = completePath[index - 1];
    const current = completePath[index];
    const next = completePath[index + 1];
    const incoming = {
      x: current.x - previous.x,
      z: current.z - previous.z,
    };
    const outgoing = {
      x: next.x - current.x,
      z: next.z - current.z,
    };
    const incomingLength = Math.hypot(incoming.x, incoming.z);
    const outgoingLength = Math.hypot(outgoing.x, outgoing.z);

    if (incomingLength === 0 || outgoingLength === 0) {
      continue;
    }

    const cosine = Math.min(
      1,
      Math.max(
        -1,
        (incoming.x * outgoing.x + incoming.z * outgoing.z) /
          (incomingLength * outgoingLength),
      ),
    );

    turnAngles.push(Math.acos(cosine));
  }

  assert.ok(Math.max(...turnAngles) < Math.PI / 2);

  assert.equal(
    Math.min(...roadTargets.map((target) => target.x)),
    LOGISTICS_CAMPUS_LOOP.westX,
  );
  assert.equal(
    Math.max(...roadTargets.map((target) => target.x)),
    LOGISTICS_CAMPUS_LOOP.eastX,
  );
  assert.equal(
    Math.min(...roadTargets.map((target) => target.z)),
    LOGISTICS_CAMPUS_LOOP.northZ,
  );
  assert.equal(
    Math.max(...roadTargets.map((target) => target.z)),
    LOGISTICS_CAMPUS_LOOP.southZ,
  );
  assert.deepEqual(loopTargets.at(-1), route.standby);
});

test("순환 트럭은 대기열 꼬리 쪽에서 합류한다", () => {
  /*
   * 대기열은 정문에서 서쪽으로 늘어서므로, 복귀 구간은
   * 서쪽에서 동쪽으로 달려 꼬리 방향에서 합류해야 한다.
   * 반대로 돌면 대기 중인 트럭을 정면으로 마주 본다.
   */
  LOGISTICS_TRUCK_OPERATIONS.forEach((plan) => {
    const route = createLogisticsRoute(plan);
    const exitTarget = route.departing.at(-1).target;
    const firstLoopTarget = route.circulating[0].target;
    const approachTarget = route.circulating.at(-3).target;
    const entryTarget = route.circulating.at(-2).target;
    const arrivalTarget = route.circulating.at(-1).target;

    /*
     * 출차 게이트를 나오면 동측 순환도로를 북쪽으로 거슬러 오른다.
     */
    assert.equal(exitTarget.x, LOGISTICS_CAMPUS_LOOP.eastX);
    assert.equal(firstLoopTarget.x, LOGISTICS_CAMPUS_LOOP.eastX);
    assert.ok(firstLoopTarget.z < exitTarget.z);

    /*
     * 마지막 구간은 정차 줄 반대편 차선을 타고 동쪽으로 달리다가
     * 자기 슬롯에서만 정차 줄로 붙고, 마지막 한 칸은 곧게 들어간다.
     */
    assert.ok(approachTarget.x < entryTarget.x);
    assert.ok(entryTarget.x < arrivalTarget.x);
    assert.equal(approachTarget.z, LOGISTICS_YARD.standbyLaneZ);
    assert.equal(entryTarget.z, LOGISTICS_YARD.standbyZ);
    assert.equal(arrivalTarget.z, LOGISTICS_YARD.standbyZ);
    assert.ok(
      LOGISTICS_YARD.standbyLaneZ < LOGISTICS_CAMPUS_LOOP.southZ,
    );
    assert.ok(
      LOGISTICS_YARD.standbyZ > LOGISTICS_CAMPUS_LOOP.southZ,
    );
  });
});

test("트럭들은 한 주기 내내 서로 겹치지 않는다", () => {
  /*
   * 대기열을 지나가는 트럭이 앞 순번 자리를 밟지 않는지
   * 실제 주행으로 확인한다. 상·하차 시간이 달라 순번이 어긋난
   * 뒤에도 최소 차간거리가 차체 폭보다 넓게 유지돼야 한다.
   */
  const root = new THREE.Group();
  const trucks = LOGISTICS_TRUCK_OPERATIONS.map((plan) => {
    const truck = new THREE.Group();

    truck.userData.equipmentId = plan.truckId;
    root.add(truck);

    return truck;
  });

  const controller = createLogisticsOperationController({ root });

  let closest = Infinity;

  for (let step = 0; step < 16000; step += 1) {
    controller.update(0.05);

    for (let a = 0; a < trucks.length; a += 1) {
      for (let b = a + 1; b < trucks.length; b += 1) {
        closest = Math.min(
          closest,
          Math.hypot(
            trucks[a].position.x - trucks[b].position.x,
            trucks[a].position.z - trucks[b].position.z,
          ),
        );
      }
    }
  }

  assert.ok(
    closest > 14,
    `트럭 간 최소 거리가 너무 가깝습니다: ${closest.toFixed(1)}`,
  );

  controller.destroy();
});

test("순환 운행을 마친 트럭은 숨김이나 순간이동 없이 대기 상태가 된다", () => {
  const plan = LOGISTICS_TRUCK_OPERATIONS[0];
  const root = new THREE.Group();
  const truck = new THREE.Group();

  truck.userData.equipmentId = plan.truckId;
  root.add(truck);

  const controller = createLogisticsOperationController({
    root,
    plans: [plan],
  });

  let sawCirculating = false;
  let state = controller.getTruckState(plan.truckId);

  for (let index = 0; index < 6000; index += 1) {
    controller.update(0.05);
    state = controller.getTruckState(plan.truckId);

    if (state.stage === "circulating") {
      sawCirculating = true;
    }

    if (state.cycleCount >= 1) {
      break;
    }
  }

  const route = createLogisticsRoute(plan);

  assert.equal(sawCirculating, true);
  assert.equal(state.cycleCount, 1);
  assert.equal(state.stage, "standby");
  assert.equal(truck.visible, true);
  assert.equal(truck.position.x, route.standby.x);
  assert.equal(truck.position.z, route.standby.z);

  controller.destroy();
});
