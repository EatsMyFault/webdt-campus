import * as THREE from "three";

const CLICK_DRAG_THRESHOLD = 5;
const OPEN_DURATION_SECONDS = 1.6;

function moveTowards(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function getDoorStatus(door) {
  if (door.openness <= 0 && !door.targetOpen) return "closed";
  if (door.openness >= 1 && door.targetOpen) return "open";
  return door.targetOpen ? "opening" : "closing";
}

export function createFactoryDoorController({
  camera,
  domElement,
  doors,
  initiallyEnabled = true,
  onChange,
}) {
  if (!doors?.length) {
    throw new Error("제어할 산업용 출입문이 없습니다.");
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targetToDoor = new Map();

  let selectedDoor = doors[0];
  let activePointerId = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerDragged = false;
  let enabled = initiallyEnabled;

  doors.forEach((door) => {
    door.openness = 0;
    door.targetOpen = false;
    door.panel.scale.y = 1;

    door.clickTargets.forEach((target) => {
      targetToDoor.set(target, door);
    });
  });

  function createDoorSnapshot(door) {
    return {
      id: door.id,
      name: door.name,
      status: getDoorStatus(door),
      openness: door.openness,
      targetOpen: door.targetOpen,
    };
  }

  function emitChange() {
    onChange?.({
      selectedDoorId: selectedDoor.id,
      doors: doors.map(createDoorSnapshot),
    });
  }

  function findDoor(event) {
    if (!enabled) return null;

    const bounds = domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const intersections = raycaster.intersectObjects(
      [...targetToDoor.keys()],
      false,
    );

    return intersections.length > 0
      ? targetToDoor.get(intersections[0].object)
      : null;
  }

  function selectDoor(door) {
    if (!door) return;
    selectedDoor = door;
  }

  function toggleDoorState(door = selectedDoor) {
    if (!enabled || !door) return;
    selectDoor(door);
    door.targetOpen = !door.targetOpen;
    emitChange();
  }

  /*
   * 자동 제어용 문 개폐.
   *
   * 사용자 클릭과 달리 enabled와 무관하게 동작한다.
   * 다른 시점을 보고 있어도 설비는 계속 돌아가기 때문이다.
   * 이미 같은 상태면 아무것도 하지 않는다.
   */
  function setDoorOpenState(door, open) {
    if (!door || door.targetOpen === open) return;
    door.targetOpen = open;
    emitChange();
  }

  function handlePointerDown(event) {
    if (!enabled || event.button !== 0 || activePointerId !== null) return;

    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerDragged = false;
  }

  function handlePointerMove(event) {
    if (!enabled) {
      domElement.style.cursor = "";
      return;
    }

    if (event.pointerId === activePointerId) {
      pointerDragged =
        pointerDragged ||
        Math.hypot(
          event.clientX - pointerStartX,
          event.clientY - pointerStartY,
        ) > CLICK_DRAG_THRESHOLD;

      return;
    }

    domElement.style.cursor = findDoor(event) ? "pointer" : "";
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;

    if (!pointerDragged) {
      const door = findDoor(event);
      if (door) toggleDoorState(door);
    }

    activePointerId = null;
    pointerDragged = false;
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    pointerDragged = false;
  }

  domElement.addEventListener("pointerdown", handlePointerDown);
  domElement.addEventListener("pointermove", handlePointerMove);
  domElement.addEventListener("pointerup", handlePointerUp);
  domElement.addEventListener("pointercancel", handlePointerCancel);

  emitChange();

  return {
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);

      if (!enabled) {
        activePointerId = null;
        pointerDragged = false;
        domElement.style.cursor = "";
      }
    },

    toggleSelected() {
      toggleDoorState(selectedDoor);
    },

    toggleDoor(doorId) {
      const door = doors.find((item) => item.id === doorId);
      toggleDoorState(door);
    },

    setDoorOpen(doorId, open) {
      const door = doors.find((item) => item.id === doorId);
      setDoorOpenState(door, Boolean(open));
    },

    update(deltaSeconds) {
      const maxDelta = Math.min(deltaSeconds, 0.05) / OPEN_DURATION_SECONDS;
      let doorChanged = false;

      doors.forEach((door) => {
        const previousOpenness = door.openness;
        const targetOpenness = door.targetOpen ? 1 : 0;

        door.openness = moveTowards(
          door.openness,
          targetOpenness,
          maxDelta,
        );

        // 문 상단은 고정하고 아래쪽부터 말려 올라가는 모습이다.
        door.panel.scale.y = Math.max(1 - door.openness, 0.015);
        door.statusLight.material.color.setHex(
          door.openness >= 1 ? 0x36d7aa : 0xf3b64b,
        );
        door.statusLight.material.emissive.setHex(
          door.openness >= 1 ? 0x36d7aa : 0xf3b64b,
        );

        if (previousOpenness !== door.openness) doorChanged = true;
      });

      if (doorChanged) emitChange();
    },

    destroy() {
      domElement.style.cursor = "";
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerup", handlePointerUp);
      domElement.removeEventListener("pointercancel", handlePointerCancel);
    },
  };
}
