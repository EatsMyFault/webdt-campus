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
  assert.equal(
    LOGISTICS_CAMPUS_LOOP.northZ,
    -roadZ - LOGISTICS_CENTER.position[2],
  );
  assert.equal(
    LOGISTICS_CAMPUS_LOOP.southZ,
    roadZ - LOGISTICS_CENTER.position[2],
  );

  const exitTarget = route.departing.at(-1).target;
  const firstLoopTarget = route.circulating[0].target;
  const beforeExitTarget = route.departing.at(-2).target;
  const loopTargets = route.circulating.map(
    (leg) => leg.target,
  );
  const roadTargets = loopTargets.slice(0, -1);

  assert.deepEqual(exitTarget, {
    x: LOGISTICS_CAMPUS_LOOP.eastX,
    z:
      LOGISTICS_CAMPUS_LOOP.southZ -
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
