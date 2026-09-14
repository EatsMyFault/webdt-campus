import * as THREE from "three";

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
    floor: new THREE.MeshStandardMaterial({
      color: 0x929c9a,
      roughness: 0.94,
    }),
    storageZone: new THREE.MeshStandardMaterial({
      color: 0x5f9c95,
      transparent: true,
      opacity: 0.2,
      roughness: 0.9,
    }),
    inboundZone: new THREE.MeshStandardMaterial({
      color: 0x4d9db6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.9,
    }),
    outboundZone: new THREE.MeshStandardMaterial({
      color: 0xd58b32,
      transparent: true,
      opacity: 0.3,
      roughness: 0.9,
    }),
    aisle: new THREE.MeshStandardMaterial({
      color: 0xe8c94e,
      roughness: 0.88,
    }),
    rack: new THREE.MeshStandardMaterial({
      color: 0x36545b,
      roughness: 0.56,
      metalness: 0.32,
    }),
    rackBeam: new THREE.MeshStandardMaterial({
      color: 0xd58b32,
      roughness: 0.55,
      metalness: 0.2,
    }),
    pallet: new THREE.MeshStandardMaterial({
      color: 0x9b7751,
      roughness: 0.94,
    }),
    cartonBlue: new THREE.MeshStandardMaterial({
      color: 0x4e8597,
      roughness: 0.78,
    }),
    cartonGreen: new THREE.MeshStandardMaterial({
      color: 0x4f8d73,
      roughness: 0.78,
    }),
    cartonOrange: new THREE.MeshStandardMaterial({
      color: 0xc98335,
      roughness: 0.8,
    }),
    equipment: new THREE.MeshStandardMaterial({
      color: 0x344b52,
      roughness: 0.6,
      metalness: 0.22,
    }),
    forklift: new THREE.MeshStandardMaterial({
      color: 0xe2a62e,
      roughness: 0.56,
      metalness: 0.12,
    }),
    agv: new THREE.MeshStandardMaterial({
      color: 0x2f9e89,
      roughness: 0.52,
      metalness: 0.18,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x49d7cf,
      emissive: 0x1e8f89,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
    wheel: new THREE.MeshStandardMaterial({
      color: 0x1d272b,
      roughness: 0.92,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe8fbff,
      emissiveIntensity: 2.8,
      roughness: 0.2,
    }),
  };
}

function addFloorAndZones(group, materials) {
  group.add(
    createBox({
      name: "logistics-interior-floor",
      size: [418, 0.16, 168],
      position: [0, 0.9, -35],
      material: materials.floor,
      castShadow: false,
    }),
    createBox({
      name: "logistics-storage-zone",
      size: [392, 0.05, 112],
      position: [0, 1, -61],
      material: materials.storageZone,
      castShadow: false,
    }),
    createBox({
      name: "logistics-inbound-zone",
      size: [176, 0.06, 34],
      position: [-108, 1.02, 27],
      material: materials.inboundZone,
      castShadow: false,
    }),
    createBox({
      name: "logistics-outbound-zone",
      size: [176, 0.06, 34],
      position: [108, 1.02, 27],
      material: materials.outboundZone,
      castShadow: false,
    }),
    createBox({
      name: "logistics-cross-aisle",
      size: [400, 0.06, 5],
      position: [0, 1.05, 7],
      material: materials.aisle,
      castShadow: false,
    }),
  );
}

function createRackRow({
  name,
  x,
  materials,
  colorOffset,
}) {
  const rack = new THREE.Group();
  const cartonMaterials = [
    materials.cartonBlue,
    materials.cartonGreen,
    materials.cartonOrange,
  ];

  rack.name = name;
  rack.position.set(x, 1, -61);

  [-12.5, 12.5].forEach((postX) => {
    [-50, -25, 0, 25, 50].forEach((postZ, index) => {
      rack.add(
        createBox({
          name: `${name}-post-${index + 1}`,
          size: [0.7, 22, 0.7],
          position: [postX, 11, postZ],
          material: materials.rack,
        }),
      );
    });
  });

  [1.2, 6.6, 12, 17.4].forEach((levelY, levelIndex) => {
    rack.add(
      createBox({
        name: `${name}-shelf-${levelIndex + 1}`,
        size: [26, 0.6, 103],
        position: [0, levelY, 0],
        material: materials.rackBeam,
      }),
    );

    [-38, -12, 14, 40].forEach((palletZ, palletIndex) => {
      const cartonMaterial =
        cartonMaterials[
          (levelIndex + palletIndex + colorOffset) %
          cartonMaterials.length
        ];

      rack.add(
        createBox({
          name: `${name}-pallet-${levelIndex + 1}-${palletIndex + 1}`,
          size: [21, 0.7, 17],
          position: [0, levelY + 0.65, palletZ],
          material: materials.pallet,
        }),
        createBox({
          name: `${name}-cargo-${levelIndex + 1}-${palletIndex + 1}`,
          size: [18, 3.4 + (palletIndex % 2), 14],
          position: [
            0,
            levelY + 2.7 + (palletIndex % 2) * 0.5,
            palletZ,
          ],
          material: cartonMaterial,
        }),
      );
    });
  });

  return rack;
}

function addHighBayStorage(group, materials) {
  [-160, -95, -30, 35, 100, 165].forEach((x, index) => {
    group.add(
      createRackRow({
        name: `logistics-rack-row-${index + 1}`,
        x,
        materials,
        colorOffset: index,
      }),
    );
  });

  [-127.5, -62.5, 2.5, 67.5, 132.5].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-rack-aisle-${index + 1}`,
        size: [5, 0.055, 108],
        position: [x, 1.04, -61],
        material: materials.aisle,
        castShadow: false,
      }),
    );
  });
}

function createPackingStation({ name, position, materials }) {
  const station = new THREE.Group();

  station.name = name;
  station.position.set(...position);
  station.add(
    createBox({
      name: `${name}-table`,
      size: [19, 1, 7],
      position: [0, 4, 0],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-left-leg`,
      size: [0.8, 4, 0.8],
      position: [-8, 2, 0],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-right-leg`,
      size: [0.8, 4, 0.8],
      position: [8, 2, 0],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-terminal`,
      size: [5, 4.5, 1],
      position: [5.5, 7, -2],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-screen`,
      size: [3.8, 2.4, 0.25],
      position: [5.5, 7.2, -2.6],
      material: materials.screen,
      castShadow: false,
    }),
    createBox({
      name: `${name}-parcel`,
      size: [5.5, 3.5, 4.5],
      position: [-3, 6.2, 0],
      material: materials.cartonOrange,
    }),
  );

  return station;
}

function addStagingAndPacking(group, materials) {
  [-165, -135, -105, -75, -45].forEach((x, index) => {
    group.add(
      createBox({
        name: `logistics-inbound-pallet-${index + 1}`,
        size: [18, 0.7, 13],
        position: [x, 1.4, 27],
        material: materials.pallet,
      }),
      createBox({
        name: `logistics-inbound-cargo-${index + 1}`,
        size: [15, 4 + (index % 3), 10],
        position: [x, 3.75 + (index % 3) * 0.5, 27],
        material: index % 2
          ? materials.cartonBlue
          : materials.cartonGreen,
      }),
    );
  });

  [45, 85, 125, 165].forEach((x, index) => {
    group.add(
      createPackingStation({
        name: `logistics-packing-station-${index + 1}`,
        position: [x, 1, 26],
        materials,
      }),
    );
  });
}

function createForklift({ name, position, rotationY, materials }) {
  const forklift = new THREE.Group();

  forklift.name = name;
  forklift.position.set(...position);
  forklift.rotation.y = rotationY;
  forklift.add(
    createBox({
      name: `${name}-body`,
      size: [8, 4.5, 11],
      position: [0, 3.1, 0],
      material: materials.forklift,
    }),
    createBox({
      name: `${name}-counterweight`,
      size: [8.4, 5.5, 4],
      position: [0, 4, 4],
      material: materials.forklift,
    }),
    createBox({
      name: `${name}-mast-left`,
      size: [0.8, 12, 0.8],
      position: [-3, 7, -5.3],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-mast-right`,
      size: [0.8, 12, 0.8],
      position: [3, 7, -5.3],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-fork-left`,
      size: [0.7, 0.45, 8],
      position: [-2.4, 1.1, -9],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-fork-right`,
      size: [0.7, 0.45, 8],
      position: [2.4, 1.1, -9],
      material: materials.equipment,
    }),
  );

  [-4.2, 4.2].forEach((wheelX) => {
    [-3.5, 3.5].forEach((wheelZ) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.65, 1, 14),
        materials.wheel,
      );

      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wheelX, 1.7, wheelZ);
      wheel.castShadow = true;
      forklift.add(wheel);
    });
  });

  return forklift;
}

function createAgv({ name, position, materials }) {
  const agv = new THREE.Group();

  agv.name = name;
  agv.position.set(...position);
  agv.add(
    createBox({
      name: `${name}-body`,
      size: [10, 1.8, 14],
      position: [0, 1.1, 0],
      material: materials.agv,
    }),
    createBox({
      name: `${name}-deck`,
      size: [8.5, 0.5, 11],
      position: [0, 2.25, 0],
      material: materials.equipment,
    }),
    createBox({
      name: `${name}-indicator`,
      size: [5, 0.22, 0.3],
      position: [0, 2.6, 6.8],
      material: materials.screen,
      castShadow: false,
    }),
  );

  return agv;
}

function addMaterialHandling(group, materials) {
  group.add(
    createForklift({
      name: "logistics-forklift-1",
      position: [-128, 1, -4],
      rotationY: -0.18,
      materials,
    }),
    createForklift({
      name: "logistics-forklift-2",
      position: [132, 1, -10],
      rotationY: Math.PI + 0.12,
      materials,
    }),
    createAgv({
      name: "logistics-agv-1",
      position: [2.5, 1, -94],
      materials,
    }),
    createAgv({
      name: "logistics-agv-2",
      position: [2.5, 1, -53],
      materials,
    }),
    createAgv({
      name: "logistics-agv-3",
      position: [2.5, 1, -12],
      materials,
    }),
  );
}

function addLighting(group, materials) {
  [-150, -75, 0, 75, 150].forEach((x) => {
    [-92, -38, 16].forEach((z) => {
      group.add(
        createBox({
          name: "logistics-interior-led-light",
          size: [14, 0.25, 1.6],
          position: [x, 37.5, z],
          material: materials.light,
          castShadow: false,
        }),
      );
    });
  });

  [-135, 0, 135].forEach((x) => {
    [-78, 0].forEach((z) => {
      const light = new THREE.PointLight(
        0xf1fbff,
        1.25,
        150,
        1.8,
      );

      light.name = "logistics-interior-point-light";
      light.position.set(x, 34, z);
      group.add(light);
    });
  });
}

export function createLogisticsCenterInterior(parent) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = "logistics-center-interior";
  addFloorAndZones(group, materials);
  addHighBayStorage(group, materials);
  addStagingAndPacking(group, materials);
  addMaterialHandling(group, materials);
  addLighting(group, materials);
  parent.add(group);

  return group;
}
