import * as THREE from "three";

const STATUS_STYLE = Object.freeze({
  running: {
    color: 0x30d5a4,
    intensity: 1.3,
  },
  warning: {
    color: 0xf1b544,
    intensity: 2.1,
  },
  idle: {
    color: 0x94a6aa,
    intensity: 0.7,
  },
  stopped: {
    color: 0xe05d5d,
    intensity: 2.4,
  },
});

function hasEmissiveColor(material) {
  return Boolean(
    material?.emissive &&
    material.emissive.getHex() !== 0x000000,
  );
}

function findStatusLamp(equipmentRoot) {
  const equipmentId = equipmentRoot.userData.equipmentId;
  const namedLamp = equipmentRoot.getObjectByName(
    `${equipmentId}-status-lamp`,
  );

  if (namedLamp?.isMesh) return namedLamp;

  let candidate = null;

  equipmentRoot.traverse((object) => {
    if (candidate || !object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (materials.some(hasEmissiveColor)) {
      candidate = object;
    }
  });

  return candidate;
}

function cloneLampMaterial(lamp) {
  if (Array.isArray(lamp.material)) {
    lamp.material = lamp.material.map((material) => material.clone());
  } else {
    lamp.material = lamp.material.clone();
  }
}

function forEachLampMaterial(lamp, callback) {
  const materials = Array.isArray(lamp.material)
    ? lamp.material
    : [lamp.material];

  materials.forEach((material) => {
    if (material?.color && material?.emissive) {
      callback(material);
    }
  });
}

export function createEquipmentStatusVisualController({
  roots,
  store,
}) {
  const records = new Map();
  const disposables = [];

  roots.forEach((root) => {
    root.traverse((object) => {
      const equipmentId = object.userData.equipmentId;

      if (!equipmentId || records.has(equipmentId)) return;

      const lamp = findStatusLamp(object);

      if (!lamp) return;

      cloneLampMaterial(lamp);

      const materials = Array.isArray(lamp.material)
        ? lamp.material
        : [lamp.material];

      disposables.push(...materials);
      records.set(equipmentId, {
        root: object,
        lamp,
        status: object.userData.status ?? "stopped",
      });
    });
  });

  function applyStatus(equipmentId, status) {
    const record = records.get(equipmentId);

    if (!record) return;

    const style = STATUS_STYLE[status] ?? STATUS_STYLE.stopped;

    record.status = status;
    record.root.userData.status = status;

    forEachLampMaterial(record.lamp, (material) => {
      material.color.setHex(style.color);
      material.emissive.setHex(style.color);
      material.emissiveIntensity = style.intensity;
      material.needsUpdate = true;
    });
  }

  records.forEach((_, equipmentId) => {
    const equipment = store.getEquipmentById(equipmentId);

    if (equipment) {
      applyStatus(equipmentId, equipment.status);
    }
  });

  const unsubscribe = store.subscribe(({ equipment }) => {
    applyStatus(equipment.id, equipment.status);
  });

  function update(animationTimeSeconds) {
    records.forEach((record) => {
      const style = STATUS_STYLE[record.status] ?? STATUS_STYLE.stopped;

      if (record.status !== "warning" && record.status !== "stopped") {
        return;
      }

      const frequency = record.status === "stopped" ? 7 : 4;
      const pulse = (Math.sin(animationTimeSeconds * frequency) + 1) * 0.5;

      forEachLampMaterial(record.lamp, (material) => {
        material.emissiveIntensity = style.intensity * (0.45 + pulse * 0.75);
      });
    });
  }

  return {
    update,
    applyStatus,

    destroy() {
      unsubscribe();
      disposables.forEach((material) => material.dispose());
      records.clear();
    },
  };
}
