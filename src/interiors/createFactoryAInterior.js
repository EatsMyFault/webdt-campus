import * as THREE from "three";

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

function createMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({
      color: 0x8d9998,
      roughness: 0.94,
    }),
    aisle: new THREE.MeshStandardMaterial({
      color: 0xe6bd42,
      roughness: 0.88,
    }),
    workZone: new THREE.MeshStandardMaterial({
      color: 0x4b9f93,
      transparent: true,
      opacity: 0.26,
      roughness: 0.85,
    }),
    machineBody: new THREE.MeshStandardMaterial({
      color: 0xe4e9e7,
      roughness: 0.6,
      metalness: 0.1,
    }),
    machineDark: new THREE.MeshStandardMaterial({
      color: 0x263c43,
      roughness: 0.5,
      metalness: 0.22,
    }),
    machineWindow: new THREE.MeshPhysicalMaterial({
      color: 0x316f83,
      transparent: true,
      opacity: 0.78,
      roughness: 0.15,
      metalness: 0.12,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x2b9c8c,
      roughness: 0.5,
      metalness: 0.08,
    }),
    conveyor: new THREE.MeshStandardMaterial({
      color: 0x4c6065,
      roughness: 0.62,
      metalness: 0.3,
    }),
    conveyorBelt: new THREE.MeshStandardMaterial({
      color: 0x243136,
      roughness: 0.86,
    }),
    rack: new THREE.MeshStandardMaterial({
      color: 0xe0a941,
      roughness: 0.55,
      metalness: 0.22,
    }),
    pallet: new THREE.MeshStandardMaterial({
      color: 0x987353,
      roughness: 0.92,
    }),
    crate: new THREE.MeshStandardMaterial({
      color: 0x668a93,
      roughness: 0.74,
    }),
    cabinet: new THREE.MeshStandardMaterial({
      color: 0x567078,
      roughness: 0.62,
      metalness: 0.2,
    }),
    crane: new THREE.MeshStandardMaterial({
      color: 0xe6ad2f,
      roughness: 0.48,
      metalness: 0.32,
    }),
    dustCollector: new THREE.MeshStandardMaterial({
      color: 0x4d8f99,
      roughness: 0.58,
      metalness: 0.18,
    }),
    compressor: new THREE.MeshStandardMaterial({
      color: 0x2f9e89,
      roughness: 0.55,
      metalness: 0.16,
    }),
    servicePipe: new THREE.MeshStandardMaterial({
      color: 0x73aeb8,
      roughness: 0.42,
      metalness: 0.34,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x596d72,
      roughness: 0.58,
      metalness: 0.38,
    }),
    light: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xeafcff,
      emissiveIntensity: 3.2,
      roughness: 0.2,
    }),
  };
}

function createStatusLamp(color) {
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.3,
      roughness: 0.28,
    }),
  );

  lamp.castShadow = false;
  return lamp;
}

function createDustCollector({ id, position, materials, status }) {
  const equipment = new THREE.Group();
  const statusColor = status === "warning" ? 0xf1b544 : 0x30d5a4;
  const hopper = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 1.25, 5, 20),
    materials.dustCollector,
  );
  const filterBody = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 8, 20),
    materials.dustCollector,
  );
  const exhaustDuct = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 4.5, 16),
    materials.servicePipe,
  );
  const inletDuct = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 8, 16),
    materials.servicePipe,
  );
  const lamp = createStatusLamp(statusColor);

  equipment.name = id;
  equipment.position.set(...position);
  equipment.userData = {
    equipmentId: id,
    equipmentType: "dust-collector",
    status,
  };

  hopper.name = `${id}-hopper`;
  hopper.position.y = 4.1;
  filterBody.name = `${id}-filter-body`;
  filterBody.position.y = 10.55;
  exhaustDuct.name = `${id}-exhaust-duct`;
  exhaustDuct.position.y = 16.8;
  inletDuct.name = `${id}-inlet-duct`;
  inletDuct.rotation.z = Math.PI / 2;
  inletDuct.position.set(5.2, 10, 0);
  lamp.name = `${id}-status-lamp`;
  lamp.scale.setScalar(2.2);
  lamp.position.set(3.3, 15.2, 2.7);

  equipment.add(
    createBox({
      name: `${id}-base`,
      size: [11, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    hopper,
    filterBody,
    exhaustDuct,
    inletDuct,
    lamp,
  );

  return equipment;
}

function createAirCompressor({ id, position, materials, status }) {
  const equipment = new THREE.Group();
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 19, 20),
    materials.compressor,
  );
  const outletPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 7, 14),
    materials.servicePipe,
  );
  const lamp = createStatusLamp(0x30d5a4);

  equipment.name = id;
  equipment.position.set(...position);
  equipment.userData = {
    equipmentId: id,
    equipmentType: "air-compressor",
    status,
  };

  tank.name = `${id}-receiver-tank`;
  tank.rotation.z = Math.PI / 2;
  tank.position.set(0, 4.2, 0);
  outletPipe.name = `${id}-outlet-pipe`;
  outletPipe.position.set(7, 9.5, 0);
  lamp.name = `${id}-status-lamp`;
  lamp.scale.setScalar(2.2);
  lamp.position.set(10.5, 11.2, 3.8);

  equipment.add(
    createBox({
      name: `${id}-base`,
      size: [29, 0.7, 13],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    tank,
    createBox({
      name: `${id}-compressor-body`,
      size: [9, 6.5, 8],
      position: [-4.5, 9.2, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-cooler`,
      size: [7, 5.2, 8],
      position: [7, 8.55, 0],
      material: materials.dustCollector,
    }),
    outletPipe,
    lamp,
  );

  return equipment;
}

function addAnnexSupportEquipment(group, materials) {
  const supportRoom = new THREE.Group();

  supportRoom.name = "factory-a-annex-support-equipment";
  supportRoom.add(
    createBox({
      name: "factory-a-annex-equipment-zone",
      size: [70, 0.05, 126],
      position: [-194.5, 0.97, -28],
      material: materials.workZone,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-annex-safety-aisle",
      size: [5, 0.06, 122],
      position: [-158, 0.99, -28],
      material: materials.aisle,
      castShadow: false,
    }),
    createDustCollector({
      id: "DUST-A-01",
      position: [-215, 1, -64],
      materials,
      status: "running",
    }),
    createDustCollector({
      id: "DUST-A-02",
      position: [-178, 1, -64],
      materials,
      status: "warning",
    }),
    createAirCompressor({
      id: "COMP-A-01",
      position: [-196, 1, -17],
      materials,
      status: "running",
    }),
  );

  group.add(supportRoom);
}

function createCncMachine({ id, position, materials, status }) {
  const machine = new THREE.Group();
  const statusColors = {
    running: 0x30d5a4,
    warning: 0xf1b544,
    idle: 0x94a6aa,
  };
  const statusColor = statusColors[status] ?? 0xe05d5d;

  machine.name = id;
  machine.position.set(...position);
  machine.userData = {
    equipmentId: id,
    equipmentType: "cnc",
    status,
  };

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-body`,
      size: [12.5, 6.7, 8.6],
      position: [0, 4, 0],
      material: materials.machineBody,
    }),
    createBox({
      name: `${id}-head`,
      size: [12.7, 1.1, 8.8],
      position: [0, 7.85, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-window`,
      size: [5.4, 3.5, 0.24],
      position: [-1.8, 4.25, 4.42],
      material: materials.machineWindow,
      castShadow: false,
    }),
    createBox({
      name: `${id}-controller`,
      size: [2.6, 4.1, 1.2],
      position: [5.25, 4.2, 4.55],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [1.7, 1.35, 0.16],
      position: [5.25, 4.75, 5.18],
      material: materials.accent,
      castShadow: false,
    }),
  );

  const lampPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
    materials.steel,
  );
  const lamp = createStatusLamp(statusColor);

  lampPole.position.set(5.1, 9.2, 2.7);
  lamp.position.set(5.1, 10.2, 2.7);
  machine.add(lampPole, lamp);

  return machine;
}

function addMachiningCells(group, materials) {
  const machinePositions = [];
  const machineStatuses = [
    "running",
    "running",
    "warning",
    "running",
    "idle",
    "running",
    "warning",
    "running",
  ];

  [-70, -25].forEach((z) => {
    [-135, -45, 45, 135].forEach((x) => {
      machinePositions.push([x, 0.82, z]);
    });
  });

  machinePositions.forEach((position, index) => {
    group.add(
      createBox({
        name: `cnc-work-zone-${index + 1}`,
        size: [17, 0.05, 13],
        position: [position[0], 0.94, position[2]],
        material: materials.workZone,
        castShadow: false,
      }),
      createCncMachine({
        id: `CNC-A-${String(index + 1).padStart(2, "0")}`,
        position,
        materials,
        status: machineStatuses[index],
      }),
    );
  });
}

function addAssemblyConveyor(group, materials) {
  const conveyor = new THREE.Group();

  conveyor.name = "factory-a-assembly-conveyor";
  conveyor.position.set(30, 0.8, 55);
  conveyor.userData = {
    equipmentId: "CONVEYOR-A-01",
    equipmentType: "conveyor",
    status: "running",
  };
  conveyor.add(
    createBox({
      name: "assembly-zone",
      size: [76, 0.05, 11],
      position: [0, 0.12, 0],
      material: materials.workZone,
      castShadow: false,
    }),
    createBox({
      name: "assembly-belt",
      size: [68, 0.65, 4.6],
      position: [0, 2.35, 0],
      material: materials.conveyorBelt,
    }),
  );

  for (let x = -32; x <= 32; x += 8) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 4.8, 12),
      materials.conveyor,
    );

    roller.name = "assembly-conveyor-roller";
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, 2.78, 0);
    roller.castShadow = true;
    conveyor.add(roller);
  }

  [-30, -15, 0, 15, 30].forEach((x) => {
    conveyor.add(
      createBox({
        name: "assembly-conveyor-leg",
        size: [0.65, 2.2, 4],
        position: [x, 1.2, 0],
        material: materials.conveyor,
      }),
    );
  });

  [-23, 5, 25].forEach((x, index) => {
    conveyor.add(
      createBox({
        name: `assembly-part-${index + 1}`,
        size: [4.5, 1.5 + index * 0.25, 3.2],
        position: [x, 3.65, 0],
        material: index === 1 ? materials.accent : materials.crate,
      }),
    );
  });

  group.add(conveyor);
}

function createStorageRack({ id, position, materials }) {
  const rack = new THREE.Group();

  rack.name = id;
  rack.position.set(...position);

  [-5.5, 5.5].forEach((x) => {
    [-1.8, 1.8].forEach((z) => {
      rack.add(
        createBox({
          name: `${id}-post`,
          size: [0.35, 8.5, 0.35],
          position: [x, 4.25, z],
          material: materials.rack,
        }),
      );
    });
  });

  [0.7, 3.4, 6.1].forEach((y, level) => {
    rack.add(
      createBox({
        name: `${id}-shelf-${level + 1}`,
        size: [11.5, 0.28, 4.2],
        position: [0, y, 0],
        material: materials.rack,
      }),
    );

    [-3.4, 0, 3.4].forEach((x, crateIndex) => {
      rack.add(
        createBox({
          name: `${id}-crate-${level + 1}-${crateIndex + 1}`,
          size: [2.7, 1.7, 3.1],
          position: [x, y + 1, 0],
          material: (level + crateIndex) % 2 === 0
            ? materials.crate
            : materials.pallet,
        }),
      );
    });
  });

  return rack;
}

function addStorageAndControls(group, materials) {
  [-140, -70, 0, 70, 140].forEach((x, index) => {
    group.add(
      createStorageRack({
        id: `RACK-A-${String(index + 1).padStart(2, "0")}`,
        position: [x, 0.85, -105],
        materials,
      }),
    );
  });

  [-72, -24, 24, 72].forEach((z, index) => {
    group.add(
      createBox({
        name: `electric-panel-a-${index + 1}`,
        size: [3.2, 6.8, 7.8],
        position: [198.5, 4.25, z],
        material: materials.cabinet,
      }),
      createBox({
        name: `electric-panel-screen-a-${index + 1}`,
        size: [0.18, 1.4, 2.2],
        position: [196.82, 4.9, z],
        material: materials.accent,
        castShadow: false,
      }),
    );
  });
}

function addOverheadCrane(group, materials) {
  group.add(
    createBox({
      name: "crane-left-rail",
      size: [1, 1.15, 238],
      position: [-145, 34, -5],
      material: materials.steel,
    }),
    createBox({
      name: "crane-right-rail",
      size: [1, 1.15, 238],
      position: [195, 34, -5],
      material: materials.steel,
    }),
    createBox({
      name: "crane-bridge",
      size: [341, 1.5, 1.7],
      position: [25, 35.1, -35],
      material: materials.crane,
    }),
    createBox({
      name: "crane-trolley",
      size: [5.5, 2.2, 4.2],
      position: [25, 33.95, -35],
      material: materials.steel,
    }),
  );

  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 14, 8),
    materials.steel,
  );
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.17, 8, 16, Math.PI * 1.5),
    materials.crane,
  );

  cable.name = "crane-cable";
  cable.position.set(25, 25.85, -35);
  hook.name = "crane-hook";
  hook.rotation.z = Math.PI / 2;
  hook.position.set(25, 18.55, -35);
  group.add(cable, hook);
}

function addFloorAndLighting(group, materials) {
  group.add(
    createBox({
      name: "factory-a-interior-floor",
      size: [420, 0.16, 250],
      position: [0, 0.86, -8],
      material: materials.floor,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-main-aisle",
      size: [395, 0.045, 7],
      position: [0, 0.97, 12],
      material: materials.aisle,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-door-aisle-1",
      size: [7, 0.05, 72],
      position: [-120.4, 0.98, 81],
      material: materials.aisle,
      castShadow: false,
    }),
    createBox({
      name: "factory-a-door-aisle-2",
      size: [7, 0.05, 72],
      position: [-50.4, 0.98, 81],
      material: materials.aisle,
      castShadow: false,
    }),
  );

  [-160, -80, 0, 80, 160].forEach((x) => {
    [-90, -30, 30, 90].forEach((z) => {
      group.add(
        createBox({
          name: "factory-a-led-light",
          size: [13, 0.22, 1.5],
          position: [x, 38.5, z],
          material: materials.light,
          castShadow: false,
        }),
      );
    });
  });

  [-140, -45, 50, 145].forEach((x) => {
    [-60, 50].forEach((z) => {
      const light = new THREE.PointLight(0xeafcff, 1.45, 175, 1.7);

      light.name = "factory-a-interior-light";
      light.position.set(x, 35, z);
      group.add(light);
    });
  });
}

export function createFactoryAInterior(parent) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = "factory-a-interior";
  addFloorAndLighting(group, materials);
  addMachiningCells(group, materials);
  addAssemblyConveyor(group, materials);
  addStorageAndControls(group, materials);
  addAnnexSupportEquipment(group, materials);
  addOverheadCrane(group, materials);
  parent.add(group);

  return group;
}
