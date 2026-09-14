import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { createFactoryAInterior } from "../interiors/createFactoryAInterior.js";

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

function createCylinder({
  name,
  radius,
  height,
  position,
  material,
}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 20),
    material,
  );

  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createSawtoothGeometry(width, depth, rise) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const vertices = new Float32Array([
    -halfWidth, 0, -halfDepth,
    halfWidth, 0, -halfDepth,
    -halfWidth, rise, -halfDepth,
    -halfWidth, 0, halfDepth,
    halfWidth, 0, halfDepth,
    -halfWidth, rise, halfDepth,
  ]);
  const indices = [
    0, 1, 2,
    3, 5, 4,
    0, 3, 4,
    0, 4, 1,
    1, 4, 5,
    1, 5, 2,
    0, 2, 5,
    0, 5, 3,
  ];
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function addMainHallShell(group, materials) {
  const frontZ = 27;
  const rearZ = -45;

  group.add(
    createBox({
      name: "factory-a-rear-wall",
      size: [128, 23, 1],
      position: [9, 12, rearZ],
      material: materials.wall,
    }),
    createBox({
      name: "factory-a-left-wall-rear",
      size: [1, 23, 47.5],
      position: [-55, 12, -21.25],
      material: materials.wall,
    }),
    createBox({
      name: "factory-a-left-wall-front",
      size: [1, 23, 19.5],
      position: [-55, 12, 17.25],
      material: materials.wall,
    }),
    createBox({
      name: "factory-a-support-door-upper-wall",
      size: [1, 16, 5],
      position: [-55, 15, 5],
      material: materials.wall,
    }),
    createBox({
      name: "factory-a-right-wall",
      size: [1, 23, 72],
      position: [73, 12, -9],
      material: materials.wall,
    }),
    createBox({
      name: "factory-a-front-upper-wall",
      size: [128, 9.8, 1],
      position: [9, 18.1, frontZ],
      material: materials.wall,
    }),
  );

  /*
   * 지원실과 생산라인을 잇는 상시 개방형 내부 통로.
   * 왼쪽 벽의 z=2.5~7.5 구간을 비우고 문틀과 바닥 표식만 둔다.
   */
  group.add(
    createBox({
      name: "factory-a-support-door-rear-frame",
      size: [1.5, 7.6, 0.45],
      position: [-55, 4.6, 2.25],
      material: materials.frame,
    }),
    createBox({
      name: "factory-a-support-door-front-frame",
      size: [1.5, 7.6, 0.45],
      position: [-55, 4.6, 7.75],
      material: materials.frame,
    }),
    createBox({
      name: "factory-a-support-door-header",
      size: [1.5, 0.65, 6],
      position: [-55, 8.35, 5],
      material: materials.frame,
    }),
    createBox({
      name: "factory-a-support-door-sign",
      size: [1.65, 1.1, 4.2],
      position: [-55, 9.45, 5],
      material: materials.accent,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-support-door-threshold",
      size: [6, 0.08, 4.5],
      position: [-54, 0.9, 5],
      material: materials.accent,
      castShadow: false,
    }),
  );

  // 전면 하단 벽을 나눠 만들어 실제 출입구 두 곳을 비워 둔다.
  [
    { width: 3, x: -53.5 },
    { width: 7, x: -30.5 },
    { width: 82, x: 32 },
  ].forEach(({ width, x }, index) => {
    group.add(
      createBox({
        name: `factory-a-front-lower-wall-${index + 1}`,
        size: [width, 13.2, 1],
        position: [x, 7.1, frontZ],
        material: materials.wall,
      }),
    );
  });
}

function addSawtoothRoof(group, materials) {
  const hallX = 9;
  const hallZ = -9;
  const hallWidth = 128;
  const hallDepth = 72;
  const hallHeight = 23;
  const moduleCount = 6;
  const moduleWidth = hallWidth / moduleCount;
  const roofRise = 8;

  for (let index = 0; index < moduleCount; index += 1) {
    const moduleX =
      hallX - hallWidth / 2 +
      moduleWidth / 2 +
      index * moduleWidth;

    const roof = new THREE.Mesh(
      createSawtoothGeometry(moduleWidth, hallDepth, roofRise),
      materials.roof,
    );

    roof.name = `factory-a-sawtooth-roof-${index + 1}`;
    roof.position.set(moduleX, hallHeight, hallZ);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const clerestory = new THREE.Mesh(
      new THREE.PlaneGeometry(hallDepth - 3, roofRise - 1),
      materials.clerestory,
    );

    clerestory.name = `factory-a-clerestory-${index + 1}`;
    clerestory.rotation.y = Math.PI / 2;
    clerestory.position.set(
      moduleX - moduleWidth / 2 - 0.03,
      hallHeight + roofRise / 2,
      hallZ,
    );
    group.add(clerestory);
  }
}

function createIndustrialDoor({
  group,
  materials,
  x,
  index,
  frontZ,
}) {
  const doorId = `factory-a-door-${index + 1}`;
  const opening = createBox({
    name: `${doorId}-opening`,
    size: [18, 13, 0.34],
    position: [x, 6.7, frontZ + 0.14],
    material: materials.doorOpening,
    castShadow: false,
  });
  const panel = new THREE.Group();
  const doorSheet = createBox({
    name: `${doorId}-panel`,
    size: [18, 13, 0.5],
    position: [0, -6.5, 0],
    material: materials.door,
  });
  const clickTargets = [opening, doorSheet];

  panel.name = `${doorId}-moving-panel`;
  panel.position.set(x, 13.2, frontZ + 0.48);
  panel.add(doorSheet);

  for (let stripe = -5; stripe <= 5; stripe += 2.5) {
    const rib = createBox({
      name: `${doorId}-rib`,
      size: [17.2, 0.14, 0.12],
      position: [0, 6.7 + stripe - 13.2, 0.31],
      material: materials.doorRib,
      castShadow: false,
    });

    panel.add(rib);
    clickTargets.push(rib);
  }

  const statusLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xf3b64b,
      emissive: 0xf3b64b,
      emissiveIntensity: 0.72,
      roughness: 0.35,
    }),
  );

  statusLight.name = `${doorId}-status-light`;
  statusLight.position.set(x + 10.3, 13.6, frontZ + 0.72);
  clickTargets.push(statusLight);

  group.add(
    opening,
    panel,
    createBox({
      name: `${doorId}-header`,
      size: [20, 1, 1.2],
      position: [x, 13.65, frontZ + 0.15],
      material: materials.frame,
    }),
    createBox({
      name: `${doorId}-left-frame`,
      size: [0.8, 14, 1.05],
      position: [x - 9.4, 6.9, frontZ + 0.15],
      material: materials.frame,
    }),
    createBox({
      name: `${doorId}-right-frame`,
      size: [0.8, 14, 1.05],
      position: [x + 9.4, 6.9, frontZ + 0.15],
      material: materials.frame,
    }),
    statusLight,
  );

  return {
    id: `A-DOOR-${String(index + 1).padStart(2, "0")}`,
    name: `A동 산업용 출입문 ${index + 1}`,
    panel,
    statusLight,
    clickTargets,
  };
}

function addFacadeDetails(group, materials) {
  const frontZ = 27.12;
  const doorCenters = [-43, -18];

  for (let x = -52; x <= 70; x += 10.6) {
    const isInsideDoor = doorCenters.some(
      (doorX) => Math.abs(x - doorX) < 9.2,
    );

    if (isInsideDoor) continue;

    group.add(
      createBox({
        name: "factory-a-wall-seam",
        size: [0.28, 21.5, 0.25],
        position: [x, 11.2, frontZ],
        material: materials.wallSeam,
        castShadow: false,
      }),
    );
  }

  const doors = [-43, -18].map((x, index) =>
    createIndustrialDoor({ group, materials, x, index, frontZ }),
  );

  [-45, -24, -3, 18, 39, 60].forEach((x, index) => {
    group.add(
      createBox({
        name: `factory-a-high-window-${index + 1}`,
        size: [13, 3.2, 0.35],
        position: [x, 17.4, frontZ + 0.22],
        material: materials.glass,
        castShadow: false,
      }),
    );
  });

  return doors;
}

function addOfficeWing(group, materials) {
  const officeX = 32;
  const officeZ = 37;

  group.add(
    createBox({
      name: "factory-a-office",
      size: [58, 10, 18],
      position: [officeX, 5.1, officeZ],
      material: materials.officeWall,
    }),
    createBox({
      name: "factory-a-office-roof",
      size: [61, 0.9, 21],
      position: [officeX, 10.45, officeZ],
      material: materials.frame,
    }),
  );

  for (let index = 0; index < 5; index += 1) {
    const x = officeX - 22 + index * 11;

    group.add(
      createBox({
        name: `factory-a-office-window-${index + 1}`,
        size: [9.5, 5.2, 0.35],
        position: [x, 5.5, officeZ + 9.18],
        material: materials.glass,
        castShadow: false,
      }),
    );
  }

  group.add(
    createBox({
      name: "factory-a-main-entrance",
      size: [5.5, 7.5, 0.42],
      position: [officeX + 25.5, 3.9, officeZ + 9.22],
      material: materials.entranceGlass,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-entrance-canopy",
      size: [10, 0.55, 5],
      position: [officeX + 25.5, 8.2, officeZ + 10.5],
      material: materials.accent,
    }),
  );
}

function addUtilityAnnex(group, materials) {
  const annexX = -69.5;
  const annexZ = -10;
  const annexWidth = 27;
  const annexDepth = 49;
  const annexHeight = 15;
  const wallThickness = 0.7;

  /*
   * 통짜 박스 대신 벽·바닥·지붕을 분리한다.
   * 3D에서는 닫힌 지원동으로 보이고, 2D 시점에서 지붕을 숨기면
   * 내부 집진·공압 설비를 확인할 수 있다.
   */
  group.add(
    createBox({
      name: "factory-a-utility-annex-left-wall",
      size: [wallThickness, annexHeight, annexDepth],
      position: [
        annexX - annexWidth / 2 + wallThickness / 2,
        7.6,
        annexZ,
      ],
      material: materials.annex,
    }),
    createBox({
      name: "factory-a-utility-annex-front-wall",
      size: [annexWidth, annexHeight, wallThickness],
      position: [
        annexX,
        7.6,
        annexZ + annexDepth / 2 - wallThickness / 2,
      ],
      material: materials.annex,
    }),
    createBox({
      name: "factory-a-utility-annex-rear-wall",
      size: [annexWidth, annexHeight, wallThickness],
      position: [
        annexX,
        7.6,
        annexZ - annexDepth / 2 + wallThickness / 2,
      ],
      material: materials.annex,
    }),
    createBox({
      name: "factory-a-utility-annex-floor",
      size: [annexWidth - 1, 0.35, annexDepth - 1],
      position: [annexX, 0.95, annexZ],
      material: materials.foundation,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-annex-roof",
      size: [29, 0.8, 51],
      position: [annexX, 15.4, annexZ],
      material: materials.frame,
    }),
    createBox({
      name: "factory-a-annex-service-door",
      size: [7, 8.2, 0.38],
      position: [
        annexX,
        4.55,
        annexZ + annexDepth / 2 + 0.18,
      ],
      material: materials.louver,
    }),
    createBox({
      name: "factory-a-annex-safety-band",
      size: [9, 0.7, 0.5],
      position: [
        annexX,
        9.1,
        annexZ + annexDepth / 2 + 0.25,
      ],
      material: materials.accent,
      castShadow: false,
    }),
  );

  [-16, 0, 16].forEach((z, index) => {
    group.add(
      createBox({
        name: `factory-a-annex-louver-${index + 1}`,
        size: [0.45, 6.5, 9.5],
        position: [-83.15, 8, z - 10],
        material: materials.louver,
        castShadow: false,
      }),
    );
  });

  [-76, -69.5, -63].forEach((x, index) => {
    const pipe = createCylinder({
      name: `factory-a-external-pipe-${index + 1}`,
      radius: 0.75,
      height: 22,
      position: [x, 15, -34.8],
      material: materials.pipe,
    });

    group.add(pipe);
  });
}

function addRoofEquipment(group, materials) {
  group.add(
    createBox({
      name: "factory-a-rooftop-unit-1",
      size: [10, 4, 7],
      position: [41, 29.5, -28],
      material: materials.rooftop,
    }),
    createBox({
      name: "factory-a-rooftop-unit-2",
      size: [8, 3.2, 6],
      position: [57, 27.8, -27],
      material: materials.rooftop,
    }),
  );

  [47, 59].forEach((x, index) => {
    const height = index === 0 ? 15 : 12;
    const centerY = index === 0 ? 36 : 34;
    const radius = index === 0 ? 2.4 : 1.8;

    group.add(
      createCylinder({
        name: `factory-a-exhaust-stack-${index + 1}`,
        radius,
        height,
        position: [x, centerY, -37],
        material: materials.stack,
      }),
      createCylinder({
        name: `factory-a-exhaust-cap-${index + 1}`,
        radius: radius + 0.4,
        height: 0.8,
        position: [x, centerY + height / 2 + 0.4, -37],
        material: materials.stackCap,
      }),
    );
  });
}

function addBuildingLabel(group, building) {
  const element = document.createElement("div");

  element.className = "factory-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>PRECISION MANUFACTURING</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "factory-a-label";
  label.position.set(26, 19, 47.5);
  group.add(label);
}

function createMaterials() {
  return {
    foundation: new THREE.MeshStandardMaterial({
      color: 0xc3c9c7,
      roughness: 0.9,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xdde5e5,
      roughness: 0.78,
      side: THREE.DoubleSide,
    }),
    wallSeam: new THREE.MeshStandardMaterial({
      color: 0xb5c2c4,
      roughness: 0.8,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x91a2a7,
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
    clerestory: new THREE.MeshPhysicalMaterial({
      color: 0x8bd2e2,
      roughness: 0.2,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x4f91a7,
      roughness: 0.16,
      transparent: true,
      opacity: 0.78,
    }),
    entranceGlass: new THREE.MeshPhysicalMaterial({
      color: 0x2f778e,
      roughness: 0.12,
      transparent: true,
      opacity: 0.82,
    }),
    officeWall: new THREE.MeshStandardMaterial({
      color: 0xf0f3ef,
      roughness: 0.76,
    }),
    annex: new THREE.MeshStandardMaterial({
      color: 0x98aaa9,
      roughness: 0.8,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x4e6269,
      roughness: 0.65,
      metalness: 0.16,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x2b9c8c,
      roughness: 0.58,
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0x607980,
      roughness: 0.65,
      metalness: 0.14,
    }),
    doorOpening: new THREE.MeshStandardMaterial({
      color: 0x172b30,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    doorRib: new THREE.MeshStandardMaterial({
      color: 0x8ca2a7,
      roughness: 0.7,
    }),
    louver: new THREE.MeshStandardMaterial({
      color: 0x40565c,
      roughness: 0.65,
      metalness: 0.18,
    }),
    pipe: new THREE.MeshStandardMaterial({
      color: 0xb8c6c7,
      roughness: 0.42,
      metalness: 0.52,
    }),
    rooftop: new THREE.MeshStandardMaterial({
      color: 0x71898e,
      roughness: 0.65,
      metalness: 0.2,
    }),
    stack: new THREE.MeshStandardMaterial({
      color: 0x9eafb1,
      roughness: 0.46,
      metalness: 0.42,
    }),
    stackCap: new THREE.MeshStandardMaterial({
      color: 0x536a70,
      roughness: 0.56,
      metalness: 0.25,
    }),
  };
}

export function createProductionFactory(parent, building) {
  const group = new THREE.Group();
  const shellGroup = new THREE.Group();
  const materials = createMaterials();

  group.name = building.id;
  group.position.set(...building.position);
  group.rotation.y = building.rotationY;
  group.userData = {
    buildingId: building.id,
    buildingName: building.name,
  };

  const shellScaleXZ = building.shellScaleXZ ?? 1;
  const shellScaleY = building.shellScaleY ?? 1;

  shellGroup.name = `${building.id}-shell`;
  shellGroup.scale.set(
    shellScaleXZ,
    shellScaleY,
    shellScaleXZ,
  );

  shellGroup.add(
    createBox({
      name: "factory-a-foundation",
      size: [162, 0.8, 102],
      position: [0, 0.4, 0],
      material: materials.foundation,
      castShadow: false,
    }),
  );

  addMainHallShell(shellGroup, materials);
  addSawtoothRoof(shellGroup, materials);
  const doors = addFacadeDetails(shellGroup, materials);
  addOfficeWing(shellGroup, materials);
  addUtilityAnnex(shellGroup, materials);
  addRoofEquipment(shellGroup, materials);
  addBuildingLabel(shellGroup, building);
  group.add(shellGroup);
  const interior = createFactoryAInterior(group);
  const foundationTop = 0.8 * shellScaleY;

  interior.position.y = foundationTop - 0.8;

  parent.add(group);

  return { group, doors, interior };
}
