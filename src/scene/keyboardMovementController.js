import * as THREE from "three";

const MOVEMENT_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ShiftLeft",
  "ShiftRight",
]);

function isEditableElement(element) {
  return (
    element instanceof HTMLElement &&
    (
      element.matches(
        "input, textarea, select",
      ) ||
      element.isContentEditable
    )
  );
}

export function createKeyboardMovementController({
  camera,
  controls,
  moveSpeed = 6,
  sprintMultiplier = 2.5,
  is2DView = () => false,
  isBlocked = () => false,
  onMove,
}) {
  const pressedKeys = new Set();

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const movement = new THREE.Vector3();

  function handleKeyDown(event) {
    if (
      !MOVEMENT_KEYS.has(event.code) ||
      isEditableElement(event.target)
    ) {
      return;
    }

    pressedKeys.add(event.code);

    /*
     * 브라우저 기본 동작을 막는다.
     * event.code를 사용하므로 한글 입력 상태에서도 동작한다.
     */
    if (
      event.code !== "ShiftLeft" &&
      event.code !== "ShiftRight"
    ) {
      event.preventDefault();
    }
  }

  function handleKeyUp(event) {
    pressedKeys.delete(event.code);
  }

  function clearPressedKeys() {
    pressedKeys.clear();
  }

  function update(deltaSeconds) {
    if (
      isBlocked() ||
      deltaSeconds <= 0
    ) {
      return;
    }

    const forwardInput =
      Number(pressedKeys.has("KeyW")) -
      Number(pressedKeys.has("KeyS"));

    const rightInput =
      Number(pressedKeys.has("KeyD")) -
      Number(pressedKeys.has("KeyA"));

    const verticalInput =
      Number(pressedKeys.has("KeyE")) -
      Number(pressedKeys.has("KeyQ"));

    if (
      forwardInput === 0 &&
      rightInput === 0 &&
      verticalInput === 0
    ) {
      return;
    }

    movement.set(0, 0, 0);

    if (is2DView()) {
      /*
       * 2D 평면에서는 카메라 높이와 각도를 유지하고
       * W/A/S/D로 지도 위를 이동한다.
       */
      movement.set(
        rightInput,
        0,
        -forwardInput,
      );
    } else {
      camera.updateMatrixWorld();

      /*
       * 3D에서는 카메라가 실제로 바라보는 방향으로 이동한다.
       */
      camera.getWorldDirection(forward);
      forward.normalize();

      right.setFromMatrixColumn(
        camera.matrixWorld,
        0,
      );

      right.y = 0;

      if (right.lengthSq() < 0.000001) {
        right.set(1, 0, 0);
      }

      right.normalize();

      movement.addScaledVector(
        forward,
        forwardInput,
      );

      movement.addScaledVector(
        right,
        rightInput,
      );

      movement.y += verticalInput;
    }


    /*
     * W+D처럼 대각선 입력 시 더 빨라지는 것을 방지한다.
     */
    movement.normalize();

    const isSprinting =
      pressedKeys.has("ShiftLeft") ||
      pressedKeys.has("ShiftRight");

    /*
     * 탭을 오래 벗어났다가 돌아왔을 때
     * 카메라가 갑자기 멀리 튀는 것을 방지한다.
     */
    const safeDeltaSeconds = Math.min(
      deltaSeconds,
      0.05,
    );

    const distance =
      moveSpeed *
      safeDeltaSeconds *
      (
        isSprinting
          ? sprintMultiplier
          : 1
      );

    movement.multiplyScalar(distance);

    /*
     * 카메라와 OrbitControls의 target을 같이 움직여야
     * 바라보는 방향이 유지된다.
     */
    camera.position.add(movement);
    controls.target.add(movement);

    onMove?.();
  }

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  window.addEventListener(
    "keyup",
    handleKeyUp,
  );

  /*
   * Alt+Tab 등으로 창을 벗어나면 눌린 키를 초기화한다.
   */
  window.addEventListener(
    "blur",
    clearPressedKeys,
  );

  return {
    update,

    destroy() {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp,
      );

      window.removeEventListener(
        "blur",
        clearPressedKeys,
      );

      clearPressedKeys();
    },
  };
}
