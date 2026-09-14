import * as THREE from "three";

const CLICK_DRAG_THRESHOLD = 5;

export function createEquipmentSelectionController({
  camera,
  scene,
  domElement,
  root,
  roots,
  initiallyEnabled = false,
  onSelect,
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targetToEquipment = new Map();
  const clickTargets = [];
  const selectionBox = new THREE.Box3();
  const selectionHelper = new THREE.Box3Helper(selectionBox, 0x1da99a);

  let enabled = initiallyEnabled;
  let selectedObject = null;
  let activePointerId = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let pointerDragged = false;

  const equipmentRoots = roots ?? (root ? [root] : []);

  if (!equipmentRoots.length) {
    throw new Error("설비 선택 대상으로 사용할 root가 필요합니다.");
  }

  selectionHelper.name = "equipment-selection";
  selectionHelper.visible = false;
  selectionHelper.renderOrder = 50;
  scene.add(selectionHelper);

  equipmentRoots.forEach((equipmentRoot) => {
    equipmentRoot.traverse((object) => {
      if (!object.userData.equipmentId) return;

      object.traverse((child) => {
        if (!child.isMesh) return;
        clickTargets.push(child);
        targetToEquipment.set(child, object);
      });
    });
  });

  function findEquipment(event) {
    if (!enabled) return null;

    const bounds = domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const [intersection] = raycaster.intersectObjects(clickTargets, false);
    return intersection ? targetToEquipment.get(intersection.object) : null;
  }

  function clearSelection() {
    selectedObject = null;
    selectionHelper.visible = false;
  }

  function selectEquipment(equipment) {
    if (!equipment) return;

    selectedObject = equipment;
    selectionBox.setFromObject(equipment);
    selectionHelper.visible = true;
    onSelect?.(equipment.userData.equipmentId, equipment);
  }

  function handlePointerDown(event) {
    if (!enabled || event.button !== 0 || activePointerId !== null) return;

    activePointerId = event.pointerId;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerDragged = false;
  }

  function handlePointerMove(event) {
    if (event.pointerId !== activePointerId) return;

    pointerDragged = pointerDragged || Math.hypot(
      event.clientX - pointerStartX,
      event.clientY - pointerStartY,
    ) > CLICK_DRAG_THRESHOLD;
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;

    if (!pointerDragged) {
      const equipment = findEquipment(event);
      if (equipment) selectEquipment(equipment);
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

  return {
    /*
     * 트럭처럼 움직이는 설비를 선택했을 때
     * 선택 표시가 따라가도록 매 프레임 다시 계산한다.
     */
    update() {
      if (!selectionHelper.visible || !selectedObject) return;

      selectionBox.setFromObject(selectedObject);
    },

    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);

      if (!enabled) {
        activePointerId = null;
        pointerDragged = false;
        clearSelection();
      }
    },

    clearSelection,

    destroy() {
      clearSelection();
      scene.remove(selectionHelper);
      selectionHelper.dispose();
      domElement.removeEventListener("pointerdown", handlePointerDown);
      domElement.removeEventListener("pointermove", handlePointerMove);
      domElement.removeEventListener("pointerup", handlePointerUp);
      domElement.removeEventListener("pointercancel", handlePointerCancel);
    },
  };
}
