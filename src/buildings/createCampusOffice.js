import * as THREE from "three";
import {
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";

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
  segments = 20,
}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      segments,
    ),
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
      color: 0xc4cdca,
      roughness: 0.9,
    }),
    podium: new THREE.MeshStandardMaterial({
      color: 0xe8eeeb,
      roughness: 0.7,
    }),
    tower: new THREE.MeshStandardMaterial({
      color: 0xb8c6c7,
      roughness: 0.58,
      metalness: 0.1,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x4c8796,
      roughness: 0.2,
      metalness: 0.32,
    }),
    lobbyGlass: new THREE.MeshPhysicalMaterial({
      color: 0x70b9c1,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0.08,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x344f58,
      roughness: 0.5,
      metalness: 0.32,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x2f9e89,
      roughness: 0.5,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x61777d,
      roughness: 0.68,
      metalness: 0.16,
    }),
    plaza: new THREE.MeshStandardMaterial({
      color: 0xd8dfdc,
      roughness: 0.92,
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0x65737a,
      roughness: 0.94,
    }),
    parking: new THREE.MeshStandardMaterial({
      color: 0x748187,
      roughness: 0.94,
    }),
    marking: new THREE.MeshBasicMaterial({
      color: 0xf2f0d2,
    }),
    treeTrunk: new THREE.MeshStandardMaterial({
      color: 0x72523a,
      roughness: 1,
    }),
    treeCrown: new THREE.MeshStandardMaterial({
      color: 0x4f9860,
      roughness: 0.96,
    }),
  };
}

function addPodium(group, building, materials) {
  const [width, depth] = building.footprint;
  const podiumHeight = building.podiumHeight;

  group.add(
    createBox({
      name: "campus-office-foundation",
      size: [width + 20, 1.2, depth + 18],
      position: [0, 0.6, 0],
      material: materials.foundation,
    }),
    createBox({
      name: "campus-office-podium",
      size: [width, podiumHeight, depth],
      position: [0, podiumHeight / 2 + 1.2, 0],
      material: materials.podium,
    }),
    createBox({
      name: "campus-office-lobby-glass",
      size: [178, 11, 1.1],
      position: [18, 7.5, depth / 2 + 0.6],
      material: materials.lobbyGlass,
      castShadow: false,
    }),
    createBox({
      name: "campus-office-main-entrance",
      size: [22, 10, 1.5],
      position: [0, 7, depth / 2 + 1.2],
      material: materials.glass,
      castShadow: false,
    }),
    createBox({
      name: "campus-office-entrance-canopy",
      size: [58, 1.2, 16],
      position: [0, 13.2, depth / 2 + 8],
      material: materials.frame,
    }),
    createBox({
      name: "campus-office-podium-accent",
      size: [width + 4, 2.2, depth + 4],
      position: [0, podiumHeight + 1.3, 0],
      material: materials.accent,
    }),
  );

  [-124, 124].forEach((x, index) => {
    group.add(
      createBox({
        name: `campus-office-side-window-${index + 1}`,
        size: [38, 9, 1],
        position: [x, 8, depth / 2 + 0.55],
        material: materials.glass,
        castShadow: false,
      }),
    );
  });
}

function addTower(group, building, materials) {
  const floorCount = building.towerFloors;
  const floorHeight = building.floorHeight;
  const podiumHeight = building.podiumHeight;
  const towerWidth = 202;
  const towerDepth = 76;
  const towerHeight = floorCount * floorHeight;
  const towerZ = -10;
  const towerBaseY = podiumHeight + 2;

  group.add(
    createBox({
      name: "campus-office-tower-core",
      size: [towerWidth, towerHeight, towerDepth],
      position: [
        0,
        towerBaseY + towerHeight / 2,
        towerZ,
      ],
      material: materials.tower,
    }),
  );

  for (let floor = 0; floor < floorCount; floor += 1) {
    const windowY =
      towerBaseY + floorHeight * (floor + 0.5);
    const slabY = towerBaseY + floorHeight * floor;

    group.add(
      createBox({
        name: `campus-office-front-window-${floor + 1}`,
        size: [towerWidth - 12, 5.4, 0.9],
        position: [
          0,
          windowY,
          towerZ + towerDepth / 2 + 0.5,
        ],
        material: materials.glass,
        castShadow: false,
      }),
      createBox({
        name: `campus-office-rear-window-${floor + 1}`,
        size: [towerWidth - 12, 5.4, 0.9],
        position: [
          0,
          windowY,
          towerZ - towerDepth / 2 - 0.5,
        ],
        material: materials.glass,
        castShadow: false,
      }),
      createBox({
        name: `campus-office-left-window-${floor + 1}`,
        size: [0.9, 5.4, towerDepth - 10],
        position: [
          -towerWidth / 2 - 0.5,
          windowY,
          towerZ,
        ],
        material: materials.glass,
        castShadow: false,
      }),
      createBox({
        name: `campus-office-right-window-${floor + 1}`,
        size: [0.9, 5.4, towerDepth - 10],
        position: [
          towerWidth / 2 + 0.5,
          windowY,
          towerZ,
        ],
        material: materials.glass,
        castShadow: false,
      }),
      createBox({
        name: `campus-office-floor-slab-${floor + 1}`,
        size: [towerWidth + 5, 0.48, towerDepth + 5],
        position: [0, slabY, towerZ],
        material: materials.frame,
      }),
    );
  }

  [-101.8, 101.8].forEach((x, index) => {
    group.add(
      createBox({
        name: `campus-office-vertical-fin-${index + 1}`,
        size: [3.2, towerHeight + 5, 82],
        position: [
          x,
          towerBaseY + towerHeight / 2,
          towerZ,
        ],
        material: materials.frame,
      }),
    );
  });

  return towerBaseY + towerHeight;
}

function addRoofEquipment(
  group,
  towerTop,
  materials,
) {
  group.add(
    createBox({
      name: "campus-office-rooftop-penthouse",
      size: [78, 10, 38],
      position: [0, towerTop + 5, -10],
      material: materials.roof,
    }),
    createBox({
      name: "campus-office-rooftop-accent",
      size: [88, 1.4, 44],
      position: [0, towerTop + 10.7, -10],
      material: materials.accent,
    }),
    createCylinder({
      name: "campus-office-antenna-mast",
      radius: 1.25,
      height: 24,
      position: [0, towerTop + 23, -10],
      material: materials.frame,
      segments: 16,
    }),
    createCylinder({
      name: "campus-office-antenna-beacon",
      radius: 2.3,
      height: 1.8,
      position: [0, towerTop + 35.5, -10],
      material: materials.accent,
      segments: 20,
    }),
  );
}

function addParkingAndAccess(group, materials) {
  group.add(
    createBox({
      name: "campus-office-front-plaza",
      size: [330, 0.28, 42],
      position: [0, 0.16, 84],
      material: materials.plaza,
      castShadow: false,
    }),
    createBox({
      name: "campus-office-access-road",
      size: [260, 0.2, 18],
      position: [-130, 0.12, 95],
      material: materials.road,
      castShadow: false,
    }),
    createBox({
      name: "campus-office-parking-lot",
      size: [82, 0.22, 104],
      position: [-191, 0.13, -1],
      material: materials.parking,
      castShadow: false,
    }),
  );

  for (let index = 0; index < 6; index += 1) {
    const z = -43 + index * 17;

    group.add(
      createBox({
        name: `campus-office-parking-line-${index + 1}`,
        size: [70, 0.05, 0.7],
        position: [-191, 0.28, z],
        material: materials.marking,
        castShadow: false,
        receiveShadow: false,
      }),
    );
  }

  const carColors = [
    0x395b68,
    0xd8dcd8,
    0x577868,
    0x9a714f,
  ];

  carColors.forEach((color, index) => {
    const carMaterial =
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.55,
        metalness: 0.18,
      });

    group.add(
      createBox({
        name: `campus-office-parked-car-${index + 1}`,
        size: [10, 2.8, 5.2],
        position: [
          index % 2 === 0 ? -210 : -172,
          1.6,
          -34 + index * 20,
        ],
        material: carMaterial,
      }),
    );
  });
}

function addLandscaping(group, materials) {
  [-142, -92, 92, 142].forEach((x, index) => {
    group.add(
      createCylinder({
        name:
          `campus-office-plaza-tree-trunk-${index + 1}`,
        radius: 0.85,
        height: 8,
        position: [x, 4.1, 92],
        material: materials.treeTrunk,
        segments: 12,
      }),
    );

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 16, 12),
      materials.treeCrown,
    );

    crown.name =
      `campus-office-plaza-tree-crown-${index + 1}`;
    crown.position.set(x, 10.2, 92);
    crown.castShadow = true;
    group.add(crown);
  });
}

function addBuildingLabel(
  group,
  building,
  labelHeight,
) {
  const element = document.createElement("div");

  element.className =
    "factory-building-label office-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>PRODUCTION CONTROL · QUALITY</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "campus-office-label";
  label.position.set(0, labelHeight, 54);
  group.add(label);
}

export function createCampusOffice(parent, building) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = building.id;
  group.position.set(...building.position);
  group.rotation.y = building.rotationY;
  group.userData = {
    buildingId: building.id,
    buildingName: building.name,
  };

  addParkingAndAccess(group, materials);
  addLandscaping(group, materials);
  addPodium(group, building, materials);

  const towerTop = addTower(
    group,
    building,
    materials,
  );

  addRoofEquipment(group, towerTop, materials);
  addBuildingLabel(group, building, towerTop + 42);

  parent.add(group);

  return { group };
}
