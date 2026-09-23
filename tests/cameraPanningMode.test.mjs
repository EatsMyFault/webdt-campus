import assert from "node:assert/strict";
import test from "node:test";

import * as THREE from "three";

import {
  createCameraViewController,
  needsScreenSpacePanning,
} from "../src/scene/cameraViewController.js";

import { SITE_VIEWPOINTS } from "../src/config/viewpointConfig.js";

/*
 * 2D 평면 시점은 카메라를 수직으로 내려 보느라 camera.up 이 수평이다.
 * 그 상태에서 지면 기준 패닝을 쓰면 OrbitControls 가 세로 드래그를
 * 월드 Y축 이동으로 계산해, 우클릭 드래그가 확대/축소처럼 보인다.
 *
 * 그래서 시점을 옮길 때 패닝 기준도 함께 바뀌어야 한다.
 */

/*
 * OrbitControls 가 세로 패닝 방향을 구하는 방식 그대로 계산한다.
 *   screenSpacePanning  → 카메라 up
 *   지면 기준            → object.up × 카메라 right
 */
function verticalPanDirection(upArray, screenSpacePanning) {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);

  camera.up.fromArray(upArray);
  camera.position.set(300, 660, -220);
  camera.lookAt(300, 0, -220);
  camera.updateMatrixWorld(true);

  const direction = new THREE.Vector3();

  if (screenSpacePanning) {
    direction.setFromMatrixColumn(camera.matrix, 1);
  } else {
    direction.setFromMatrixColumn(camera.matrix, 0);
    direction.crossVectors(camera.up, direction);
  }

  return direction.normalize();
}

test("2D 평면 시점은 화면 기준 패닝을 쓴다", () => {
  const topDown = SITE_VIEWPOINTS.filter(
    (viewpoint) => viewpoint.mode === "2d",
  );

  assert.ok(topDown.length > 0, "2D 시점이 하나도 없다");

  topDown.forEach((viewpoint) => {
    assert.ok(
      needsScreenSpacePanning(viewpoint),
      `${viewpoint.id} 가 지면 기준 패닝으로 남아 있다`,
    );
  });
});

test("3D 시점은 지면 기준 패닝을 유지한다", () => {
  SITE_VIEWPOINTS.filter((viewpoint) => viewpoint.mode !== "2d").forEach(
    (viewpoint) => {
      assert.equal(
        needsScreenSpacePanning(viewpoint),
        false,
        `${viewpoint.id} 의 패닝 기준이 바뀌었다`,
      );
    },
  );
});

test("지면 기준 패닝이면 2D 시점에서 세로 드래그가 위아래 이동이 된다", () => {
  /* 고쳐지기 전 동작을 그대로 재현해 둔다 */
  const direction = verticalPanDirection([0, 0, -1], false);

  assert.ok(
    Math.abs(direction.y) > 0.9,
    `세로 패닝이 수평 방향이다: ${direction.toArray()}`,
  );
});

test("화면 기준 패닝이면 2D 시점에서 세로 드래그가 지면을 훑는다", () => {
  const direction = verticalPanDirection([0, 0, -1], true);

  assert.ok(
    Math.abs(direction.y) < 0.001,
    `세로 패닝에 높이 성분이 남았다: ${direction.toArray()}`,
  );
  assert.ok(
    Math.abs(direction.z) > 0.9,
    `세로 패닝이 지면 안에서 움직이지 않는다: ${direction.toArray()}`,
  );
});

test("시점을 옮기면 패닝 기준이 따라 바뀐다", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
  const controls = {
    target: new THREE.Vector3(),
    enableDamping: true,
    enabled: true,
    screenSpacePanning: false,
  };

  const controller = createCameraViewController({
    camera,
    controls,
    viewpoints: SITE_VIEWPOINTS,
    duration: 0,
  });

  const planView = SITE_VIEWPOINTS.find(
    (viewpoint) => viewpoint.mode === "2d",
  );

  controller.moveTo(planView.id, { instant: true });
  assert.equal(controls.screenSpacePanning, true);

  controller.moveTo("campus-overview", { instant: true });
  assert.equal(controls.screenSpacePanning, false);

  controller.destroy();
});
