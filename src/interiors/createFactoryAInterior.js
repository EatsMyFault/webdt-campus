import * as THREE from "three";

/*
 * 모듈 조립동(MA-01) 내부.
 *
 * 팩 조립동과 같은 ㄷ자 라인이다.
 * 벨트 양옆에 설비를 바짝 붙여 세우고, 모듈은 벨트에 실린 채로
 * 스테이션을 차례로 지난다.
 *
 *   z = -105  셀 보관 랙
 *   z =  -62  상단 벨트 · 1공정 셀 수입검사 → 2공정 셀 스태킹
 *   x = -140  서쪽 세로 구간
 *   z =   38  하단 벨트 · 3공정 레이저 용접 → 4공정 모듈 EOL
 *   x < -158  집진·공조 지원실 (별동)
 *
 * 여기서 만드는 equipmentId 는 moduleAssemblyEquipmentData.js 의
 * 설비 id 와 반드시 같아야 상세정보와 상태등이 연결된다.
 */

const STATUS_COLORS = {
  running: 0x30d5a4,
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

    /* 셀과 버스바는 금속 광택이 있어야 적층 구간이 읽힌다 */
    cell: new THREE.MeshStandardMaterial({
      color: 0xb9c6cc,
      roughness: 0.34,
      metalness: 0.62,
    }),
    busbar: new THREE.MeshStandardMaterial({
      color: 0xc98b3f,
      roughness: 0.38,
      metalness: 0.68,
    }),
    hazard: new THREE.MeshStandardMaterial({
      color: 0xe0913a,
      roughness: 0.55,
      metalness: 0.1,
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

/*
 * 설비마다 같은 자리에 상태등 기둥을 세운다.
 * 관제 화면에서 색만 보고 줄 전체를 훑을 수 있어야 한다.
 */
function addStatusPole(machine, materials, status, position) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8),
    materials.steel,
  );
  const lamp = createStatusLamp(statusColor(status));

  pole.name = `${machine.name}-status-pole`;
  pole.position.set(position[0], position[1], position[2]);
  lamp.name = `${machine.name}-status-lamp`;
  lamp.position.set(position[0], position[1] + 1, position[2]);

  machine.add(pole, lamp);
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


/*
 * 1공정 · 셀 전기특성 검사기
 *
 * 셀을 트레이째 밀어 넣어 전압과 내부저항을 재는 낮은 부스다.
 */
function createCellInspector({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "cell-inspector",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [13, 0.7, 9],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-body`,
      size: [11.4, 4.2, 7.6],
      position: [0, 2.9, 0],
      material: materials.machineBody,
    }),
    createBox({
      name: `${id}-measuring-head`,
      size: [11.6, 1.1, 7.8],
      position: [0, 5.55, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-tray-window`,
      size: [5.2, 2.2, 0.24],
      position: [-1.6, 3.1, 3.92],
      material: materials.machineWindow,
      castShadow: false,
    }),
    createBox({
      name: `${id}-controller`,
      size: [2.4, 3.6, 1.1],
      position: [4.6, 3, 4.1],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [1.6, 1.2, 0.16],
      position: [4.6, 3.5, 4.7],
      material: materials.accent,
      castShadow: false,
    }),
  );

  /* 검사 대기 중인 셀 트레이 */
  [-3.2, 0, 3.2].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-cell-tray-${index + 1}`,
        size: [2.4, 0.5, 5.4],
        position: [x, 6.4, 0],
        material: materials.cell,
      }),
    );
  });

  addStatusPole(machine, materials, status, [4.6, 7, 2.4]);

  return machine;
}


/*
 * 비전 검사기
 *
 * 셀과 용접부를 지나가며 찍는 게이트형 설비라
 * 두 공정이 같은 모양을 함께 쓴다.
 */
function createVisionInspector({ id, position, rotationY = 0, materials, status }) {
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
      size: [12, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-belt`,
      size: [12, 0.55, 3.4],
      position: [0, 2.6, 0],
      material: materials.conveyorBelt,
    }),
    createBox({
      name: `${id}-gantry-beam`,
      size: [11.4, 1.4, 2.6],
      position: [0, 8.3, 0],
      material: materials.machineBody,
    }),
    createBox({
      name: `${id}-light-bar`,
      size: [9.4, 0.5, 0.6],
      position: [0, 7.3, 1.6],
      material: materials.accent,
      castShadow: false,
    }),
  );

  [-4.6, 4.6].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-column-${index + 1}`,
        size: [1.2, 8, 1.2],
        position: [x, 4.3, 0],
        material: materials.machineBody,
      }),
    );
  });

  [-2.6, 2.6].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-camera-${index + 1}`,
        size: [2.2, 1.9, 2.1],
        position: [x, 6.9, 0],
        material: materials.machineDark,
      }),
    );
  });

  addStatusPole(machine, materials, status, [5, 9.2, 2.2]);

  return machine;
}


/*
 * 2공정 · 셀 스태킹 셀
 *
 * 네 기둥 사이에서 상부 헤드가 내려와 적층한 셀을 눌러 준다.
 */
function createStackingCell({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "stacking-cell",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-press-head`,
      size: [10, 1.7, 8],
      position: [-1, 8.4, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-stack-table`,
      size: [8.4, 0.7, 6.6],
      position: [-1, 3.1, 0],
      material: materials.steel,
    }),
    createBox({
      name: `${id}-cell-magazine`,
      size: [3, 5.4, 8],
      position: [5.6, 3.5, 0],
      material: materials.cabinet,
    }),
  );

  [-5, 3].forEach((x) => {
    [-3.4, 3.4].forEach((z, index) => {
      machine.add(
        createBox({
          name: `${id}-column-${x}-${index + 1}`,
          size: [0.9, 9, 0.9],
          position: [x, 5, z],
          material: materials.machineBody,
        }),
      );
    });
  });

  /* 적층 중인 셀 스택 */
  for (let level = 0; level < 5; level += 1) {
    machine.add(
      createBox({
        name: `${id}-cell-${level + 1}`,
        size: [7, 0.42, 5.8],
        position: [-1, 3.75 + level * 0.52, 0],
        material: level % 2 === 0 ? materials.cell : materials.accent,
      }),
    );
  }

  addStatusPole(machine, materials, status, [5.6, 7.2, 3.2]);

  return machine;
}


/*
 * 3공정 · 버스바 레이저 용접기
 *
 * 레이저는 밀폐 캐빈 안에서만 쏘고, 흄은 바로 위 덕트로 뽑는다.
 */
function createLaserWelder({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "laser-welder",
    position,
    rotationY,
    status,
  });

  const fumeDuct = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 0.95, 6.4, 14),
    materials.servicePipe,
  );
  const laserArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 5.2, 12),
    materials.steel,
  );

  fumeDuct.name = `${id}-fume-duct`;
  fumeDuct.position.set(-4.2, 11.4, 0);
  laserArm.name = `${id}-laser-arm`;
  laserArm.rotation.z = Math.PI / 2;
  laserArm.position.set(1.6, 6.4, 0);

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [14, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-cabin`,
      size: [12.6, 7.2, 8.6],
      position: [0, 4.3, 0],
      material: materials.machineBody,
    }),
    createBox({
      name: `${id}-cabin-top`,
      size: [12.8, 1.1, 8.8],
      position: [0, 8.35, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-view-window`,
      size: [5.4, 3, 0.24],
      position: [-1.8, 4.6, 4.42],
      material: materials.machineWindow,
      castShadow: false,
    }),
    createBox({
      name: `${id}-laser-head`,
      size: [2, 2.2, 2],
      position: [4.4, 6.4, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-busbar-tray`,
      size: [4.2, 0.4, 3.2],
      position: [-3.4, 9.2, 0],
      material: materials.busbar,
    }),
    createBox({
      name: `${id}-controller`,
      size: [2.6, 4.1, 1.2],
      position: [5.3, 4.4, 4.55],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [1.7, 1.35, 0.16],
      position: [5.3, 5, 5.18],
      material: materials.accent,
      castShadow: false,
    }),
    fumeDuct,
    laserArm,
  );

  addStatusPole(machine, materials, status, [5.1, 9.4, 2.7]);

  return machine;
}


/*
 * 4공정 · 모듈 EOL 충방전 시험기
 *
 * 채널 캐비닛이 나란히 서 있고 위로 굵은 전력 케이블 트레이가 지난다.
 * 단지에서 전력을 가장 많이 먹는 설비다.
 */
function createModuleEolTester({ id, position, rotationY = 0, materials, status }) {
  const machine = createMachineGroup({
    id,
    type: "module-eol-tester",
    position,
    rotationY,
    status,
  });

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [16, 0.7, 10],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-cable-tray`,
      size: [16, 0.6, 1.4],
      position: [0, 8.6, -2.6],
      material: materials.steel,
    }),
    createBox({
      name: `${id}-load-table`,
      size: [6.4, 0.6, 6.2],
      position: [4.8, 3.2, 1.4],
      material: materials.steel,
    }),
    createBox({
      name: `${id}-module`,
      size: [5.2, 1.6, 4.8],
      position: [4.8, 4.3, 1.4],
      material: materials.cell,
    }),
  );

  [-6, -2.2, 1.6].forEach((x, index) => {
    machine.add(
      createBox({
        name: `${id}-channel-rack-${index + 1}`,
        size: [3.4, 7.4, 8.2],
        position: [x, 4.4, 0],
        material: materials.cabinet,
      }),
      createBox({
        name: `${id}-channel-indicator-${index + 1}`,
        size: [0.18, 4.4, 1.5],
        position: [x - 1.79, 5, 3],
        material: materials.accent,
        castShadow: false,
      }),
    );
  });

  addStatusPole(machine, materials, status, [6.6, 8.2, -2.8]);

  return machine;
}


/*
 * 4공정 · 절연내압 시험기
 *
 * 고전압을 걸기 때문에 시험 중에는 부스 문이 잠긴다.
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
    new THREE.CylinderGeometry(0.28, 0.28, 5.4, 10),
    materials.hazard,
  );

  hvCable.name = `${id}-hv-cable`;
  hvCable.rotation.z = Math.PI / 2;
  hvCable.position.set(0, 7.4, 3.2);

  machine.add(
    createBox({
      name: `${id}-base`,
      size: [12, 0.7, 9],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-booth`,
      size: [10.4, 6.6, 7.6],
      position: [0, 4.1, 0],
      material: materials.machineBody,
    }),
    createBox({
      name: `${id}-booth-top`,
      size: [10.6, 0.9, 7.8],
      position: [0, 7.85, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-door-window`,
      size: [4.4, 2.8, 0.24],
      position: [0, 4.4, 3.92],
      material: materials.machineWindow,
      castShadow: false,
    }),
    createBox({
      name: `${id}-hv-warning-panel`,
      size: [3.2, 1.1, 0.2],
      position: [0, 7, 3.9],
      material: materials.hazard,
      castShadow: false,
    }),
    hvCable,
  );

  addStatusPole(machine, materials, status, [4.6, 8.3, 2.6]);

  return machine;
}


/*
 * 지원실 · 용접 흄 집진기
 */
function createDustCollector({ id, position, rotationY = 0, materials, status }) {
  const equipment = createMachineGroup({
    id,
    type: "dust-collector",
    position,
    rotationY,
    status,
  });

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
  const lamp = createStatusLamp(statusColor(status));

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


/*
 * 지원실 · 적층 구역 제습 공조기
 *
 * 셀 단자가 산화하지 않도록 적층 구간의 노점을 낮춘다.
 */
function createDehumidifier({ id, position, rotationY = 0, materials, status }) {
  const equipment = createMachineGroup({
    id,
    type: "dehumidifier",
    position,
    rotationY,
    status,
  });

  const rotor = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.1, 2.6, 20),
    materials.accent,
  );
  const supplyDuct = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 12, 16),
    materials.servicePipe,
  );
  const lamp = createStatusLamp(statusColor(status));

  rotor.name = `${id}-desiccant-rotor`;
  rotor.rotation.z = Math.PI / 2;
  rotor.position.set(7.6, 6.4, 0);
  supplyDuct.name = `${id}-supply-duct`;
  supplyDuct.rotation.z = Math.PI / 2;
  supplyDuct.position.set(0, 12.2, 0);
  lamp.name = `${id}-status-lamp`;
  lamp.scale.setScalar(2.2);
  lamp.position.set(-8.4, 11.6, 3.6);

  equipment.add(
    createBox({
      name: `${id}-base`,
      size: [22, 0.7, 11],
      position: [0, 0.45, 0],
      material: materials.machineDark,
    }),
    createBox({
      name: `${id}-ahu-body`,
      size: [19, 9, 9.4],
      position: [-1, 5.3, 0],
      material: materials.dustCollector,
    }),
    createBox({
      name: `${id}-filter-access`,
      size: [0.2, 4.6, 6.4],
      position: [-10.55, 5.6, 0],
      material: materials.machineBody,
      castShadow: false,
    }),
    rotor,
    supplyDuct,
    lamp,
  );

  return equipment;
}


/*
 * 지원실 · 공기압축기
 */
function createAirCompressor({ id, position, rotationY = 0, materials, status }) {
  const equipment = createMachineGroup({
    id,
    type: "air-compressor",
    position,
    rotationY,
    status,
  });

  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 19, 20),
    materials.compressor,
  );
  const outletPipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 7, 14),
    materials.servicePipe,
  );
  const lamp = createStatusLamp(statusColor(status));

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


/*
 * 공정 스테이션 배치.
 *
 * 팩 조립동과 같은 방식이다. ㄷ자 벨트를 놓고 설비를 양옆에 바짝 붙여
 * 세운 뒤, 작업면이 벨트를 보도록 돌린다. 모듈은 벨트에 실린 채로
 * 스테이션을 차례로 지난다.
 *
 * 세로 구간은 서쪽에 둔다. 동쪽은 배전반이 붙어 있고,
 * 서쪽은 집진·공조 지원실과 겹치지 않을 만큼만 띄웠다.
 *
 * 같은 공정을 여러 대가 나눠 맡는 병렬 뱅크는 나란히 이어 놓았다.
 * 레이저 용접 4대, 모듈 EOL 4대처럼 사이클이 긴 공정일수록 대수가 많다.
 */
const BELT_Z = Object.freeze({ upper: -62, lower: 38 });

/* 벨트 양 끝의 x. 지원실과 배전반 사이에 들어가는 범위다. */
const BELT_WEST_X = -140;
const BELT_EAST_X = 180;

/* 벨트 중심에서 설비 중심까지. 설비 앞면이 벨트 난간에 거의 닿는다. */
const BELT_SIDE_OFFSET = 9;

/* 스테이션이 늘어서는 x 범위. 세로 구간과 겹치지 않는 선이다. */
const STATION_WEST_X = -125;
const STATION_EAST_X = 165;

const BELT_LINES = [
  {
    belt: "upper",

    /* 동 → 서. 1공정과 2공정 */
    direction: "west",
    stations: [
      { id: "CIN-MA-01", build: createCellInspector, status: "running" },
      { id: "CIN-MA-02", build: createCellInspector, status: "running" },
      { id: "CVS-MA-01", build: createVisionInspector, status: "warning" },
      { id: "STK-MA-01", build: createStackingCell, status: "running" },
      { id: "STK-MA-02", build: createStackingCell, status: "running" },
      { id: "STK-MA-03", build: createStackingCell, status: "idle" },
    ],
  },
  {
    belt: "lower",

    /* 서 → 동. 3공정과 4공정 */
    direction: "east",
    stations: [
      { id: "LWD-MA-01", build: createLaserWelder, status: "running" },
      { id: "LWD-MA-02", build: createLaserWelder, status: "running" },
      { id: "LWD-MA-03", build: createLaserWelder, status: "warning" },
      { id: "LWD-MA-04", build: createLaserWelder, status: "running" },
      { id: "WVS-MA-01", build: createVisionInspector, status: "running" },
      { id: "MEL-MA-01", build: createModuleEolTester, status: "running" },
      { id: "MEL-MA-02", build: createModuleEolTester, status: "running" },
      { id: "MEL-MA-03", build: createModuleEolTester, status: "running" },
      { id: "MEL-MA-04", build: createModuleEolTester, status: "stopped" },
      { id: "HPT-MA-01", build: createHipotTester, status: "running" },
    ],
  },
];

export const MODULE_CONVEYOR_STATION_COUNT = BELT_LINES.reduce(
  (total, line) => total + line.stations.length,
  0,
);

/*
 * 한 줄에 몇 대가 오든 같은 간격으로 벌려 놓는다.
 * 설비를 늘려도 좌표를 손댈 일이 없다.
 */
function placeStation(line, index) {
  const count = line.stations.length;
  const span = STATION_EAST_X - STATION_WEST_X;
  const step = count > 1 ? span / (count - 1) : 0;
  const offset = STATION_WEST_X + step * index;
  const isNorth = index % 2 === 0;
  const station = line.stations[index];

  return {
    x: line.direction === "west"
      ? STATION_WEST_X + STATION_EAST_X - offset
      : offset,

    /* 북쪽 설비는 벨트가 +z 쪽, 남쪽 설비는 -z 쪽에 있다 */
    z: BELT_Z[line.belt] + (isNorth ? -BELT_SIDE_OFFSET : BELT_SIDE_OFFSET),
    rotationY: (isNorth ? 0 : Math.PI) + (station.facing ?? 0),
  };
}

/*
 * 스테이션이 벨트 경로 위 어디쯤인지 거리로 적어 둔다.
 *
 * 모듈 운행 시뮬레이션이 이 거리를 보고 어느 설비 앞에서 멈출지,
 * 대기줄이 어디부터 늘어설지를 정한다.
 */
const UPPER_LENGTH = BELT_EAST_X - BELT_WEST_X;
const LINK_LENGTH = BELT_Z.lower - BELT_Z.upper;

function stationDistance(line, x) {
  return line.belt === "upper"
    ? BELT_EAST_X - x
    : UPPER_LENGTH + LINK_LENGTH + (x - BELT_WEST_X);
}

export const MODULE_CONVEYOR_STATIONS = Object.freeze(
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
        size: [UPPER_LENGTH + 16, 0.05, BELT_SIDE_OFFSET * 2 + 12],
        position: [
          (BELT_WEST_X + BELT_EAST_X) / 2,
          0.94,
          beltZ,
        ],
        material: materials.workZone,
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
          position: [x, 0.82, z],
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
 * 상단 가로로 서진하고, 서쪽 세로 구간에서 방향을 틀어
 * 하단 가로로 다시 동진한다. 평면에서 보면 ㄷ 모양이다.
 *
 * 아래 좌표는 모듈이 실제로 얹혀 도는 경로이기도 해서
 * packConveyorController 가 그대로 받아 쓴다.
 */
export const MODULE_CONVEYOR_PATH = Object.freeze([
  Object.freeze([BELT_EAST_X, 2.7, BELT_Z.upper]),
  Object.freeze([BELT_WEST_X, 2.7, BELT_Z.upper]),
  Object.freeze([BELT_WEST_X, 2.7, BELT_Z.lower]),
  Object.freeze([BELT_EAST_X, 2.7, BELT_Z.lower]),
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
  const start = isHorizontal
    ? Math.min(from[0], to[0])
    : Math.min(from[1], to[1]);

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
        material: materials.conveyor,
      }),
    );
  });

  for (let distance = 4; distance <= length - 4; distance += 8) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, CONVEYOR_WIDTH + 0.15, 12),
      materials.conveyor,
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
          material: materials.conveyor,
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
    materials.conveyor,
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
      material: materials.conveyor,
    }),
    turntable,
  );
}

function addProcessConveyor(group, materials) {
  const conveyor = new THREE.Group();

  conveyor.name = "factory-a-process-conveyor";
  conveyor.position.y = 0.8;
  conveyor.userData = {
    equipmentId: "CNV-MA-01",
    equipmentType: "conveyor",
    status: "running",
  };

  addConveyorRun({
    conveyor,
    name: "process-conveyor-upper",
    from: [BELT_EAST_X, BELT_Z.upper],
    to: [BELT_WEST_X, BELT_Z.upper],
    materials,
  });
  addConveyorRun({
    conveyor,
    name: "process-conveyor-link",
    from: [BELT_WEST_X, BELT_Z.upper],
    to: [BELT_WEST_X, BELT_Z.lower],
    materials,
  });
  addConveyorRun({
    conveyor,
    name: "process-conveyor-lower",
    from: [BELT_WEST_X, BELT_Z.lower],
    to: [BELT_EAST_X, BELT_Z.lower],
    materials,
  });

  addConveyorCorner({
    conveyor,
    name: "process-conveyor-corner-1",
    position: [BELT_WEST_X, BELT_Z.upper],
    materials,
  });
  addConveyorCorner({
    conveyor,
    name: "process-conveyor-corner-2",
    position: [BELT_WEST_X, BELT_Z.lower],
    materials,
  });

  group.add(conveyor);
}


/*
 * 셀 보관 랙.
 *
 * 셀은 고가 위험물이라 라인 투입 전까지 별도 구역에 세워 둔다.
 */
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
          name: `${id}-cell-tray-${level + 1}-${crateIndex + 1}`,
          size: [2.7, 1.7, 3.1],
          position: [x, y + 1, 0],
          material: (level + crateIndex) % 2 === 0
            ? materials.cell
            : materials.crate,
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
        id: `RACK-MA-${String(index + 1).padStart(2, "0")}`,
        position: [x, 0.85, -105],
        materials,
      }),
    );
  });

  [-72, -24, 24, 72].forEach((z, index) => {
    group.add(
      createBox({
        name: `electric-panel-ma-${index + 1}`,
        size: [3.2, 6.8, 7.8],
        position: [198.5, 4.25, z],
        material: materials.cabinet,
      }),
      createBox({
        name: `electric-panel-screen-ma-${index + 1}`,
        size: [0.18, 1.4, 2.2],
        position: [196.82, 4.9, z],
        material: materials.accent,
        castShadow: false,
      }),
    );
  });
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
      id: "FUM-MA-01",
      position: [-215, 1, -64],
      materials,
      status: "running",
    }),
    createDehumidifier({
      id: "DHM-MA-01",
      position: [-192, 1, -20],
      materials,
      status: "warning",
    }),
    createAirCompressor({
      id: "COMP-MA-01",
      position: [-196, 1, 22],
      materials,
      status: "running",
    }),
  );

  group.add(supportRoom);
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
  addProcessStations(group, materials);
  addProcessConveyor(group, materials);
  addStorageAndControls(group, materials);
  addAnnexSupportEquipment(group, materials);
  addOverheadCrane(group, materials);
  parent.add(group);

  return group;
}
