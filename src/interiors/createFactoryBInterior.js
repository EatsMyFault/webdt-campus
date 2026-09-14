import * as THREE from "three";

const STATUS_COLORS = {
  running: 0x35d3a3,
  warning: 0xf1b544,
  idle: 0x94a6aa,
  stopped: 0xe05d5d,
};

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
      color: 0x919b99,
      roughness: 0.94,
    }),
    assemblyZone: new THREE.MeshStandardMaterial({
      color: 0x4cb28e,
      transparent: true,
      opacity: 0.24,
      roughness: 0.82,
    }),
    agvLane: new THREE.MeshStandardMaterial({
      color: 0x4c98b5,
      roughness: 0.78,
    }),
    safetyLine: new THREE.MeshStandardMaterial({
      color: 0xe9bc42,
      roughness: 0.85,
    }),
    conveyorFrame: new THREE.MeshStandardMaterial({
      color: 0x52666b,
      roughness: 0.55,
      metalness: 0.35,
    }),
    conveyorBelt: new THREE.MeshStandardMaterial({
      color: 0x27363a,
      roughness: 0.86,
    }),
    robot: new THREE.MeshStandardMaterial({
      color: 0xe3a834,
      roughness: 0.42,
      metalness: 0.25,
    }),
    robotJoint: new THREE.MeshStandardMaterial({
      color: 0x31484f,
      roughness: 0.44,
      metalness: 0.4,
    }),
    station: new THREE.MeshStandardMaterial({
      color: 0x668188,
      roughness: 0.62,
      metalness: 0.18,
    }),
    stationDark: new THREE.MeshStandardMaterial({
      color: 0x2b4147,
      roughness: 0.6,
      metalness: 0.25,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x40c9b1,
      emissive: 0x1f8c7c,
      emissiveIntensity: 0.85,
      roughness: 0.2,
    }),
    rack: new THREE.MeshStandardMaterial({
      color: 0x3e7f75,
      roughness: 0.58,
      metalness: 0.18,
    }),
    binBlue: new THREE.MeshStandardMaterial({
      color: 0x4d819b,
      roughness: 0.75,
    }),
    binOrange: new THREE.MeshStandardMaterial({
      color: 0xd79543,
      roughness: 0.75,
    }),
    inspection: new THREE.MeshStandardMaterial({
      color: 0x89a5aa,
      roughness: 0.58,
      metalness: 0.2,
    }),
    cage: new THREE.MeshStandardMaterial({
      color: 0xe0b441,
      roughness: 0.52,
      metalness: 0.24,
    }),
    agv: new THREE.MeshStandardMaterial({
      color: 0x344c53,
      roughness: 0.55,
      metalness: 0.3,
    }),
  };
}

function createCylinderBetween({ name, start, end, radius, material }) {
  const startPoint = new THREE.Vector3(...start);
  const endPoint = new THREE.Vector3(...end);
  const direction = endPoint.clone().sub(startPoint);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 14),
    material,
  );

  mesh.name = name;
  mesh.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.castShadow = true;

  return mesh;
}

function createStatusLight(color) {
  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 12, 8),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    }),
  );

  light.castShadow = false;
  return light;
}

function createRobotArm({ id, position, rotationY, materials, status }) {
  const robot = new THREE.Group();
  const joints = [
    [0, 1.6, 0],
    [0.4, 4.5, 0],
    [2.6, 6.6, 0],
    [3.8, 5.7, 0],
  ];

  robot.name = id;
  robot.position.set(...position);
  robot.rotation.y = rotationY;
  robot.userData = {
    equipmentId: id,
    equipmentType: "assembly-robot",
    status,
  };

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.7, 0.8, 20),
    materials.robotJoint,
  );

  base.position.y = 0.55;
  base.castShadow = true;
  robot.add(base);

  for (let index = 0; index < joints.length - 1; index += 1) {
    robot.add(
      createCylinderBetween({
        name: `${id}-arm-${index + 1}`,
        start: joints[index],
        end: joints[index + 1],
        radius: index === 0 ? 0.62 : 0.48,
        material: materials.robot,
      }),
    );
  }

  joints.forEach((point, index) => {
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(index === 0 ? 0.82 : 0.66, 16, 12),
      materials.robotJoint,
    );

    joint.name = `${id}-joint-${index + 1}`;
    joint.position.set(...point);
    joint.castShadow = true;
    robot.add(joint);
  });

  const gripper = createBox({
    name: `${id}-gripper`,
    size: [1.3, 0.35, 1],
    position: [4.2, 5.45, 0],
    material: materials.robotJoint,
  });

  robot.add(gripper);

  const statusLight = createStatusLight(
    STATUS_COLORS[status] ?? STATUS_COLORS.stopped,
  );

  statusLight.position.set(-1.15, 1.35, 1.05);
  robot.add(statusLight);

  return robot;
}

function createConveyorModule({
  name,
  axis,
  length,
  width,
  position,
  materials,
}) {
  const conveyor = new THREE.Group();
  const isHorizontal = axis === "x";
  const railOffset = width / 2 + 0.15;

  conveyor.name = name;
  conveyor.position.set(...position);
  conveyor.add(
    createBox({
      name: `${name}-belt`,
      size: isHorizontal
        ? [length, 0.65, width]
        : [width, 0.65, length],
      position: [0, 2.35, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${name}-rail-1`,
      size: isHorizontal
        ? [length + 2, 1.15, 0.35]
        : [0.35, 1.15, length + 2],
      position: isHorizontal
        ? [0, 2.65, -railOffset]
        : [-railOffset, 2.65, 0],
      material: materials.conveyorFrame,
    }),
    createBox({
      name: `${name}-rail-2`,
      size: isHorizontal
        ? [length + 2, 1.15, 0.35]
        : [0.35, 1.15, length + 2],
      position: isHorizontal
        ? [0, 2.65, railOffset]
        : [railOffset, 2.65, 0],
      material: materials.conveyorFrame,
    }),
  );

  for (
    let distance = -length / 2 + 7;
    distance <= length / 2 - 7;
    distance += 8
  ) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.28,
        0.28,
        width + 0.15,
        12,
      ),
      materials.conveyorFrame,
    );

    roller.name = `${name}-roller`;
    roller.rotation[isHorizontal ? "x" : "z"] =
      Math.PI / 2;
    roller.position.set(
      isHorizontal ? distance : 0,
      2.78,
      isHorizontal ? 0 : distance,
    );
    roller.castShadow = true;
    conveyor.add(roller);
  }

  for (
    let distance = -length / 2 + 10;
    distance <= length / 2 - 10;
    distance += 24
  ) {
    const supportOffset = width / 2 - 0.55;

    conveyor.add(
      createBox({
        name: `${name}-support-1`,
        size: [0.5, 2.2, 0.5],
        position: isHorizontal
          ? [distance, 1.2, -supportOffset]
          : [-supportOffset, 1.2, distance],
        material: materials.conveyorFrame,
      }),
      createBox({
        name: `${name}-support-2`,
        size: [0.5, 2.2, 0.5],
        position: isHorizontal
          ? [distance, 1.2, supportOffset]
          : [supportOffset, 1.2, distance],
        material: materials.conveyorFrame,
      }),
    );
  }

  return conveyor;
}

function createAssemblyLine({ id, z, materials, status, robotStatuses }) {
  const line = new THREE.Group();

  line.name = id;
  line.position.z = z;
  line.userData = {
    equipmentId: id,
    equipmentType: "assembly-line",
    status,
  };

  line.add(
    createBox({
      name: `${id}-zone`,
      size: [315, 0.05, 20],
      position: [-16, 0.97, 0],
      material: materials.assemblyZone,
      castShadow: false,
    }),
    createConveyorModule({
      name: `${id}-main-conveyor`,
      axis: "x",
      length: 285,
      width: 6,
      position: [-15, 0, 0],
      materials,
    }),
    createBox({
      name: `${id}-infeed-bridge`,
      size: [12, 0.5, 5.8],
      position: [-163.5, 2.35, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${id}-transfer-bridge`,
      size: [8, 0.5, 5.8],
      position: [131.5, 2.35, 0],
      material: materials.conveyorBelt,
    }),
  );

  [-118, -18, 91].forEach((x, partIndex) => {
    line.add(
      createBox({
        name: `${id}-workpiece-${partIndex + 1}`,
        size: [3.8, 1.2 + partIndex * 0.25, 3.6],
        position: [x, 3.45, 0],
        material: partIndex === 1 ? materials.binOrange : materials.binBlue,
      }),
    );
  });

  line.add(
    createRobotArm({
      id: `${id}-ROBOT-01`,
      position: [-70, 0.95, -8],
      rotationY: -Math.PI / 2,
      materials,
      status: robotStatuses[0],
    }),
    createRobotArm({
      id: `${id}-ROBOT-02`,
      position: [42, 0.95, 8],
      rotationY: Math.PI / 2,
      materials,
      status: robotStatuses[1],
    }),
  );

  return line;
}

function addAssemblyLines(group, materials) {
  const lineConfigs = [
    { z: -65, status: "running", robotStatuses: ["running", "running"] },
    { z: 0, status: "warning", robotStatuses: ["warning", "running"] },
    { z: 65, status: "stopped", robotStatuses: ["idle", "idle"] },
  ];

  lineConfigs.forEach((config, index) => {
    group.add(
      createAssemblyLine({
        id: `ASSEMBLY-B-${String(index + 1).padStart(2, "0")}`,
        z: config.z,
        materials,
        status: config.status,
        robotStatuses: config.robotStatuses,
      }),
    );
  });
}

function addLineTransferSystem(group, materials) {
  const transferSystem = new THREE.Group();

  transferSystem.name = "factory-b-line-transfer-system";
  transferSystem.add(
    createConveyorModule({
      name: "factory-b-line-merge-conveyor",
      axis: "z",
      length: 146,
      width: 8,
      position: [139, 0, 0],
      materials,
    }),
    createConveyorModule({
      name: "factory-b-quality-infeed",
      axis: "x",
      length: 34,
      width: 6,
      position: [160, 0, 0],
      materials,
    }),
    createBox({
      name: "factory-b-finished-goods-zone",
      size: [24, 0.05, 23],
      position: [198, 0.97, -84],
      material: materials.assemblyZone,
      castShadow: false,
    }),
  );

  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(5.2, 5.2, 0.65, 24),
    materials.conveyorBelt,
  );

  turntable.name = "factory-b-quality-outfeed-turntable";
  turntable.position.set(198, 2.35, 0);
  turntable.castShadow = true;
  transferSystem.add(
    turntable,
    createConveyorModule({
      name: "factory-b-agv-outfeed",
      axis: "z",
      length: 100,
      width: 6,
      position: [198, 0, -50],
      materials,
    }),
    createBox({
      name: "factory-b-quality-outfeed-bridge",
      size: [14, 0.55, 5.8],
      position: [190, 2.35, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: "factory-b-finished-product",
      size: [4.8, 2, 4.2],
      position: [198, 3.65, -84],
      material: materials.binBlue,
    }),
  );

  group.add(transferSystem);
}

function createPreparationStation({ id, position, materials, status }) {
  const station = new THREE.Group();

  station.name = id;
  station.position.set(...position);
  station.userData = {
    equipmentId: id,
    equipmentType: "preparation-station",
    status,
  };
  station.add(
    createBox({
      name: `${id}-bench`,
      size: [13, 1, 5.5],
      position: [0, 2.4, 0],
      material: materials.station,
    }),
    createBox({
      name: `${id}-backboard`,
      size: [13, 4.6, 0.5],
      position: [0, 4.9, -2.5],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [3.2, 1.8, 0.18],
      position: [2.8, 5.2, -2.18],
      material: materials.screen,
      castShadow: false,
    }),
  );

  [-4, 0, 4].forEach((x, index) => {
    station.add(
      createBox({
        name: `${id}-parts-bin-${index + 1}`,
        size: [2.8, 1.5, 2.6],
        position: [x, 3.65, 0.4],
        material: index % 2 === 0 ? materials.binBlue : materials.binOrange,
      }),
    );
  });

  const lamp = createStatusLight(
    STATUS_COLORS[status] ?? STATUS_COLORS.stopped,
  );

  lamp.position.set(5.2, 7.5, -2.3);
  station.add(lamp);

  return station;
}

function addPreparationArea(group, materials) {
  const stationConfigs = [
    { z: -65, status: "running" },
    { z: 0, status: "warning" },
    { z: 65, status: "idle" },
  ];

  stationConfigs.forEach((config, index) => {
    group.add(
      createPreparationStation({
        id: `PREP-B-${String(index + 1).padStart(2, "0")}`,
        position: [-175, 0.95, config.z],
        materials,
        status: config.status,
      }),
    );
  });
}

function addInspectionCell(group, materials) {
  const cell = new THREE.Group();

  cell.name = "QUALITY-B-01";
  cell.position.set(180, 0.95, 0);
  cell.userData = {
    equipmentId: "QUALITY-B-01",
    equipmentType: "quality-inspection",
    status: "warning",
  };

  cell.add(
    createBox({
      name: "quality-cell-zone",
      size: [19, 0.05, 15],
      position: [0, 0.03, 0],
      material: materials.assemblyZone,
      castShadow: false,
    }),
    createBox({
      name: "quality-cell-table",
      size: [8, 1, 7],
      position: [0, 2.5, 0],
      material: materials.inspection,
    }),
    createBox({
      name: "quality-cell-scanner",
      size: [5.5, 5.8, 1.2],
      position: [0, 5.4, -1.6],
      material: materials.stationDark,
    }),
    createBox({
      name: "quality-cell-screen",
      size: [3.3, 2, 0.2],
      position: [0, 5.8, -0.92],
      material: materials.screen,
      castShadow: false,
    }),
  );

  [-8, 8].forEach((x) => {
    [-6, 6].forEach((z) => {
      cell.add(
        createBox({
          name: "quality-cell-cage-post",
          size: [0.35, 7.5, 0.35],
          position: [x, 3.8, z],
          material: materials.cage,
        }),
      );
    });
  });

  const statusLight = createStatusLight(STATUS_COLORS.warning);

  statusLight.position.set(3.4, 7.2, -0.8);
  cell.add(statusLight);

  group.add(cell);
}

function createAgv({ id, position, materials, status }) {
  const agv = new THREE.Group();

  agv.name = id;
  agv.position.set(...position);
  agv.userData = {
    equipmentId: id,
    equipmentType: "agv",
    status,
  };
  agv.add(
    createBox({
      name: `${id}-base`,
      size: [7, 1.1, 4.5],
      position: [0, 0.75, 0],
      material: materials.agv,
    }),
    createBox({
      name: `${id}-cargo`,
      size: [5.4, 1.8, 3.4],
      position: [0, 2.15, 0],
      material: materials.binBlue,
    }),
  );

  const light = createStatusLight(
    STATUS_COLORS[status] ?? STATUS_COLORS.stopped,
  );

  light.position.set(3.2, 1.3, 2.1);
  agv.add(light);

  return agv;
}

function addAgvArea(group, materials) {
  group.add(
    createBox({
      name: "factory-b-agv-lane",
      size: [400, 0.05, 7],
      position: [0, 0.97, -105],
      material: materials.agvLane,
      castShadow: false,
    }),
    createBox({
      name: "factory-b-agv-safety-line-front",
      size: [400, 0.055, 0.35],
      position: [0, 0.99, -101.35],
      material: materials.safetyLine,
      castShadow: false,
    }),
    createBox({
      name: "factory-b-agv-safety-line-rear",
      size: [400, 0.055, 0.35],
      position: [0, 0.99, -108.65],
      material: materials.safetyLine,
      castShadow: false,
    }),
    createAgv({
      id: "AGV-B-01",
      position: [-110, 0.98, -105],
      materials,
      status: "running",
    }),
    createAgv({
      id: "AGV-B-02",
      position: [175, 0.98, -105],
      materials,
      status: "idle",
    }),
  );
}

function addControlCabinets(group, materials) {
  [-75, -25, 25, 75].forEach((z, index) => {
    group.add(
      createBox({
        name: `factory-b-control-cabinet-${index + 1}`,
        size: [3.4, 6.8, 8.5],
        position: [-205, 4.35, z],
        material: materials.station,
      }),
      createBox({
        name: `factory-b-control-screen-${index + 1}`,
        size: [0.2, 1.5, 2.4],
        position: [-203.18, 5, z],
        material: materials.screen,
        castShadow: false,
      }),
    );
  });
}

function addFloorAndLights(group, materials) {
  group.add(
    createBox({
      name: "factory-b-interior-floor",
      size: [430, 0.16, 250],
      position: [0, 0.86, -5],
      material: materials.floor,
      castShadow: false,
    }),
    createBox({
      name: "factory-b-main-safety-aisle",
      size: [400, 0.05, 7],
      position: [0, 0.97, 100],
      material: materials.safetyLine,
      castShadow: false,
    }),
  );

  [-150, -50, 50, 150].forEach((x) => {
    [-55, 55].forEach((z) => {
      const light = new THREE.PointLight(0xebfcff, 1.4, 170, 1.7);

      light.name = "factory-b-interior-light";
      light.position.set(x, 34.5, z);
      group.add(light);
    });
  });
}

export function createFactoryBInterior(parent) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = "factory-b-interior";
  addFloorAndLights(group, materials);
  addAssemblyLines(group, materials);
  addPreparationArea(group, materials);
  addLineTransferSystem(group, materials);
  addInspectionCell(group, materials);
  addAgvArea(group, materials);
  addControlCabinets(group, materials);
  parent.add(group);

  return group;
}
