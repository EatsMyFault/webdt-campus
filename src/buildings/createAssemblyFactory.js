import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { createFactoryBInterior } from "../interiors/createFactoryBInterior.js";

function createBox({
  name,
  size,
  position,
  material,
  castShadow = true,
  receiveShadow = true,
}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);

  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  return mesh;
}

function createCylinder({ name, radius, height, position, material }) {
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

function createMaterials() {
  return {
    foundation: new THREE.MeshStandardMaterial({
      color: 0xbfc7c4,
      roughness: 0.92,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xe8eeeb,
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
    lowerWall: new THREE.MeshStandardMaterial({
      color: 0xb9c9c6,
      roughness: 0.78,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x405b62,
      roughness: 0.54,
      metalness: 0.22,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x71878b,
      roughness: 0.68,
      metalness: 0.15,
      side: THREE.DoubleSide,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x4f9fb0,
      transparent: true,
      opacity: 0.72,
      roughness: 0.16,
      metalness: 0.08,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x36a37d,
      roughness: 0.54,
    }),
    accentDark: new THREE.MeshStandardMaterial({
      color: 0x26745f,
      roughness: 0.58,
    }),
    door: new THREE.MeshStandardMaterial({
      color: 0x506970,
      roughness: 0.64,
      metalness: 0.2,
    }),
    doorOpening: new THREE.MeshStandardMaterial({
      color: 0x172b30,
      transparent: true,
      opacity: 0,
      depthWrite: false
    }),
    doorRib: new THREE.MeshStandardMaterial({
      color: 0x8aa0a4,
      roughness: 0.7,
    }),
    solar: new THREE.MeshStandardMaterial({
      color: 0x244f68,
      roughness: 0.26,
      metalness: 0.34,
    }),
    solarFrame: new THREE.MeshStandardMaterial({
      color: 0xaebfc1,
      roughness: 0.45,
      metalness: 0.52,
    }),
    equipment: new THREE.MeshStandardMaterial({
      color: 0x83999c,
      roughness: 0.58,
      metalness: 0.22,
    }),
    dock: new THREE.MeshStandardMaterial({
      color: 0x424f54,
      roughness: 0.8,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xe7b53b,
      roughness: 0.7,
    }),
  };
}

function addMainHall(group, materials) {
  group.add(
    createBox({
      name: "factory-b-foundation",
      size: [168, 0.8, 104],
      position: [0, 0.4, 0],
      material: materials.foundation,
      castShadow: false,
    }),
    createBox({
      name: "factory-b-flat-roof",
      size: [148, 0.9, 80],
      position: [0, 19.85, -6],
      material: materials.roof,
    }),
  );

  group.add(
    createBox({
      name: "factory-b-rear-wall",
      size: [144, 19, 1],
      position: [0, 10, -44],
      material: materials.wall,
    }),
    createBox({
      name: "factory-b-left-wall",
      size: [1, 19, 76],
      position: [-72, 10, -6],
      material: materials.wall,
    }),
    createBox({
      name: "factory-b-right-wall",
      size: [1, 19, 76],
      position: [72, 10, -6],
      material: materials.wall,
    }),
    createBox({
      name: "factory-b-front-upper-wall",
      size: [144, 7.5, 1],
      position: [0, 15.75, 32],
      material: materials.wall,
    }),
  );

  // 조립동 전면 출입문 3곳을 비우고 나머지 벽만 조각으로 만든다.
  [
    { width: 79.5, x: -32.25 },
    { width: 8, x: 26.5 },
    { width: 8, x: 49.5 },
    { width: 3.5, x: 70.25 },
  ].forEach(({ width, x }, index) => {
    group.add(
      createBox({
        name: `factory-b-front-lower-wall-${index + 1}`,
        size: [width, 11.8, 1],
        position: [x, 6.4, 32],
        material: materials.wall,
      }),
    );
  });

  for (let x = -66; x <= 66; x += 12) {
    const isInsideDoor = [15, 38, 61].some(
      (doorX) => Math.abs(x - doorX) < 7.8,
    );

    if (isInsideDoor) continue;

    group.add(
      createBox({
        name: "factory-b-facade-seam",
        size: [0.24, 15.2, 0.22],
        position: [x, 11.1, 32.12],
        material: materials.lowerWall,
        castShadow: false,
      }),
    );
  }
}

function addRoofMonitors(group, materials) {
  [-45, -15, 15, 45].forEach((x, index) => {
    group.add(
      createBox({
        name: `factory-b-roof-monitor-${index + 1}`,
        size: [22, 3.4, 34],
        position: [x, 21.6, -9],
        material: materials.frame,
      }),
      createBox({
        name: `factory-b-monitor-glass-${index + 1}`,
        size: [20.4, 2.1, 34.3],
        position: [x, 21.75, -9],
        material: materials.glass,
        castShadow: false,
      }),
      createBox({
        name: `factory-b-monitor-cap-${index + 1}`,
        size: [23, 0.45, 35.5],
        position: [x, 23.5, -9],
        material: materials.roof,
      }),
    );
  });
}

function addFrontOffice(group, materials) {
  const officeX = -34;
  const officeZ = 39.5;

  group.add(
    createBox({
      name: "factory-b-front-office",
      size: [67, 11, 17],
      position: [officeX, 5.9, officeZ],
      material: materials.frame,
    }),
    createBox({
      name: "factory-b-office-accent",
      size: [68, 1.1, 18],
      position: [officeX, 11.65, officeZ],
      material: materials.accent,
    }),
  );

  for (let index = 0; index < 6; index += 1) {
    const x = officeX - 27 + index * 10.8;

    group.add(
      createBox({
        name: `factory-b-office-window-${index + 1}`,
        size: [9.1, 6.3, 0.34],
        position: [x, 6.2, officeZ + 8.67],
        material: materials.glass,
        castShadow: false,
      }),
    );
  }

  group.add(
    createBox({
      name: "factory-b-main-entrance",
      size: [6.5, 7.8, 0.42],
      position: [officeX + 29, 4.15, officeZ + 8.75],
      material: materials.glass,
      castShadow: false,
    }),
    createBox({
      name: "factory-b-entrance-canopy",
      size: [13, 0.55, 5.5],
      position: [officeX + 29, 8.7, officeZ + 10.8],
      material: materials.accentDark,
    }),
  );
}

function addAssemblyDoors(group, materials) {
  const doors = [];

  [15, 38, 61].forEach((x, doorIndex) => {
    const doorId = `factory-b-assembly-door-${doorIndex + 1}`;

    // 문이 열린 뒤에도 클릭할 수 있는 투명 영역
    const opening = createBox({
      name: `${doorId}-opening`,
      size: [15, 11, 0.34],
      position: [x, 5.9, 32.1],
      material: materials.doorOpening,
      castShadow: false,
    });

    /*
     * panel의 위치를 문의 상단에 둔다.
     * controller가 panel.scale.y를 줄이면
     * 문의 위쪽은 고정되고 아래쪽이 올라간다.
     */
    const panel = new THREE.Group();

    panel.name = `${doorId}-moving-panel`;
    panel.position.set(x, 11.4, 32.35);

    const doorSheet = createBox({
      name: `${doorId}-sheet`,
      size: [15, 11, 0.46],

      // panel 기준 로컬 좌표
      position: [0, -5.5, 0],

      material: materials.door,
    });

    panel.add(doorSheet);

    const clickTargets = [
      opening,
      doorSheet,
    ];

    // 출입문 가로 리브
    for (let y = 1.8; y <= 9.8; y += 2) {
      const rib = createBox({
        name: `${doorId}-rib`,
        size: [14.3, 0.13, 0.12],

        // 기존 월드 Y 좌표를 panel 로컬 좌표로 변환
        position: [0, y - 11.4, 0.31],

        material: materials.doorRib,
        castShadow: false,
      });

      panel.add(rib);
      clickTargets.push(rib);
    }

    const header = createBox({
      name: `${doorId}-header`,
      size: [16.5, 0.9, 1.1],
      position: [x, 11.85, 32.25],
      material: materials.frame,
    });

    const statusLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 14, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf3b64b,
        emissive: 0xf3b64b,
        emissiveIntensity: 0.8,
        roughness: 0.35,
      }),
    );

    statusLight.name = `${doorId}-status-light`;
    statusLight.position.set(x + 8.8, 11.5, 32.75);

    clickTargets.push(statusLight);

    group.add(
      opening,
      panel,
      header,
      statusLight,
    );

    doors.push({
      id: `B-DOOR-${String(doorIndex + 1).padStart(2, "0")}`,
      name: `팩 조립동 출입문 ${doorIndex + 1}`,
      panel,
      statusLight,
      clickTargets,
    });
  });

  return doors;
}

function addLoadingDocks(group, materials) {
  [-48, -16, 16, 48].forEach((x, dockIndex) => {
    group.add(
      createBox({
        name: `factory-b-loading-door-${dockIndex + 1}`,
        size: [18, 10, 0.5],
        position: [x, 5.4, -44.35],
        material: materials.door,
      }),
      createBox({
        name: `factory-b-dock-platform-${dockIndex + 1}`,
        size: [21, 1.2, 9],
        position: [x, 0.9, -48.5],
        material: materials.dock,
      }),
      createBox({
        name: `factory-b-dock-bumper-left-${dockIndex + 1}`,
        size: [1.2, 2.4, 1],
        position: [x - 8.3, 2, -44.9],
        material: materials.warning,
      }),
      createBox({
        name: `factory-b-dock-bumper-right-${dockIndex + 1}`,
        size: [1.2, 2.4, 1],
        position: [x + 8.3, 2, -44.9],
        material: materials.warning,
      }),
    );
  });
}

function addSolarPanels(group, materials) {
  [-38, 0, 38].forEach((x, column) => {
    [-36, 22].forEach((z, row) => {
      const panel = createBox({
        name: `factory-b-solar-panel-${column + 1}-${row + 1}`,
        size: [29, 0.35, 12],
        position: [x, 21.1, z],
        material: materials.solar,
      });

      panel.rotation.x = THREE.MathUtils.degToRad(-8);
      group.add(
        createBox({
          name: "factory-b-solar-frame",
          size: [30, 0.3, 13],
          position: [x, 20.7, z],
          material: materials.solarFrame,
        }),
        panel,
      );
    });
  });
}

function addRoofEquipment(group, materials) {
  [-58, 58].forEach((x, index) => {
    group.add(
      createBox({
        name: `factory-b-air-handler-${index + 1}`,
        size: [11, 4.5, 8],
        position: [x, 22.45, 21],
        material: materials.equipment,
      }),
    );
  });

  [55, 63].forEach((x, index) => {
    group.add(
      createCylinder({
        name: `factory-b-exhaust-stack-${index + 1}`,
        radius: index === 0 ? 1.7 : 1.3,
        height: index === 0 ? 11 : 8,
        position: [x, index === 0 ? 26 : 24.5, -31],
        material: materials.equipment,
      }),
    );
  });
}

function addBuildingLabel(group, building) {
  const element = document.createElement("div");

  element.className = "factory-building-label factory-b-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>TRAY · MODULE MOUNTING · SEALING · PACK EOL</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "factory-b-label";
  label.position.set(-34, 16, 49.5);
  group.add(label);
}

export function createAssemblyFactory(parent, building) {
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

  addMainHall(shellGroup, materials);
  addRoofMonitors(shellGroup, materials);
  addFrontOffice(shellGroup, materials);
  const doors = addAssemblyDoors(shellGroup, materials);
  addLoadingDocks(shellGroup, materials);
  addSolarPanels(shellGroup, materials);
  addRoofEquipment(shellGroup, materials);
  addBuildingLabel(shellGroup, building);
  group.add(shellGroup);
  const interior = createFactoryBInterior(group);
  const foundationTop = 0.8 * shellScaleY;

  interior.position.y = foundationTop - 0.8;

  parent.add(group);

  return { group, interior, doors };
}
