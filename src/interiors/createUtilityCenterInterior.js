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

function createCylinder({
  name,
  radius,
  height,
  position,
  material,
  rotation = [0, 0, 0],
  segments = 20,
}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, segments),
    material,
  );

  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPipeBetween({
  name,
  start,
  end,
  radius = 0.42,
  material,
  segments = 14,
}) {
  const startPoint = new THREE.Vector3(...start);
  const endPoint = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(
    endPoint,
    startPoint,
  );
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      segments,
    ),
    material,
  );

  mesh.name = name;
  mesh.position.copy(startPoint).add(endPoint).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createElbowPipe({
  name,
  start,
  control,
  end,
  radius = 0.42,
  material,
}) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...control),
    new THREE.Vector3(...end),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 20, radius, 14, false),
    material,
  );

  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addDirectEquipmentBranch({
  group,
  id,
  x,
  mainZ,
  targetY,
  targetZ,
  material,
  fittingMaterial,
  pipeRadius = 0.38,
  elbowRadius = 0.9,
  addTargetFlange = true,
}) {
  const mainY = 12.4;
  const directionZ = Math.sign(targetZ - mainZ);
  const elbowTopY = targetY + elbowRadius;
  const horizontalStartZ =
    mainZ + directionZ * elbowRadius;
  const overlap = 0.08;

  const verticalPipe = createPipeBetween({
    name: `${id}-direct-riser`,
    start: [x, mainY + overlap, mainZ],
    end: [x, elbowTopY - overlap, mainZ],
    radius: pipeRadius,
    material,
  });
  const elbow = createElbowPipe({
    name: `${id}-direct-elbow`,
    start: [x, elbowTopY, mainZ],
    control: [x, targetY, mainZ],
    end: [x, targetY, horizontalStartZ],
    radius: pipeRadius,
    material,
  });
  const horizontalPipe = createPipeBetween({
    name: `${id}-direct-connection`,
    start: [
      x,
      targetY,
      horizontalStartZ - directionZ * overlap,
    ],
    end: [
      x,
      targetY,
      targetZ + directionZ * overlap,
    ],
    radius: pipeRadius,
    material,
  });
  const teeCollar = createPipeBetween({
    name: `${id}-main-tee-collar`,
    start: [x, mainY - 0.85, mainZ],
    end: [x, mainY - 0.43, mainZ],
    radius: pipeRadius + 0.2,
    material,
    segments: 18,
  });

  group.add(
    verticalPipe,
    elbow,
    horizontalPipe,
    teeCollar,
  );

  if (addTargetFlange) {
    group.add(
      createPipeBetween({
        name: `${id}-equipment-flange`,
        start: [x, targetY, targetZ - 0.24],
        end: [x, targetY, targetZ + 0.24],
        radius: pipeRadius + 0.22,
        material: fittingMaterial,
        segments: 18,
      }),
    );
  }
}

function createMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({
      color: 0x82918f,
      roughness: 0.93,
    }),
    aisle: new THREE.MeshStandardMaterial({
      color: 0xe5bd43,
      roughness: 0.86,
    }),
    machineZone: new THREE.MeshStandardMaterial({
      color: 0x7565a4,
      transparent: true,
      opacity: 0.2,
      roughness: 0.9,
    }),
    base: new THREE.MeshStandardMaterial({
      color: 0x2f444a,
      roughness: 0.67,
      metalness: 0.23,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x7e9194,
      roughness: 0.43,
      metalness: 0.48,
    }),
    pump: new THREE.MeshStandardMaterial({
      color: 0x4a99b6,
      roughness: 0.48,
      metalness: 0.18,
    }),
    motor: new THREE.MeshStandardMaterial({
      color: 0x546a70,
      roughness: 0.5,
      metalness: 0.3,
    }),
    compressor: new THREE.MeshStandardMaterial({
      color: 0x6d5ca0,
      roughness: 0.5,
      metalness: 0.15,
    }),
    vessel: new THREE.MeshStandardMaterial({
      color: 0xd6dfdd,
      roughness: 0.42,
      metalness: 0.32,
    }),
    cabinet: new THREE.MeshStandardMaterial({
      color: 0xcbd5d3,
      roughness: 0.62,
      metalness: 0.12,
    }),
    cabinetDark: new THREE.MeshStandardMaterial({
      color: 0x40565c,
      roughness: 0.58,
      metalness: 0.22,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x2aa1a8,
      emissive: 0x166974,
      emissiveIntensity: 1.25,
      roughness: 0.2,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x70afbb,
      transparent: true,
      opacity: 0.32,
      roughness: 0.15,
      side: THREE.DoubleSide,
    }),
    pipeBlue: new THREE.MeshStandardMaterial({
      color: 0x3f91bd,
      roughness: 0.36,
      metalness: 0.3,
    }),
    pipeGreen: new THREE.MeshStandardMaterial({
      color: 0x3a9c79,
      roughness: 0.36,
      metalness: 0.3,
    }),
    pipeOrange: new THREE.MeshStandardMaterial({
      color: 0xd58b37,
      roughness: 0.38,
      metalness: 0.28,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xe6b238,
      roughness: 0.72,
    }),
  };
}

function createStatusLamp(color) {
  const lampMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  });

  return new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8),
    lampMaterial,
  );
}

function createPumpSkid({ id, position, materials, status = "running" }) {
  const skid = new THREE.Group();
  const statusColor = status === "warning" ? 0xf0ac35 : 0x35c79e;

  skid.name = id;
  skid.position.set(...position);
  skid.userData = {
    equipmentId: id,
    equipmentType: "utility-pump",
    status,
  };

  skid.add(
    createBox({
      name: `${id}-base`,
      size: [13, 0.65, 6.5],
      position: [0, 0.45, 0],
      material: materials.base,
    }),
    createCylinder({
      name: `${id}-motor`,
      radius: 1.75,
      height: 5.8,
      position: [-2.6, 2.45, 0],
      material: materials.motor,
      rotation: [0, 0, Math.PI / 2],
    }),
    createCylinder({
      name: `${id}-pump`,
      radius: 2,
      height: 2.3,
      position: [2.2, 2.45, 0],
      material: materials.pump,
      rotation: [Math.PI / 2, 0, 0],
    }),
    createCylinder({
      name: `${id}-outlet`,
      radius: 0.58,
      height: 4,
      position: [2.2, 5.2, 0],
      material: materials.pipeBlue,
    }),
  );

  const lamp = createStatusLamp(statusColor);

  lamp.name = `${id}-status`;
  lamp.position.set(5, 2, 2.7);
  skid.add(lamp);
  return skid;
}

function createAirCompressor({ id, position, materials }) {
  const compressor = new THREE.Group();

  compressor.name = id;
  compressor.position.set(...position);
  compressor.userData = {
    equipmentId: id,
    equipmentType: "air-compressor",
    status: "running",
  };

  compressor.add(
    createBox({
      name: `${id}-base`,
      size: [16, 0.7, 7.5],
      position: [0, 0.5, 0],
      material: materials.base,
    }),
    createCylinder({
      name: `${id}-receiver`,
      radius: 2.25,
      height: 9.5,
      position: [-1.7, 3.1, 0],
      material: materials.compressor,
      rotation: [0, 0, Math.PI / 2],
    }),
    createBox({
      name: `${id}-drive`,
      size: [4.2, 4.8, 5.5],
      position: [5.1, 3.15, 0],
      material: materials.cabinetDark,
    }),
    createBox({
      name: `${id}-screen`,
      size: [0.18, 1.35, 2.1],
      position: [7.23, 3.65, 0],
      material: materials.screen,
      castShadow: false,
    }),
    createCylinder({
      name: `${id}-discharge-nozzle`,
      radius: 0.46,
      height: 2,
      position: [-1.7, 6.3, 0],
      material: materials.pipeGreen,
      segments: 16,
    }),
    createCylinder({
      name: `${id}-discharge-nozzle-flange`,
      radius: 0.64,
      height: 0.3,
      position: [-1.7, 5.45, 0],
      material: materials.base,
      segments: 18,
    }),
  );

  [-5.5, 2].forEach((x, index) => {
    compressor.add(
      createBox({
        name: `${id}-foot-${index + 1}`,
        size: [0.8, 1.3, 4.4],
        position: [x, 1.05, 0],
        material: materials.base,
      }),
    );
  });

  return compressor;
}

function addFloorAndZones(group, materials) {
  group.add(
    createBox({
      name: "utility-interior-floor",
      size: [195, 0.14, 100],
      position: [-92, 0.82, -2],
      material: materials.floor,
      castShadow: false,
    }),
    createBox({
      name: "utility-main-aisle",
      size: [6, 0.04, 92],
      position: [-85, 0.92, -2],
      material: materials.aisle,
      castShadow: false,
    }),
    createBox({
      name: "utility-pump-zone",
      size: [90, 0.05, 20],
      position: [-140, 0.94, -27],
      material: materials.machineZone,
      castShadow: false,
    }),
    createBox({
      name: "utility-compressor-zone",
      size: [90, 0.05, 20],
      position: [-140, 0.94, 18],
      material: materials.machineZone,
      castShadow: false,
    }),
  );

  [-147.4, -94.6].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-door-safety-line-${index + 1}`,
        size: [5, 0.045, 30],
        position: [x, 0.96, 35],
        material: materials.aisle,
        castShadow: false,
      }),
    );
  });
}

function addPumpRoom(group, materials) {
  [-175, -140, -105].forEach((x, index) => {
    group.add(
      createPumpSkid({
        id: `PUMP-UT-${String(index + 1).padStart(2, "0")}`,
        position: [x, 1, -27],
        materials,
        status: index === 1 ? "warning" : "running",
      }),
    );
  });

  group.add(
    createAirCompressor({
      id: "COMP-UT-01",
      position: [-165, 1, 18],
      materials,
    }),
    createAirCompressor({
      id: "COMP-UT-02",
      position: [-115, 1, 18],
      materials,
    }),
  );
}

function addWaterTreatment(group, materials) {
  [-65, -42, -19].forEach((x, index) => {
    group.add(
      createCylinder({
        name: `FILTER-UT-${String(index + 1).padStart(2, "0")}`,
        radius: 2.25,
        height: 8.5,
        position: [x, 5.2, -27],
        material: materials.vessel,
        segments: 22,
      }),
      createCylinder({
        name: `FILTER-UT-BAND-${index + 1}`,
        radius: 2.4,
        height: 0.5,
        position: [x, 5.2, -27],
        material: materials.pipeBlue,
        segments: 22,
      }),
    );
  });

  group.add(
    createBox({
      name: "utility-water-treatment-skid",
      size: [58, 0.65, 10],
      position: [-42, 1.15, -27],
      material: materials.base,
    }),
  );
}

function addElectricalPanels(group, materials) {
  [-180, -145, -110, -75, -40, -10].forEach((x, index) => {
    group.add(
      createBox({
        name: `SWGR-UT-${String(index + 1).padStart(2, "0")}`,
        size: [9.5, 6.8, 2.4],
        position: [x, 4.35, -49],
        material: materials.cabinet,
      }),
      createBox({
        name: `SWGR-UT-SCREEN-${index + 1}`,
        size: [2.2, 1.4, 0.16],
        position: [x, 5, -47.72],
        material: index === 2 ? materials.warning : materials.screen,
        castShadow: false,
      }),
    );
  });
}

function addControlRoom(group, materials) {
  group.add(
    createBox({
      name: "utility-control-room-glass",
      size: [70, 7.5, 0.25],
      position: [-45, 4.7, 10],
      material: materials.glass,
      castShadow: false,
    }),
    createBox({
      name: "utility-control-room-side-glass",
      size: [0.25, 7.5, 38],
      position: [-80, 4.7, 29],
      material: materials.glass,
      castShadow: false,
    }),
  );

  [-62, -28].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-control-desk-${index + 1}`,
        size: [7, 0.7, 3.2],
        position: [x, 2.25, 34],
        material: materials.cabinetDark,
      }),
      createBox({
        name: `utility-control-monitor-${index + 1}`,
        size: [4.6, 2.5, 0.3],
        position: [x, 4.15, 33.1],
        material: materials.screen,
        castShadow: false,
      }),
    );
  });
}

function addOverheadPipes(group, materials) {
  [-185, -135, -85, -35, 5].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-interior-pipe-support-${index + 1}`,
        size: [0.55, 3.2, 25],
        position: [x, 11.5, -12],
        material: materials.steel,
      }),
    );
  });
}

function addWaterPipeNetwork(group, materials) {
  [-65, -42, -19].forEach((x, index) => {
    addDirectEquipmentBranch({
      group,
      id: `FILTER-UT-${String(index + 1).padStart(2, "0")}`,
      x,
      mainZ: -20,
      targetY: 8.2,
      targetZ: -29.15,
      material: materials.pipeBlue,
      fittingMaterial: materials.base,
      pipeRadius: 0.38,
      elbowRadius: 0.85,
    });
  });

  [-172.8, -137.8, -102.8].forEach((x, index) => {
    addDirectEquipmentBranch({
      group,
      id: `PUMP-UT-${String(index + 1).padStart(2, "0")}`,
      x,
      mainZ: -20,
      targetY: 3.45,
      targetZ: -28.05,
      material: materials.pipeBlue,
      fittingMaterial: materials.base,
      pipeRadius: 0.38,
      elbowRadius: 0.85,
    });
  });
}

function addCompressedAirPipeNetwork(group, materials) {
  [-166.7, -116.7].forEach((x, index) => {
    addDirectEquipmentBranch({
      group,
      id: `COMP-UT-${String(index + 1).padStart(2, "0")}`,
      x,
      mainZ: -12,
      targetY: 7.8,
      targetZ: 18,
      material: materials.pipeGreen,
      fittingMaterial: materials.base,
      pipeRadius: 0.4,
      elbowRadius: 0.9,
      addTargetFlange: false,
    });
  });
}

function addThermalPipeNetwork(group, materials) {
  const heatExchanger = new THREE.Group();

  heatExchanger.name = "HX-UT-01";
  heatExchanger.position.set(-40, 1, -4);
  heatExchanger.userData = {
    equipmentId: "HX-UT-01",
    equipmentType: "heat-exchanger",
    status: "running",
  };

  heatExchanger.add(
    createBox({
      name: "HX-UT-01-base",
      size: [14, 0.65, 7],
      position: [0, 0.45, 0],
      material: materials.base,
    }),
    createCylinder({
      name: "HX-UT-01-shell",
      radius: 2.1,
      height: 10,
      position: [0, 3.25, 0],
      material: materials.vessel,
      rotation: [0, 0, Math.PI / 2],
      segments: 22,
    }),
    createCylinder({
      name: "HX-UT-01-left-band",
      radius: 2.28,
      height: 0.42,
      position: [-4.65, 3.25, 0],
      material: materials.pipeOrange,
      rotation: [0, 0, Math.PI / 2],
      segments: 22,
    }),
    createCylinder({
      name: "HX-UT-01-right-band",
      radius: 2.28,
      height: 0.42,
      position: [4.65, 3.25, 0],
      material: materials.pipeOrange,
      rotation: [0, 0, Math.PI / 2],
      segments: 22,
    }),
    createBox({
      name: "HX-UT-01-support-left",
      size: [0.8, 2.1, 3.5],
      position: [-3.2, 1.6, 0],
      material: materials.base,
    }),
    createBox({
      name: "HX-UT-01-support-right",
      size: [0.8, 2.1, 3.5],
      position: [3.2, 1.6, 0],
      material: materials.base,
    }),
  );

  group.add(
    heatExchanger,
    createPipeBetween({
      name: "HX-UT-01-main-inlet-pipe",
      start: [-40, 12.4, -4],
      end: [-40, 6.25, -4],
      radius: 0.5,
      material: materials.pipeOrange,
    }),
    createPipeBetween({
      name: "HX-UT-01-main-tee-collar",
      start: [-40, 11.55, -4],
      end: [-40, 11.98, -4],
      radius: 0.7,
      material: materials.pipeOrange,
      segments: 18,
    }),
    createPipeBetween({
      name: "HX-UT-01-inlet-flange",
      start: [-40, 6.12, -4],
      end: [-40, 6.55, -4],
      radius: 0.78,
      material: materials.base,
      segments: 18,
    }),
  );
}

function addInteriorLighting(group, materials) {
  [-160, -110, -60, -10].forEach((x) => {
    [-25, 25].forEach((z) => {
      const light = new THREE.PointLight(0xe9ffff, 1.3, 90, 1.7);

      light.name = "utility-interior-point-light";
      light.position.set(x, 23.5, z);
      group.add(light);
    });
  });
}

export function createUtilityCenterInterior(parent) {
  const group = new THREE.Group();
  const materials = createMaterials();

  group.name = "utility-center-interior";
  addFloorAndZones(group, materials);
  addPumpRoom(group, materials);
  addWaterTreatment(group, materials);
  addElectricalPanels(group, materials);
  addControlRoom(group, materials);
  addOverheadPipes(group, materials);
  addWaterPipeNetwork(group, materials);
  addCompressedAirPipeNetwork(group, materials);
  addThermalPipeNetwork(group, materials);
  addInteriorLighting(group, materials);
  parent.add(group);

  return group;
}
