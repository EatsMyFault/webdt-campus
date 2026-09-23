import * as THREE from "three";

/*
 * 팩 조립동(PA-01) 내부.
 *
 * 공정 순서대로 남쪽에서 북쪽으로 한 행씩 올라간다.
 *
 *   z = -105  AGV 운반 레인
 *   z =  -75  5공정 트레이·쿨링플레이트, BMS·BDU 장착
 *   z =  -25  6공정 모듈 장착과 고전압 결선
 *   z =    0  공정 간 이송 컨베이어
 *   z =   25  7공정 실링·냉각수 주입·기밀검사
 *   z =   75  8공정 팩 EOL 시험과 각인
 *
 * 여기서 만드는 equipmentId 는 packAssemblyEquipmentData.js 의
 * 설비 id 와 반드시 같아야 상세정보와 상태등이 연결된다.
 */

const STATUS_COLORS = {
  running: 0x35d3a3,
  warning: 0xf1b544,
  idle: 0x94a6aa,
  stopped: 0xe05d5d,
};

function statusColor(status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.stopped;
}

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

    /* 팩 트레이와 커버는 알루미늄이라 밝고 반사가 있다 */
    packTray: new THREE.MeshStandardMaterial({
      color: 0xaebcc2,
      roughness: 0.38,
      metalness: 0.58,
    }),
    module: new THREE.MeshStandardMaterial({
      color: 0x6d8f9c,
      roughness: 0.46,
      metalness: 0.42,
    }),
    /* 고전압 계통은 주황색으로 표시하는 것이 현장 관례다 */
    highVoltage: new THREE.MeshStandardMaterial({
      color: 0xe0913a,
      roughness: 0.5,
      metalness: 0.15,
    }),
    sealant: new THREE.MeshStandardMaterial({
      color: 0x3f6f8c,
      roughness: 0.62,
      metalness: 0.12,
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

function createMachineGroup({
  id,
  type,
  position,
  rotationY = 0,
  status,
}) {
  const machine = new THREE.Group();

  machine.name = id;
  machine.position.set(...position);
  machine.rotation.y = rotationY;
  machine.userData = {
    equipmentId: id,
    equipmentType: type,
    status,
  };

  return machine;
}

function addStatusLight(machine, status, position) {
  const light = createStatusLight(statusColor(status));

  light.name = `${machine.name}-status-light`;
  light.position.set(...position);
  light.scale.setScalar(1.8);
  machine.add(light);
}


/*
 * 5공정 · 팩 트레이 세정·검사기
 *
 * 트레이가 터널을 통과하며 가공 이물을 씻어 내고
 * 나오는 쪽에서 실링면 평탄도를 잰다.
 */
function createTrayWasher({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "tray-washer",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [17, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-tunnel`,
      size: [13, 6.4, 9.4],
      position: [0, 4.2, 0],
      material: materials.inspection,
    }),
    createBox({
      name: `${id}-infeed`,
      size: [4.4, 0.5, 6],
      position: [-8.4, 2.8, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${id}-outfeed`,
      size: [4.4, 0.5, 6],
      position: [8.4, 2.8, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${id}-tray`,
      size: [5.6, 0.8, 5],
      position: [8.4, 3.45, 0],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-screen`,
      size: [2.6, 1.6, 0.18],
      position: [3, 6, 4.8],
      material: materials.screen,
      castShadow: false,
    }),
  );

  addStatusLight(machine, status, [6, 8.2, 3.6]);

  return machine;
}


/*
 * 5공정 · 열전도 접착제 디스펜서
 *
 * 갠트리가 쿨링플레이트 위를 지나며 접착제 비드를 깐다.
 */
function createTimDispenser({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "tim-dispenser",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [15, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-work-table`,
      size: [11, 0.7, 8.4],
      position: [0, 2.9, 0],
      material: materials.station,
    }),
    createBox({
      name: `${id}-cooling-plate`,
      size: [9, 0.5, 6.8],
      position: [0, 3.5, 0],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-gantry-beam`,
      size: [13, 1.2, 1.6],
      position: [0, 8.4, 0],
      material: materials.station,
    }),
    createBox({
      name: `${id}-nozzle-head`,
      size: [1.8, 2.4, 1.8],
      position: [1.6, 6.8, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-adhesive-drum`,
      size: [3.2, 4.4, 3.2],
      position: [6, 3.9, -3],
      material: materials.binOrange,
    }),
  );

  [-6.2, 6.2].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-gantry-column-${index + 1}`,
        size: [1.1, 8, 1.1],
        position: [x, 4.4, 0],
        material: materials.station,
      }),
    );
  });

  addStatusLight(machine, status, [6.6, 9.2, 2.6]);

  return machine;
}


/*
 * 6공정 · 모듈 장착 로봇
 *
 * 모듈 하나가 38kg 를 넘어 사람이 들 수 없다.
 */
function createMountingRobot({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "mounting-robot",
    position,
    rotationY,
    status,
  });

  const joints = [
    [0, 1.6, 0],
    [0.4, 4.5, 0],
    [2.6, 6.6, 0],
    [3.8, 5.7, 0],
  ];

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.7, 0.8, 20),
    materials.robotJoint,
  );

  base.name = `${id}-base`;
  base.position.y = 0.55;
  base.castShadow = true;
  machine.add(base);

  for (let index = 0; index < joints.length - 1; index += 1) {
    machine.add(
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
    machine.add(joint);
  });

  machine.add(
    createBox({
      name: `${id}-module-gripper`,
      size: [2.4, 0.5, 2.2],
      position: [4.4, 5.35, 0],
      material: materials.robotJoint,
    }),
    createBox({
      name: `${id}-held-module`,
      size: [3.4, 1.4, 2.6],
      position: [4.4, 4.4, 0],
      material: materials.module,
    }),
  );

  addStatusLight(machine, status, [-1.15, 1.35, 1.05]);

  return machine;
}


/*
 * 6공정 · 고전압 버스바 체결기
 *
 * 체결 토크를 전수 기록해야 해서 스테이션마다 제어반이 붙는다.
 */
function createTorqueStation({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "torque-station",
    position,
    rotationY,
    status,
  });

  const torqueArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 7.4, 12),
    materials.station,
  );

  torqueArm.name = `${id}-torque-arm`;
  torqueArm.rotation.z = Math.PI / 2.4;
  torqueArm.position.set(1.8, 6.6, 0);

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-work-table`,
      size: [11, 0.8, 7.8],
      position: [-0.5, 2.9, 0],
      material: materials.station,
    }),
    createBox({
      name: `${id}-pack-tray`,
      size: [9.4, 1.1, 6.4],
      position: [-0.5, 3.75, 0],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-busbar`,
      size: [8.4, 0.35, 0.9],
      position: [-0.5, 4.45, 0],
      material: materials.highVoltage,
    }),
    createBox({
      name: `${id}-control-column`,
      size: [2.2, 8.4, 2.2],
      position: [5.6, 4.6, -2.8],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [2.4, 1.7, 0.2],
      position: [5.6, 6.6, -1.6],
      material: materials.screen,
      castShadow: false,
    }),
    torqueArm,
  );

  addStatusLight(machine, status, [5.6, 9.2, -2.8]);

  return machine;
}


/*
 * 6공정 · BMS·BDU 장착 스테이션
 *
 * 제어모듈을 얹고 펌웨어를 구운 뒤 통신이 붙는지 확인한다.
 */
function createBmsStation({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "bms-station",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-bench`,
      size: [11.5, 1, 6.4],
      position: [0, 2.9, 0.6],
      material: materials.station,
    }),
    createBox({
      name: `${id}-backboard`,
      size: [12, 5.4, 0.5],
      position: [0, 5.6, -3.2],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-comm-tester-rack`,
      size: [3, 6.6, 3],
      position: [5.4, 4.2, -1.4],
      material: materials.rack,
    }),
    createBox({
      name: `${id}-screen`,
      size: [3.4, 2, 0.2],
      position: [-1.6, 6, -2.9],
      material: materials.screen,
      castShadow: false,
    }),
    createBox({
      name: `${id}-bms-unit`,
      size: [4.2, 0.9, 3.2],
      position: [-1.6, 3.85, 0.6],
      material: materials.module,
    }),
    createBox({
      name: `${id}-bdu-unit`,
      size: [2.6, 1.2, 2.6],
      position: [3.2, 4, 0.6],
      material: materials.highVoltage,
    }),
  );

  addStatusLight(machine, status, [5.4, 8.2, -1.4]);

  return machine;
}


/*
 * 7공정 · 커버 실런트 도포 로봇
 *
 * 접합면을 한 바퀴 끊김 없이 돌아야 IP67 이 나온다.
 */
function createSealingRobot({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "sealing-robot",
    position,
    rotationY,
    status,
  });

  const joints = [
    [0, 1.6, 0],
    [0.3, 4.2, 0],
    [2.4, 6, 0],
    [3.6, 5.2, 0],
  ];

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.6, 0.8, 20),
    materials.robotJoint,
  );

  base.name = `${id}-base`;
  base.position.y = 0.55;
  base.castShadow = true;
  machine.add(base);

  for (let index = 0; index < joints.length - 1; index += 1) {
    machine.add(
      createCylinderBetween({
        name: `${id}-arm-${index + 1}`,
        start: joints[index],
        end: joints[index + 1],
        radius: index === 0 ? 0.55 : 0.42,
        material: materials.robot,
      }),
    );
  }

  machine.add(
    createBox({
      name: `${id}-dispensing-nozzle`,
      size: [0.9, 1.4, 0.9],
      position: [4, 4.6, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-sealant-tank`,
      size: [3, 5, 3],
      position: [-4.6, 3.3, -3.4],
      material: materials.sealant,
    }),
  );

  addStatusLight(machine, status, [-1.1, 1.35, 1.05]);

  return machine;
}


/*
 * 7공정 · 냉각수 진공 주입기
 *
 * 회로를 진공으로 비운 다음 채워야 기포가 남지 않는다.
 */
function createCoolantFiller({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "coolant-filler",
    position,
    rotationY,
    status,
  });

  const vacuumTank = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 7.6, 20),
    materials.inspection,
  );
  const fillHose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 6.4, 10),
    materials.conveyorFrame,
  );

  vacuumTank.name = `${id}-vacuum-tank`;
  vacuumTank.position.set(-4.8, 4.6, -2.4);
  fillHose.name = `${id}-fill-hose`;
  fillHose.rotation.z = Math.PI / 2.6;
  fillHose.position.set(0.6, 6, 0);

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [15, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-work-table`,
      size: [11, 0.8, 7.8],
      position: [1.5, 2.9, 0],
      material: materials.station,
    }),
    createBox({
      name: `${id}-pack`,
      size: [9.4, 1.6, 6.4],
      position: [1.5, 4.1, 0],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-pump-unit`,
      size: [4.4, 4.2, 4.4],
      position: [-4.8, 2.9, 2.6],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [2.2, 1.5, 0.18],
      position: [-4.8, 5.4, 4.9],
      material: materials.screen,
      castShadow: false,
    }),
    vacuumTank,
    fillHose,
  );

  addStatusLight(machine, status, [6, 6.6, 3.2]);

  return machine;
}


/*
 * 7공정 · 팩 기밀 누설 시험기
 *
 * 팩을 챔버에 넣고 가압해 새는지 본다.
 */
function createLeakTester({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "leak-tester",
    position,
    rotationY,
    status,
  });

  const pressureLine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 5.6, 12),
    materials.conveyorFrame,
  );
  const gauge = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.5, 18),
    materials.screen,
  );

  pressureLine.name = `${id}-pressure-line`;
  pressureLine.rotation.z = Math.PI / 2;
  pressureLine.position.set(5.6, 7.4, 0);
  gauge.name = `${id}-pressure-gauge`;
  gauge.rotation.x = Math.PI / 2;
  gauge.position.set(0, 7.6, 4.6);
  gauge.castShadow = false;

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [15, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-chamber`,
      size: [12.6, 6.4, 9.4],
      position: [0, 4.2, 0],
      material: materials.inspection,
    }),
    createBox({
      name: `${id}-chamber-lid`,
      size: [12.8, 1, 9.6],
      position: [0, 7.9, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-view-window`,
      size: [6, 2.8, 0.24],
      position: [0, 4.4, 4.72],
      material: materials.screen,
      castShadow: false,
    }),
    createBox({
      name: `${id}-control-cabinet`,
      size: [2.6, 5.6, 4.4],
      position: [8.2, 3.6, -2.6],
      material: materials.station,
    }),
    pressureLine,
    gauge,
  );

  addStatusLight(machine, status, [8.2, 7.2, -2.6]);

  return machine;
}


/*
 * 8공정 · 팩 EOL 충방전 시험기
 *
 * 팩 한 대를 완충·완방하며 실성능을 재는 설비로,
 * 단지에서 전력을 가장 많이 먹는다.
 */
function createPackEolTester({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "pack-eol-tester",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [18, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-power-cable-tray`,
      size: [18, 0.7, 1.6],
      position: [0, 9.4, -3.2],
      material: materials.conveyorFrame,
    }),
    createBox({
      name: `${id}-pack-table`,
      size: [10.4, 0.8, 7.6],
      position: [4, 3, 1.6],
      material: materials.station,
    }),
    createBox({
      name: `${id}-pack`,
      size: [9.4, 1.8, 6.6],
      position: [4, 4.3, 1.6],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-hv-connector`,
      size: [1.6, 1.2, 1.6],
      position: [-1.2, 4.4, 1.6],
      material: materials.highVoltage,
    }),
  );

  [-7, -3.4].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-cycler-cabinet-${index + 1}`,
        size: [3.2, 8.4, 9],
        position: [x, 4.9, 0],
        material: materials.rack,
      }),
      createBox({
        name: `${id}-channel-indicator-${index + 1}`,
        size: [0.2, 5.4, 1.8],
        position: [x - 1.7, 5.4, 3.2],
        material: materials.screen,
        castShadow: false,
      }),
    );
  });

  addStatusLight(machine, status, [-8.4, 9.6, 3.4]);

  return machine;
}


/*
 * 8공정 · 팩 절연·고전압 안전 시험기
 */
function createHipotTester({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "hipot-tester",
    position,
    rotationY,
    status,
  });

  const hvCable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 5.8, 10),
    materials.highVoltage,
  );

  hvCable.name = `${id}-hv-cable`;
  hvCable.rotation.z = Math.PI / 2;
  hvCable.position.set(0, 7.6, 3.4);

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [13, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-booth`,
      size: [11.4, 6.8, 8.6],
      position: [0, 4.2, 0],
      material: materials.inspection,
    }),
    createBox({
      name: `${id}-booth-top`,
      size: [11.6, 1, 8.8],
      position: [0, 8.1, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-door-window`,
      size: [5, 3, 0.24],
      position: [0, 4.5, 4.42],
      material: materials.screen,
      castShadow: false,
    }),
    createBox({
      name: `${id}-hv-warning-panel`,
      size: [3.6, 1.2, 0.2],
      position: [0, 7.2, 4.4],
      material: materials.highVoltage,
      castShadow: false,
    }),
    hvCable,
  );

  addStatusLight(machine, status, [5, 8.6, 3]);

  return machine;
}


/*
 * 8공정 · 레이저 각인·최종 비전 검사기
 *
 * 이력 추적 코드를 새기고 외관과 부품 누락을 마지막으로 본다.
 */
function createMarkingInspector({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "vision-inspector",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-belt`,
      size: [14, 0.6, 4.4],
      position: [0, 2.7, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${id}-pack`,
      size: [8.4, 1.6, 6],
      position: [-1.4, 3.8, 0],
      material: materials.packTray,
    }),
    createBox({
      name: `${id}-gantry-beam`,
      size: [13, 1.4, 2.8],
      position: [0, 8.6, 0],
      material: materials.inspection,
    }),
    createBox({
      name: `${id}-marking-head`,
      size: [2, 2.4, 2],
      position: [3.4, 7, 0],
      material: materials.stationDark,
    }),
    createBox({
      name: `${id}-light-bar`,
      size: [10.4, 0.5, 0.7],
      position: [0, 7.5, 1.8],
      material: materials.screen,
      castShadow: false,
    }),
  );

  [-5.4, 5.4].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-column-${index + 1}`,
        size: [1.3, 8.2, 1.3],
        position: [x, 4.4, 0],
        material: materials.inspection,
      }),
      createBox({
        name: `${id}-camera-${index + 1}`,
        size: [2.2, 1.9, 2.1],
        position: [x * 0.45, 7.1, 0],
        material: materials.stationDark,
      }),
    );
  });

  addStatusLight(machine, status, [5.8, 9.6, 2.4]);

  return machine;
}


function createAgv({ id, position, rotationY = 0, materials, status }) {
  const agv = createMachineGroup({
    id,
    type: "agv",
    position,
    rotationY,
    status,
  });

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
      material: materials.module,
    }),
  );

  addStatusLight(agv, status, [3.2, 1.3, 2.1]);

  return agv;
}


/*
 * 공정 스테이션 배치.
 *
 * 설비는 벨트 양옆에 바짝 붙여 세우고, 작업면이 벨트를 보도록 돌린다.
 * 팩은 벨트에 실린 채로 스테이션을 차례로 지난다.
 *
 * 같은 공정을 여러 대가 나눠 맡는 병렬 뱅크는 나란히 이어 놓았다.
 * 냉각수 주입 3대, 팩 EOL 5대처럼 사이클이 긴 공정일수록 대수가 많다.
 * 어느 공정에 설비가 몰려 있는지가 배치만 봐도 읽힌다.
 *
 * 마주 보는 설비끼리 부딪히지 않도록 좌우를 번갈아 놓았고,
 * 그래서 통로 한쪽에서 라인 전체를 볼 수 있다.
 */
const BELT_Z = Object.freeze({ upper: -50, lower: 50 });

/* 벨트 중심에서 설비 중심까지. 설비 앞면이 벨트 난간에 거의 닿는다. */
const BELT_SIDE_OFFSET = 9;

/* 스테이션이 늘어서는 x 범위. 좌측 세로 벨트와 겹치지 않는 선이다. */
const STATION_SPAN = 162;

/* 로봇은 팔이 +x 로 뻗어 있어 벨트 쪽으로 한 번 더 돌려야 한다. */
const ROBOT_FACING = -Math.PI / 2;

const BELT_LINES = [
  {
    belt: "upper",

    /* 동 → 서. 5공정과 6공정 */
    direction: "west",
    stations: [
      { id: "TRY-PA-01", build: createTrayWasher, status: "running" },
      { id: "TIM-PA-01", build: createTimDispenser, status: "running" },
      { id: "TIM-PA-02", build: createTimDispenser, status: "warning" },
      { id: "MMT-PA-01", build: createMountingRobot, status: "running", facing: ROBOT_FACING },
      { id: "MMT-PA-02", build: createMountingRobot, status: "running", facing: ROBOT_FACING },
      { id: "MMT-PA-03", build: createMountingRobot, status: "warning", facing: ROBOT_FACING },
      { id: "MMT-PA-04", build: createMountingRobot, status: "running", facing: ROBOT_FACING },
      { id: "HVT-PA-01", build: createTorqueStation, status: "running" },
      { id: "HVT-PA-02", build: createTorqueStation, status: "running" },
      { id: "BMS-PA-01", build: createBmsStation, status: "running" },
      { id: "BMS-PA-02", build: createBmsStation, status: "running" },
    ],
  },
  {
    belt: "lower",

    /* 서 → 동. 7공정과 8공정 */
    direction: "east",
    stations: [
      { id: "SEL-PA-01", build: createSealingRobot, status: "running", facing: ROBOT_FACING },
      { id: "SEL-PA-02", build: createSealingRobot, status: "running", facing: ROBOT_FACING },
      { id: "CLF-PA-01", build: createCoolantFiller, status: "running" },
      { id: "CLF-PA-02", build: createCoolantFiller, status: "running" },
      { id: "CLF-PA-03", build: createCoolantFiller, status: "running" },
      { id: "LEK-PA-01", build: createLeakTester, status: "running" },
      { id: "LEK-PA-02", build: createLeakTester, status: "warning" },
      { id: "LEK-PA-03", build: createLeakTester, status: "running" },
      { id: "PEL-PA-01", build: createPackEolTester, status: "running" },
      { id: "PEL-PA-02", build: createPackEolTester, status: "running" },
      { id: "PEL-PA-03", build: createPackEolTester, status: "running" },
      { id: "PEL-PA-04", build: createPackEolTester, status: "idle" },
      { id: "PEL-PA-05", build: createPackEolTester, status: "running" },
      { id: "INS-PA-01", build: createHipotTester, status: "running" },
      { id: "MRK-PA-01", build: createMarkingInspector, status: "warning" },
    ],
  },
];

export const PACK_CONVEYOR_STATION_COUNT = BELT_LINES.reduce(
  (total, line) => total + line.stations.length,
  0,
);

/*
 * 한 줄에 몇 대가 오든 같은 간격으로 벌려 놓는다.
 * 설비를 늘려도 좌표를 손댈 일이 없다.
 */
function placeStation(line, index) {
  const count = line.stations.length;
  const step = count > 1 ? (STATION_SPAN * 2) / (count - 1) : 0;
  const offset = -STATION_SPAN + step * index;
  const isNorth = index % 2 === 0;
  const station = line.stations[index];

  return {
    x: line.direction === "west" ? -offset : offset,

    /* 북쪽 설비는 벨트가 +z 쪽, 남쪽 설비는 -z 쪽에 있다 */
    z: BELT_Z[line.belt] + (isNorth ? -BELT_SIDE_OFFSET : BELT_SIDE_OFFSET),
    rotationY: (isNorth ? 0 : Math.PI) + (station.facing ?? 0),
  };
}

/*
 * 스테이션이 벨트 경로 위 어디쯤인지 거리로 적어 둔다.
 *
 * 팩 운행 시뮬레이션이 이 거리를 보고 어느 설비 앞에서 멈출지,
 * 대기줄이 어디부터 늘어설지를 정한다.
 *
 *   상단 벨트  경로 시작(x=180)에서 서쪽으로 간 거리
 *   좌측 세로  360 ~ 460 구간이라 스테이션이 없다
 *   하단 벨트  460 을 지나 동쪽으로 간 거리
 */
/* 경로 양 끝의 x. PACK_CONVEYOR_PATH 와 같아야 한다. */
const BELT_HALF_LENGTH = 180;
const UPPER_LENGTH = BELT_HALF_LENGTH * 2;
const LINK_LENGTH = 100;

function stationDistance(line, x) {
  return line.belt === "upper"
    ? BELT_HALF_LENGTH - x
    : UPPER_LENGTH + LINK_LENGTH + (x + BELT_HALF_LENGTH);
}

export const PACK_CONVEYOR_STATIONS = Object.freeze(
  BELT_LINES.flatMap((line) =>
    line.stations.map((station, index) => {
      const { x } = placeStation(line, index);

      return Object.freeze({
        id: station.id,
        belt: line.belt,
        x,
        distance: Number(stationDistance(line, x).toFixed(3)),
      });
    }),
  ),
);

function addProcessStations(group, materials) {
  /* 벨트를 낀 작업 구역 바닥 */
  Object.values(BELT_Z).forEach((beltZ, index) => {
    group.add(
      createBox({
        name: `process-belt-zone-${index + 1}`,
        size: [376, 0.05, BELT_SIDE_OFFSET * 2 + 12],
        position: [0, 0.97, beltZ],
        material: materials.assemblyZone,
        castShadow: false,
      }),
    );
  });

  BELT_LINES.forEach((line) => {
    line.stations.forEach((station, index) => {
      const { x, z, rotationY } = placeStation(line, index);

      group.add(
        station.build({
          id: station.id,
          position: [x, 0.95, z],
          rotationY,
          materials,
          status: station.status,
        }),
      );
    });
  });
}


/*
 * ㄷ자 이송 컨베이어.
 *
 * 상단 가로(z=-50)로 서진하고, 좌측 세로(x=-180)에서 방향을 틀어
 * 하단 가로(z=50)로 다시 동진한다. 평면에서 보면 ㄷ 모양이다.
 *
 *   ◀──────────────────  z = -50   (5·6공정)
 *   │
 *   │  x = -180
 *   ▼
 *   ──────────────────▶  z =  50   (7·8공정)
 *
 * 아래 좌표는 팩이 실제로 얹혀 도는 경로이기도 해서
 * packConveyorController 가 그대로 받아 쓴다.
 */
export const PACK_CONVEYOR_PATH = Object.freeze([
  Object.freeze([180, 2.7, -50]),
  Object.freeze([-180, 2.7, -50]),
  Object.freeze([-180, 2.7, 50]),
  Object.freeze([180, 2.7, 50]),
]);

const CONVEYOR_WIDTH = 6;

/*
 * 직선 구간 하나를 만든다.
 * from, to 는 [x, z] 이고 축은 둘 중 달라진 쪽으로 정한다.
 */
function addConveyorRun({ conveyor, name, from, to, materials }) {
  const isHorizontal = from[1] === to[1];
  const length = isHorizontal
    ? Math.abs(to[0] - from[0])
    : Math.abs(to[1] - from[1]);
  const centerX = (from[0] + to[0]) / 2;
  const centerZ = (from[1] + to[1]) / 2;
  const railOffset = CONVEYOR_WIDTH / 2 + 0.15;

  conveyor.add(
    createBox({
      name: `${name}-belt`,
      size: isHorizontal
        ? [length, 0.65, CONVEYOR_WIDTH]
        : [CONVEYOR_WIDTH, 0.65, length],
      position: [centerX, 2.35, centerZ],
      material: materials.conveyorBelt,
    }),
  );

  [-railOffset, railOffset].forEach((offset, index) => {
    conveyor.add(
      createBox({
        name: `${name}-rail-${index + 1}`,
        size: isHorizontal
          ? [length, 1.15, 0.35]
          : [0.35, 1.15, length],
        position: isHorizontal
          ? [centerX, 2.65, centerZ + offset]
          : [centerX + offset, 2.65, centerZ],
        material: materials.conveyorFrame,
      }),
    );
  });

  const start = isHorizontal ? Math.min(from[0], to[0]) : Math.min(from[1], to[1]);

  for (let distance = 4; distance <= length - 4; distance += 8) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, CONVEYOR_WIDTH + 0.15, 12),
      materials.conveyorFrame,
    );

    roller.name = `${name}-roller`;
    roller.rotation[isHorizontal ? "x" : "z"] = Math.PI / 2;
    roller.position.set(
      isHorizontal ? start + distance : centerX,
      2.78,
      isHorizontal ? centerZ : start + distance,
    );
    roller.castShadow = true;
    conveyor.add(roller);
  }

  for (let distance = 12; distance <= length - 12; distance += 24) {
    const supportOffset = CONVEYOR_WIDTH / 2 - 0.55;

    [-supportOffset, supportOffset].forEach((offset, index) => {
      conveyor.add(
        createBox({
          name: `${name}-support-${index + 1}`,
          size: [0.5, 2.2, 0.5],
          position: isHorizontal
            ? [start + distance, 1.2, centerZ + offset]
            : [centerX + offset, 1.2, start + distance],
          material: materials.conveyorFrame,
        }),
      );
    });
  }
}

/*
 * 코너 이송 데크.
 * 직각으로 방향을 바꾸는 자리라 벨트 대신 회전 테이블을 둔다.
 */
function addConveyorCorner({ conveyor, name, position, materials }) {
  const turntable = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.5, 24),
    materials.conveyorFrame,
  );

  turntable.name = `${name}-turntable`;
  turntable.position.set(position[0], 2.75, position[1]);
  turntable.castShadow = true;

  conveyor.add(
    createBox({
      name: `${name}-deck`,
      size: [CONVEYOR_WIDTH + 2, 0.65, CONVEYOR_WIDTH + 2],
      position: [position[0], 2.35, position[1]],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${name}-support`,
      size: [0.6, 2.2, 0.6],
      position: [position[0], 1.2, position[1]],
      material: materials.conveyorFrame,
    }),
    turntable,
  );
}

function addProcessConveyor(group, materials) {
  const conveyor = new THREE.Group();

  conveyor.name = "factory-b-process-conveyor";
  conveyor.userData = {
    equipmentId: "CNV-PA-01",
    equipmentType: "conveyor",
    status: "running",
  };

  addConveyorRun({
    conveyor,
    name: "process-conveyor-upper",
    from: [180, -50],
    to: [-180, -50],
    materials,
  });
  addConveyorRun({
    conveyor,
    name: "process-conveyor-link",
    from: [-180, -50],
    to: [-180, 50],
    materials,
  });
  addConveyorRun({
    conveyor,
    name: "process-conveyor-lower",
    from: [-180, 50],
    to: [180, 50],
    materials,
  });

  addConveyorCorner({
    conveyor,
    name: "process-conveyor-corner-1",
    position: [-180, -50],
    materials,
  });
  addConveyorCorner({
    conveyor,
    name: "process-conveyor-corner-2",
    position: [-180, 50],
    materials,
  });

  group.add(conveyor);
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
      id: "AGV-PA-01",
      position: [-110, 0.98, -105],
      materials,
      status: "running",
    }),
    createAgv({
      id: "AGV-PA-02",
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
  addProcessStations(group, materials);
  addProcessConveyor(group, materials);
  addAgvArea(group, materials);
  addControlCabinets(group, materials);
  parent.add(group);

  return group;
}
