import * as THREE from "three";

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
