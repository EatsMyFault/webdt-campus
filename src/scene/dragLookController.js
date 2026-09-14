import * as THREE from "three";

const DRAG_THRESHOLD = 5;
const MIN_POLAR_ANGLE = THREE.MathUtils.degToRad(5);
const MAX_POLAR_ANGLE = THREE.MathUtils.degToRad(175);

/**
 * 3D 화면의 좌클릭 드래그를 자유시점 회전으로 처리한다.
 *
 * OrbitControls의 기본 회전은 target을 중심으로 카메라가 공전한다.
 * 이 컨트롤러는 카메라 위치를 고정하고 target만 회전시켜
 * 언리얼 에디터의 자유 카메라와 비슷하게 동작한다.
 */
export function createDragLookController({
  camera,
  controls,
  domElement,
  sensitivity = 0.004,
  getViewMode = () => "view1",
  is2DView = () => {
    const viewMode = getViewMode();
    return viewMode === "top" || viewMode.endsWith("2d");
  },
  isBlocked = () => false,
  onRotateStart,
  onRotate,
}) {
  if (!domElement) {
    throw new Error("마우스 회전에 사용할 DOM 요소가 필요합니다.");
  }

  const direction = new THREE.Vector3();
  const spherical = new THREE.Spherical();

  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let previousX = 0;
  let previousY = 0;
  let isRotating = false;

  function canRotate() {
    return !is2DView() && !isBlocked();
  }

  function releasePointer(pointerId) {
    if (
      pointerId !== null &&
      domElement.hasPointerCapture?.(pointerId)
    ) {
      domElement.releasePointerCapture(pointerId);
    }

    activePointerId = null;
    isRotating = false;
  }

  function handlePointerDown(event) {
    if (
      event.button !== 0 ||
      activePointerId !== null ||
      !canRotate()
    ) {
      return;
    }

    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    previousX = event.clientX;
    previousY = event.clientY;
    isRotating = false;
    domElement.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;

    if (!canRotate()) {
      releasePointer(event.pointerId);
      return;
    }

    if (!isRotating) {
      const dragDistance = Math.hypot(
        event.clientX - startX,
        event.clientY - startY,
      );

      if (dragDistance <= DRAG_THRESHOLD) return;

      isRotating = true;
      onRotateStart?.();
    }

    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    previousX = event.clientX;
    previousY = event.clientY;

    if (deltaX === 0 && deltaY === 0) return;

    direction.copy(controls.target).sub(camera.position);
    let targetDistance = direction.length();

    if (targetDistance < 0.001) {
      camera.getWorldDirection(direction);
      targetDistance = Math.max(controls.minDistance ?? 4, 4);
      direction.multiplyScalar(targetDistance);
    }

    spherical.setFromVector3(direction);
    spherical.theta -= deltaX * sensitivity;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + deltaY * sensitivity,
      MIN_POLAR_ANGLE,
      MAX_POLAR_ANGLE,
    );

    direction.setFromSpherical(spherical);
    controls.target.copy(camera.position).add(direction);

    camera.up.set(0, 1, 0);
    camera.lookAt(controls.target);
    camera.updateMatrixWorld(true);

    event.preventDefault();
    onRotate?.();
  }

  function handlePointerUp(event) {
    if (event.pointerId === activePointerId) {
      releasePointer(event.pointerId);
    }
  }

  function handlePointerCancel(event) {
    if (event.pointerId === activePointerId) {
      releasePointer(event.pointerId);
    }
  }

  domElement.addEventListener("pointerdown", handlePointerDown);
  domElement.addEventListener("pointermove", handlePointerMove);
  domElement.addEventListener("pointerup", handlePointerUp);
  domElement.addEventListener("pointercancel", handlePointerCancel);

  return {
    isRotating: () => isRotating,

    destroy() {
      releasePointer(activePointerId);
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerup", handlePointerUp);
      domElement.removeEventListener("pointercancel", handlePointerCancel);
    },
  };
}
