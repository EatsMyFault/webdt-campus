function cloneEquipment(equipment) {
  return structuredClone(equipment);
}

export function createEquipmentStore(initialEquipment) {
  const initialById = new Map();
  const currentById = new Map();
  const listeners = new Set();

  initialEquipment.forEach((equipment) => {
    if (initialById.has(equipment.id)) {
      throw new Error(`중복된 설비 ID입니다: ${equipment.id}`);
    }

    initialById.set(equipment.id, cloneEquipment(equipment));
    currentById.set(equipment.id, cloneEquipment(equipment));
  });

  function notify(type, equipment, previous) {
    const event = {
      type,
      equipment,
      previous,
    };

    listeners.forEach((listener) => listener(event));
  }

  function getEquipmentById(equipmentId) {
    return currentById.get(equipmentId) ?? null;
  }

  function getAllEquipment() {
    return [...currentById.values()];
  }

  function updateEquipment(equipmentId, update) {
    const current = getEquipmentById(equipmentId);

    if (!current) {
      throw new Error(`설비를 찾을 수 없습니다: ${equipmentId}`);
    }

    const previous = cloneEquipment(current);
    const draft = cloneEquipment(current);
    const result = typeof update === "function"
      ? update(draft)
      : { ...draft, ...update };
    const next = result ?? draft;

    if (next.id !== equipmentId) {
      throw new Error("설비 업데이트 중 ID를 변경할 수 없습니다.");
    }

    currentById.set(equipmentId, next);
    notify("update", next, previous);

    return next;
  }

  function resetEquipment(equipmentId) {
    const initial = initialById.get(equipmentId);

    if (!initial) {
      throw new Error(`초기 설비 데이터를 찾을 수 없습니다: ${equipmentId}`);
    }

    const previous = getEquipmentById(equipmentId);
    const next = cloneEquipment(initial);

    currentById.set(equipmentId, next);
    notify("reset", next, previous);

    return next;
  }

  function resetAll() {
    initialById.forEach((_, equipmentId) => {
      resetEquipment(equipmentId);
    });
  }

  function subscribe(listener) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getEquipmentById,
    getAllEquipment,
    updateEquipment,
    resetEquipment,
    resetAll,
    subscribe,
  };
}
