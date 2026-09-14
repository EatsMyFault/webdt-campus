import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import {
  createLogisticsCenterInterior,
} from "../interiors/createLogisticsCenterInterior.js";
import {
  LOGISTICS_CAMPUS_LOOP,
  LOGISTICS_DOCK_X,
  LOGISTICS_YARD,
} from "../config/logisticsYardConfig.js";

function createBox({
  name,
  size,
  position,
  material,
  castShadow = true,
  receiveShadow = true,
}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    material,
  );

  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function createMaterials() {
  return {
    foundation: new THREE.MeshStandardMaterial({
      color: 0xc7cbc5,
      roughness: 0.94,
    }),
    yard: new THREE.MeshStandardMaterial({
      color: 0x89979a,
      roughness: 0.96,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xe9ece7,
      roughness: 0.76,
      side: THREE.DoubleSide,
    }),
    lowerWall: new THREE.MeshStandardMaterial({
      color: 0xb7c0bd,
      roughness: 0.82,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x687c81,
      roughness: 0.68,
      metalness: 0.14,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x30474e,
      roughness: 0.56,
      metalness: 0.24,
    }),
    dockDoor: new THREE.MeshStandardMaterial({
      color: 0x506269,
      roughness: 0.66,
      metalness: 0.18,
    }),
    dockOpening: new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    dockRubber: new THREE.MeshStandardMaterial({
      color: 0x1f292d,
      roughness: 0.9,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xd58b32,
      roughness: 0.6,
    }),
    accentDark: new THREE.MeshStandardMaterial({
      color: 0x9b5f22,
      roughness: 0.66,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x5e9ba8,
      transparent: true,
      opacity: 0.72,
      roughness: 0.18,
      metalness: 0.08,
    }),
    skylight: new THREE.MeshPhysicalMaterial({
      color: 0x87c4cf,
      transparent: true,
      opacity: 0.58,
      roughness: 0.2,
    }),
    line: new THREE.MeshBasicMaterial({
      color: 0xf5e8b5,
      toneMapped: false,
    }),
    trailer: new THREE.MeshStandardMaterial({
      color: 0xe5e8e4,
      roughness: 0.74,
    }),
    wheel: new THREE.MeshStandardMaterial({
      color: 0x1d2528,
      roughness: 0.92,
    }),
    pallet: new THREE.MeshStandardMaterial({
      color: 0x9b7955,
      roughness: 0.94,
    }),
    rooftop: new THREE.MeshStandardMaterial({
      color: 0x819397,
      roughness: 0.62,
      metalness: 0.2,
    }),
  };
}

function addMainHall(group, materials) {
  const hallCenterZ = -35;

  group.add(
    createBox({
      name: "logistics-foundation",
      size: [480, 0.8, 300],
      position: [0, 0.4, 0],
      material: materials.foundation,
      castShadow: false,
    }),
    createBox({
      name: "logistics-rear-wall",
      size: [420, 42, 1.2],
      position: [0, 21, -120],
      material: materials.wall,
    }),
    createBox({
      name: "logistics-left-wall",
      size: [1.2, 42, 170],
      position: [-210, 21, hallCenterZ],
      material: materials.wall,
    }),
    createBox({
      name: "logistics-right-wall",
      size: [1.2, 42, 170],
      position: [210, 21, hallCenterZ],
      material: materials.wall,
    }),
    /*
     * 전면 벽은 통짜로 만들지 않는다.
     * 아래쪽은 도크 개구부 사이 벽으로 나누고,
     * 셔터 상단부터 천장까지만 하나의 벽으로 막는다.
     */
    createBox({
      name: "logistics-front-upper-wall",
      size: [420, 18.9, 1.2],
      position: [0, 32.55, 50],
      material: materials.wall,
    }),
    createBox({
      name: "logistics-main-roof",
      size: [424, 1.4, 174],
      position: [0, 42.7, hallCenterZ],
      material: materials.roof,
    }),
    createBox({
      name: "logistics-front-accent-band",
      size: [420, 2.4, 0.7],
      position: [0, 34, 50.75],
      material: materials.accent,
    }),
  );

  /*
   * 각 도크 문 사이만 벽으로 채워서
   * 셔터가 열리면 실제 실내까지 관통해서 보이게 한다.
   */
  const frontWallSegments = [
    [-210, -110.5],
    [-79.5, -62.5],
    [-31.5, -14.5],
    [16.5, 33.5],
    [64.5, 81.5],
    [112.5, 129.5],
    [160.5, 174.5],
    [205.5, 210],
  ];

  frontWallSegments.forEach(
    ([startX, endX], index) => {
      const width = endX - startX;

      group.add(
        createBox({
          name: `logistics-front-lower-wall-${index + 1}`,
          size: [width, 22.3, 1.2],
          position: [
            (startX + endX) / 2,
            11.95,
            50,
          ],
          material: materials.wall,
        }),
      );
    },
  );

  for (let x = -190; x <= 190; x += 20) {
    group.add(
      createBox({
        name: "logistics-facade-seam",
        size: [0.25, 16, 0.22],
        position: [x, 32.5, 50.9],
        material: materials.lowerWall,
        castShadow: false,
      }),
    );
  }
}

function addLoadingDocks(group, materials) {
  const dockPositions = LOGISTICS_DOCK_X;
  const doors = [];

  dockPositions.forEach((x, index) => {
    const dockNumber = index + 1;
    const doorName = `logistics-dock-${dockNumber}`;
    const doorId = `L-DOOR-${String(dockNumber).padStart(2, "0")}`;
    const equipment = new THREE.Group();

    equipment.name = `${doorName}-equipment`;
    equipment.userData = {
      equipmentId: `DOCK-LG-${String(dockNumber).padStart(2, "0")}`,
      equipmentType: "shipping-dock",
      status: index === 4
        ? "warning"
        : [0, 3, 6].includes(index)
          ? "running"
          : "idle",
    };

    /*
     * 셔터가 올라간 뒤에도 클릭할 수 있도록
     * 문 크기의 투명한 고정 클릭 영역을 남긴다.
     */
    const opening = createBox({
      name: `${doorName}-opening`,
      size: [31, 22, 0.7],
      position: [x, 12.1, 50.68],
      material: materials.dockOpening,
      castShadow: false,
    });

    /*
     * panel 그룹의 원점을 셔터 상단에 둔다.
     * 컨트롤러가 scale.y를 줄이면 아래에서 위로 말려 올라간다.
     */
    const panel = new THREE.Group();
    panel.name = `${doorName}-moving-panel`;
    panel.position.set(x, 23.1, 50.95);

    const doorSheet = createBox({
      name: `${doorName}-door`,
      size: [31, 22, 0.7],
      position: [0, -11, 0],
      material: materials.dockDoor,
    });

    panel.add(doorSheet);

    const clickTargets = [
      opening,
      doorSheet,
    ];

    for (let y = 4; y <= 20; y += 4) {
      const rib = createBox({
        name: `${doorName}-rib`,
        size: [29.5, 0.18, 0.16],
        position: [0, y - 23.1, 0.43],
        material: materials.lowerWall,
        castShadow: false,
      });

      panel.add(rib);
      clickTargets.push(rib);
    }

    const statusLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf3b64b,
        emissive: 0xf3b64b,
        emissiveIntensity: 0.8,
        roughness: 0.34,
      }),
    );

    statusLight.name = `${doorName}-status-light`;
    statusLight.position.set(x + 20.5, 24.1, 53.7);
    clickTargets.push(statusLight);

    equipment.add(
      opening,
      panel,
      createBox({
        name: `${doorName}-header`,
        size: [37, 2, 3.2],
        position: [x, 24, 52],
        material: materials.frame,
      }),
      createBox({
        name: `${doorName}-left-frame`,
        size: [2.2, 24, 3.2],
        position: [x - 17.3, 12, 52],
        material: materials.frame,
      }),
      createBox({
        name: `${doorName}-right-frame`,
        size: [2.2, 24, 3.2],
        position: [x + 17.3, 12, 52],
        material: materials.frame,
      }),
      createBox({
        name: `${doorName}-platform`,
        size: [36, 1.2, 17],
        position: [x, 1, 59],
        material: materials.frame,
      }),
      createBox({
        name: `${doorName}-left-bumper`,
        size: [2.2, 4.2, 1.8],
        position: [x - 14.2, 3, 52.4],
        material: materials.dockRubber,
      }),
      createBox({
        name: `${doorName}-right-bumper`,
        size: [2.2, 4.2, 1.8],
        position: [x + 14.2, 3, 52.4],
        material: materials.dockRubber,
      }),
      createBox({
        name: `${doorName}-number-panel`,
        size: [8, 2.4, 0.55],
        position: [x, 28, 51],
        material: index % 3 === 1
          ? materials.accentDark
          : materials.accent,
        castShadow: false,
      }),
      statusLight,
    );
    group.add(equipment);

    doors.push({
      id: doorId,
      name: `${dockNumber}번 상하차 도크 셔터`,
      panel,
      statusLight,
      clickTargets,
    });
  });

  return doors;
}

function addOfficeWing(group, materials) {
  const officeX = -168;
  const officeZ = 70;

  group.add(
    createBox({
      name: "logistics-office",
      size: [78, 20, 38],
      position: [officeX, 10.4, officeZ],
      material: materials.wall,
    }),
    createBox({
      name: "logistics-office-roof",
      size: [82, 1, 42],
      position: [officeX, 20.8, officeZ],
      material: materials.roof,
    }),
    createBox({
      name: "logistics-office-accent",
      size: [80, 2, 0.7],
      position: [officeX, 16.5, 89.4],
      material: materials.accent,
    }),
  );

  [-194, -178, -162, -146].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-office-window-${index + 1}`,
        size: [12, 7.5, 0.45],
        position: [x, 10.5, 89.4],
        material: materials.glass,
        castShadow: false,
      }),
    );
  });

  group.add(
    createBox({
      name: "logistics-office-entrance",
      size: [8, 11, 0.5],
      position: [-134, 6, 89.5],
      material: materials.glass,
      castShadow: false,
    }),
    createBox({
      name: "logistics-office-canopy",
      size: [18, 0.8, 8],
      position: [-134, 12.5, 93],
      material: materials.accentDark,
    }),
  );
}

function addRoofEquipment(group, materials) {
  [-140, -70, 0, 70, 140].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-roof-skylight-${index + 1}`,
        size: [28, 0.45, 120],
        position: [x, 43.55, -35],
        material: materials.skylight,
        castShadow: false,
      }),
    );
  });

  [-155, -52, 52, 155].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-rooftop-air-handler-${index + 1}`,
        size: [24, 6, 14],
        position: [x, 46.3, -88],
        material: materials.rooftop,
      }),
    );
  });
}

/*
 * 외부 GLB가 로드되지 않았을 때만 사용하는 대체 트럭.
 * 네트워크/파일 오류가 생겨도 물류센터 전체가 사라지지 않게 한다.
 */
function createFallbackTruck({
  name,
  equipmentId,
  status,
  x,
  z,
  rotationY = 0,
  cabColor,
  materials,
}) {
  const truck = new THREE.Group();
  const cabMaterial = new THREE.MeshStandardMaterial({
    color: cabColor,
    roughness: 0.58,
    metalness: 0.12,
  });

  truck.name = name;
  truck.position.set(x, 0.8, z);
  truck.rotation.y = rotationY;
  truck.userData = {
    equipmentId,
    equipmentType: "truck",
    status,
    assetType: "procedural-fallback",
  };
  truck.add(
    createBox({
      name: `${name}-trailer`,
      size: [12, 12, 38],
      position: [0, 7, -10],
      material: materials.trailer,
    }),
    createBox({
      name: `${name}-cab`,
      size: [11.5, 10, 12],
      position: [0, 5.8, 16],
      material: cabMaterial,
    }),
    createBox({
      name: `${name}-windshield`,
      size: [9.2, 3.2, 0.35],
      position: [0, 8.2, 22.2],
      material: materials.glass,
      castShadow: false,
    }),
  );

  [-6.2, 6.2].forEach((wheelX) => {
    [-23, -4, 15].forEach((wheelZ, index) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.1, 1.4, 16),
        materials.wheel,
      );

      wheel.name = `${name}-wheel-${index + 1}`;
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheelX, 2.2, wheelZ);
      wheel.castShadow = true;
      truck.add(wheel);
    });
  });

  return truck;
}

function createModelTruck({
  name,
  equipmentId,
  status,
  x,
  z,
  rotationY = 0,
  targetLength,
  template,
  fallbackColor,
  materials,
}) {
  if (!template) {
    return createFallbackTruck({
      name,
      equipmentId,
      status,
      x,
      z,
      rotationY,
      cabColor: fallbackColor,
      materials,
    });
  }

  const truck = new THREE.Group();
  const model = template.clone(true);

  truck.name = name;
  truck.position.set(x, 0.96, z);
  truck.rotation.y = rotationY;
  truck.userData = {
    equipmentId,
    equipmentType: "truck",
    status,
    assetType: "external-glb",
    modelVariant: template.name,
  };

  /*
   * 외부 모델은 실제 미터 단위이지만 이 데모 공장은
   * 시각적 블록아웃 스케일이 더 크다.
   * 모델 길이를 기준으로 균일 배율을 자동 계산한다.
   */
  model.updateMatrixWorld(true);

  const sourceBounds =
    new THREE.Box3().setFromObject(model);

  const sourceSize =
    sourceBounds.getSize(new THREE.Vector3());

  const modelScale =
    targetLength / Math.max(sourceSize.z, 0.001);

  model.scale.setScalar(modelScale);
  model.updateMatrixWorld(true);

  /*
   * 원본 피벗이 달라도 차선 중앙과 바닥에 정확히 배치한다.
   */
  const scaledBounds =
    new THREE.Box3().setFromObject(model);

  const scaledCenter =
    scaledBounds.getCenter(new THREE.Vector3());

  model.position.x -= scaledCenter.x;
  model.position.y -= scaledBounds.min.y;
  model.position.z -= scaledCenter.z;
  model.name = `${name}-model`;

  model.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;
  });

  truck.add(model);
  return truck;
}

function addTruckYard(
  group,
  materials,
  truckModels,
) {
  group.add(
    createBox({
      name: "logistics-truck-yard",
      size: [450, 0.12, 104],
      position: [0, 0.9, 104],
      material: materials.yard,
      castShadow: false,
    }),
    createBox({
      name: "logistics-entry-connector-road",
      size: [58, 0.13, 94],
      position: [
        LOGISTICS_YARD.entryGateX + 11,
        0.9,
        188,
      ],
      material: materials.yard,
      castShadow: false,
    }),
    createBox({
      name: "logistics-exit-connector-road",
      size: [104, 0.13, 78],
      position: [
        (225 + LOGISTICS_CAMPUS_LOOP.eastX) / 2,
        0.9,
        184,
      ],
      material: materials.yard,
      castShadow: false,
    }),
  );

  [-119, -71, -23, 25, 73, 121, 169, 217].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-yard-lane-${index + 1}`,
        size: [0.55, 0.08, 82],
        position: [x, 1.02, 108],
        material: materials.line,
        castShadow: false,
      }),
    );
  });

  group.add(
    createModelTruck({
      name: "logistics-truck-1",
      equipmentId: "TRUCK-LG-01",
      status: "running",
      x: -95,
      z: 89,
      targetLength: 42,
      template: truckModels.curtainside,
      fallbackColor: 0xd58b32,
      materials,
    }),
    createModelTruck({
      name: "logistics-truck-2",
      equipmentId: "TRUCK-LG-02",
      status: "idle",
      x: 1,
      z: 88,
      targetLength: 40,
      template: truckModels.box,
      fallbackColor: 0x3b8ba0,
      materials,
    }),
    createModelTruck({
      name: "logistics-truck-3",
      equipmentId: "TRUCK-LG-03",
      status: "warning",
      x: 97,
      z: 89,
      targetLength: 42,
      template: truckModels.curtainside,
      fallbackColor: 0x3b7467,
      materials,
    }),
    createModelTruck({
      name: "logistics-truck-4",
      equipmentId: "TRUCK-LG-04",
      status: "running",
      x: 185,
      z: 128,
      rotationY: Math.PI / 2,
      targetLength: 40,
      template: truckModels.box,
      fallbackColor: 0x6f7e82,
      materials,
    }),
  );

  [-138, -122, -106].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-outbound-pallet-${index + 1}`,
        size: [8, 3 + index, 6],
        position: [x, 2.4 + index * 0.5, 57],
        material: materials.pallet,
      }),
    );
  });
}

function addBuildingLabel(group, building) {
  const element = document.createElement("div");

  element.className =
    "factory-building-label logistics-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>WAREHOUSE · SHIPPING · DOCK</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "logistics-center-label";
  label.position.set(-150, 52, 66);
  group.add(label);
}

export function createLogisticsCenter(
  parent,
  building,
  truckModels = {},
) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = building.id;
  group.position.set(...building.position);
  group.rotation.y = building.rotationY;
  group.userData = {
    buildingId: building.id,
    buildingName: building.name,
  };

  addMainHall(group, materials);
  const doors = addLoadingDocks(group, materials);
  addOfficeWing(group, materials);
  addRoofEquipment(group, materials);
  addTruckYard(group, materials, truckModels);
  const interior = createLogisticsCenterInterior(group);
  addBuildingLabel(group, building);
  parent.add(group);

  return { group, interior, doors };
}
