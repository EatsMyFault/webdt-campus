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

  assert.equal(
    route.departing.at(-1).target.z,
    LOGISTICS_YARD.offsiteZ,
  );
  assert.deepEqual(
    route.circulating.map((leg) => leg.target),
    [
      {
        x: LOGISTICS_CAMPUS_LOOP.eastX,
        z: LOGISTICS_CAMPUS_LOOP.southZ,
      },
      {
        x: LOGISTICS_CAMPUS_LOOP.eastX,
        z: LOGISTICS_CAMPUS_LOOP.northZ,
      },
      {
        x: LOGISTICS_CAMPUS_LOOP.westX,
        z: LOGISTICS_CAMPUS_LOOP.northZ,
      },
      {
        x: LOGISTICS_CAMPUS_LOOP.westX,
        z: LOGISTICS_CAMPUS_LOOP.southZ,
      },
      route.standby,
    ],
  );
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
