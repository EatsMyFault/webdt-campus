import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const DEFAULT_MODEL_URL = `${import.meta.env.BASE_URL}models/factory-a.glb`;

function findMeshes(root) {
  const meshes = [];

  root.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });

  return meshes;
}

function createDoorReference(group, index) {
  const doorName = `factory-a-door-${index}`;
  const panel = group.getObjectByName(
    `${doorName}-moving-panel`,
  );
  const opening = group.getObjectByName(
    `${doorName}-opening`,
  );
  const statusLight = group.getObjectByName(
    `${doorName}-status-light`,
  );

  if (!panel || !opening || !statusLight) {
    throw new Error(
      `모듈 조립동 GLB에서 ${index}번 출입문 노드를 찾을 수 없습니다.`,
    );
  }

  return {
    id: `A-DOOR-${String(index).padStart(2, "0")}`,
    name: `모듈 조립동 출입문 ${index}`,
    panel,
    statusLight,
    clickTargets: [
      opening,
      ...findMeshes(panel),
      statusLight,
    ],
  };
}

function addBuildingLabel(group, building) {
  const element = document.createElement("div");
  const scaleXZ = building.shellScaleXZ ?? 1;
  const scaleY = building.shellScaleY ?? 1;

  element.className = "factory-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>CELL INSPECTION · STACKING · WELDING · EOL</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "factory-a-label";
  label.position.set(
    26 * scaleXZ,
    19 * scaleY,
    47.5 * scaleXZ,
  );
  group.add(label);
}

function configureMeshes(group) {
  group.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const fullyTransparent = materials.every(
      (material) => material?.transparent && material.opacity <= 0,
    );

    object.castShadow = !fullyTransparent;
    object.receiveShadow = true;
  });
}

export async function loadProductionFactory(
  parent,
  building,
  {
    modelUrl = DEFAULT_MODEL_URL,
  } = {},
) {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  const group = gltf.scene.getObjectByName(building.id);

  if (!group) {
    throw new Error(
      `모듈 조립동 GLB에서 루트 노드를 찾을 수 없습니다: ${building.id}`,
    );
  }

  group.removeFromParent();
  group.name = building.id;
  group.position.set(...building.position);
  group.rotation.set(0, building.rotationY, 0);
  group.userData = {
    ...group.userData,
    buildingId: building.id,
    buildingName: building.name,
    source: "glb",
    modelUrl,
  };

  configureMeshes(group);

  const interior = group.getObjectByName(
    "factory-a-interior",
  );

  if (!interior) {
    throw new Error(
      "모듈 조립동 GLB에서 내부 설비 그룹을 찾을 수 없습니다.",
    );
  }

  const doors = [
    createDoorReference(group, 1),
    createDoorReference(group, 2),
  ];

  addBuildingLabel(group, building);
  parent.add(group);

  return {
    group,
    doors,
    interior,
    source: "glb",
    modelUrl,
  };
}
