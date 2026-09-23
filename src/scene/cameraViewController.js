import * as THREE from "three";

/*
 * 이 시점에서 우클릭 평행 이동을 화면 기준으로 해야 하는지 판단한다.
 *
 * 2D 평면 시점은 카메라가 수직으로 내려다보느라 camera.up 이 수평이다.
 * 이때 지면 기준 패닝(screenSpacePanning = false)을 쓰면 OrbitControls 가
 * 세로 드래그 방향을 up × right = 월드 Y축으로 계산해,
 * 카메라가 위아래로 밀리면서 확대/축소처럼 보인다.
 *
 * up 이 수직이 아니면 화면 기준 패닝으로 바꿔 지면 위를 훑게 한다.
 */
export function needsScreenSpacePanning(viewpoint) {
  const up = viewpoint?.up ?? [0, 1, 0];

  return Math.abs(up[1] ?? 1) < 0.5;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value ** 3
    : 1 - ((-2 * value + 2) ** 3) / 2;
}

export function createCameraViewController({
  camera,
  controls,
  viewpoints,
  duration = 0.8,
  onViewChange,
}) {
  const viewpointMap = new Map(
    viewpoints.map((viewpoint) => [viewpoint.id, viewpoint]),
  );
  const startPosition = new THREE.Vector3();
  const startTarget = new THREE.Vector3();
  const endPosition = new THREE.Vector3();
  const endTarget = new THREE.Vector3();
  const startUp = new THREE.Vector3();
  const endUp = new THREE.Vector3();
  const defaultFov = camera.fov;

  let activeViewId = null;
  let elapsed = 0;
  let transitioning = false;
  let previousDampingEnabled = controls.enableDamping;
  let startFov = defaultFov;
  let endFov = defaultFov;

  function finishTransition() {
    camera.position.copy(endPosition);
    controls.target.copy(endTarget);
    camera.up.copy(endUp);
    camera.fov = endFov;
    camera.updateProjectionMatrix();
    camera.lookAt(controls.target);
    transitioning = false;
    controls.enabled = true;
    controls.enableDamping = previousDampingEnabled;
  }

  function moveTo(viewId, { instant = false } = {}) {
    const viewpoint = viewpointMap.get(viewId);

    if (!viewpoint) {
      throw new Error(`등록되지 않은 단지 시점입니다: ${viewId}`);
    }

    startPosition.copy(camera.position);
    startTarget.copy(controls.target);
    startUp.copy(camera.up);
    endPosition.fromArray(viewpoint.position);
    endTarget.fromArray(viewpoint.target);
    endUp.fromArray(viewpoint.up ?? [0, 1, 0]);
    startFov = camera.fov;
    endFov = viewpoint.fov ?? defaultFov;
    activeViewId = viewId;
    elapsed = 0;

    /*
     * 패닝 기준은 camera.up 과 함께 바뀌어야 한다.
     * 전환 중에는 controls 가 꺼져 있어 지금 정해 두면 된다.
     */
    controls.screenSpacePanning = needsScreenSpacePanning(viewpoint);

    onViewChange?.(viewpoint);

    if (instant || duration <= 0) {
      finishTransition();
      return;
    }

    if (!transitioning) {
      previousDampingEnabled = controls.enableDamping;
    }

    controls.enableDamping = false;
    controls.enabled = false;
    transitioning = true;
  }

  return {
    moveTo,

    isTransitioning() {
      return transitioning;
    },

    getActiveViewId() {
      return activeViewId;
    },

    update(deltaSeconds) {
      if (!transitioning) return;

      elapsed += Math.min(deltaSeconds, 0.05);
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      camera.position.lerpVectors(
        startPosition,
        endPosition,
        easedProgress,
      );
      controls.target.lerpVectors(
        startTarget,
        endTarget,
        easedProgress,
      );
      camera.up
        .lerpVectors(
          startUp,
          endUp,
          easedProgress,
        )
        .normalize();
      camera.fov = THREE.MathUtils.lerp(
        startFov,
        endFov,
        easedProgress,
      );
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      camera.updateMatrixWorld(true);

      if (progress >= 1) finishTransition();
    },

    destroy() {
      transitioning = false;
      controls.enabled = true;
      controls.enableDamping = previousDampingEnabled;
    },
  };
}
