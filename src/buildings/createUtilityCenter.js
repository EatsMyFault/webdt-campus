import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { createUtilityCenterInterior } from "../interiors/createUtilityCenterInterior.js";

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
  radiusTop,
  radiusBottom = radiusTop,
  height,
  position,
  material,
  segments = 24,
}) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
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
      color: 0xbfc7c4,
      roughness: 0.94,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: 0xe3e9e8,
      roughness: 0.76,
    }),
    lowerWall: new THREE.MeshStandardMaterial({
      color: 0x87999c,
      roughness: 0.72,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x40575d,
      roughness: 0.55,
      metalness: 0.28,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x65777c,
      roughness: 0.68,
      metalness: 0.18,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x5196a9,
      transparent: true,
      opacity: 0.74,
      roughness: 0.16,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0x7663a9,
      roughness: 0.55,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0x798b8f,
      roughness: 0.46,
      metalness: 0.52,
    }),
    tank: new THREE.MeshStandardMaterial({
      color: 0xd3dcdb,
      roughness: 0.42,
      metalness: 0.38,
    }),
    tankBand: new THREE.MeshStandardMaterial({
      color: 0x586c72,
      roughness: 0.48,
      metalness: 0.4,
    }),
    chiller: new THREE.MeshStandardMaterial({
      color: 0x8ea3a5,
      roughness: 0.62,
      metalness: 0.22,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: 0x30464c,
      roughness: 0.58,
      metalness: 0.24,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xe3b23c,
      roughness: 0.66,
    }),
    pipeBlue: new THREE.MeshStandardMaterial({
      color: 0x3f91bd,
      roughness: 0.38,
      metalness: 0.3,
    }),
    pipeGreen: new THREE.MeshStandardMaterial({
      color: 0x3a9c79,
      roughness: 0.38,
      metalness: 0.3,
    }),
    pipeOrange: new THREE.MeshStandardMaterial({
      color: 0xd58b37,
      roughness: 0.4,
      metalness: 0.28,
    }),
  };
}

function addServiceBuilding(group, materials) {
  group.add(
    createBox({
      name: "utility-service-rear-wall",
      size: [92, 16, 1],
      position: [-42, 8.4, -27],
      material: materials.wall,
    }),
    createBox({
      name: "utility-service-left-wall",
      size: [1, 16, 50],
      position: [-88, 8.4, -2],
      material: materials.wall,
    }),
    createBox({
      name: "utility-service-right-wall",
      size: [1, 16, 50],
      position: [4, 8.4, -2],
      material: materials.wall,
    }),
    createBox({
      name: "utility-service-front-wall",
      size: [92, 16, 1],
      position: [-42, 8.4, 23],
      material: materials.wall,
    }),
    createBox({
      name: "utility-service-roof",
      size: [96, 1.1, 54],
      position: [-42, 16.95, -2],
      material: materials.roof,
    }),
    createBox({
      name: "utility-accent-band",
      size: [93, 1.1, 0.4],
      position: [-42, 13.3, 23.2],
      material: materials.accent,
      castShadow: false,
    }),
    createBox({
      name: "utility-service-front-lower-band",
      size: [92.4, 3.2, 0.45],
      position: [-42, 2, 23.55],
      material: materials.lowerWall,
    }),
    createBox({
      name: "utility-service-rear-lower-band",
      size: [92.4, 3.2, 0.45],
      position: [-42, 2, -27.55],
      material: materials.lowerWall,
    }),
    createBox({
      name: "utility-service-left-lower-band",
      size: [0.45, 3.2, 50],
      position: [-88.55, 2, -2],
      material: materials.lowerWall,
    }),
    createBox({
      name: "utility-service-right-lower-band",
      size: [0.45, 3.2, 50],
      position: [4.55, 2, -2],
      material: materials.lowerWall,
    }),
  );

  [-67, -43].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-industrial-door-${index + 1}`,
        size: [17, 10.5, 0.55],
        position: [x, 5.6, 23.35],
        material: materials.dark,
      }),
      createBox({
        name: "utility-door-header",
        size: [18.5, 0.8, 1],
        position: [x, 11.25, 23.2],
        material: materials.frame,
      }),
    );

    for (let y = 1.5; y <= 9.5; y += 2) {
      group.add(
        createBox({
          name: "utility-door-rib",
          size: [16.2, 0.12, 0.12],
          position: [x, y, 23.68],
          material: materials.steel,
          castShadow: false,
        }),
      );
    }
  });

  [-20, -8].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-control-room-window-${index + 1}`,
        size: [9.5, 6.2, 0.35],
        position: [x, 7.2, 23.36],
        material: materials.glass,
        castShadow: false,
      }),
    );
  });

  [-70, -45, -20].forEach((x, index) => {
    const roofVent = createCylinder({
      name: `utility-roof-vent-${index + 1}`,
      radiusTop: 2.6,
      height: 3.6,
      position: [x, 19.1, -7],
      material: materials.steel,
      segments: 16,
    });

    group.add(
      roofVent,
      createCylinder({
        name: `utility-roof-vent-cap-${index + 1}`,
        radiusTop: 3.1,
        height: 0.45,
        position: [x, 21.1, -7],
        material: materials.dark,
        segments: 16,
      }),
    );
  });
}

function addStorageTank({
  group,
  materials,
  id,
  equipmentId,
  status,
  position,
  accentMaterial,
}) {
  const tank = new THREE.Group();

  tank.name = id;
  tank.position.set(position[0], 0, position[1]);
  tank.userData = {
    equipmentId,
    equipmentType: "storage-tank",
    status,
  };

  tank.add(
    createCylinder({
      name: `${id}-body`,
      radiusTop: 11,
      height: 30,
      position: [0, 16.2, 0],
      material: materials.tank,
      segments: 36,
    }),
    createCylinder({
      name: `${id}-top`,
      radiusTop: 8.8,
      radiusBottom: 11,
      height: 4,
      position: [0, 33.2, 0],
      material: materials.tank,
      segments: 36,
    }),
    createCylinder({
      name: `${id}-band`,
      radiusTop: 11.35,
      height: 1,
      position: [0, 17.5, 0],
      material: accentMaterial,
      segments: 36,
    }),
    createCylinder({
      name: `${id}-vent`,
      radiusTop: 1,
      height: 4,
      position: [0, 37.2, 0],
      material: materials.tankBand,
      segments: 16,
    }),
  );

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle, index) => {
    const legX = Math.cos(angle) * 8.7;
    const legZ = Math.sin(angle) * 8.7;

    tank.add(
      createBox({
        name: `${id}-leg-${index + 1}`,
        size: [1.2, 2.4, 1.2],
        position: [legX, 1.4, legZ],
        material: materials.frame,
      }),
    );
  });

  group.add(tank);
}

function addCoolingUnit({
  group,
  materials,
  id,
  equipmentId,
  status,
  position,
}) {
  const [x, z] = position;
  const unit = new THREE.Group();

  unit.name = id;
  unit.position.set(x, 0.7, z);
  unit.userData = {
    equipmentId,
    equipmentType: "chiller",
    status,
  };
  unit.add(
    createBox({
      name: `${id}-base`,
      size: [21, 0.8, 13],
      position: [0, 0.5, 0],
      material: materials.dark,
    }),
    createBox({
      name: `${id}-body`,
      size: [19, 5.2, 11],
      position: [0, 3.45, 0],
      material: materials.chiller,
    }),
  );

  [-5.8, 0, 5.8].forEach((fanX, index) => {
    const fan = createCylinder({
      name: `${id}-fan-${index + 1}`,
      radiusTop: 2.1,
      height: 0.5,
      position: [fanX, 6.3, 0],
      material: materials.dark,
      segments: 20,
    });

    unit.add(fan);
  });

  group.add(unit);
}

function addPipeRack(group, materials) {
  [-180, -120, -60, 0, 45, 95, 145].forEach((x, index) => {
    group.add(
      createBox({
        name: `utility-pipe-rack-post-left-${index + 1}`,
        size: [0.55, 11.2, 0.55],
        position: [x, 6.2, -24],
        material: materials.frame,
      }),
      createBox({
        name: `utility-pipe-rack-post-right-${index + 1}`,
        size: [0.55, 11.2, 0.55],
        position: [x, 6.2, 0],
        material: materials.frame,
      }),
      createBox({
        name: `utility-pipe-rack-beam-${index + 1}`,
        size: [0.7, 0.55, 25],
        position: [x, 11.55, -12],
        material: materials.frame,
      }),
    );
  });

  [
    {
      z: -20,
      endX: 49.02,
      material: materials.pipeBlue,
    },
    {
      z: -12,
      endX: 99.02,
      material: materials.pipeGreen,
    },
    {
      z: -4,
      endX: 149.02,
      material: materials.pipeOrange,
    },
  ].forEach((pipe, index) => {
    const startX = -185;
    const pipeLength = pipe.endX - startX;
    const mesh = createCylinder({
      name: `utility-main-pipe-${index + 1}`,
      radiusTop: 0.65,
      height: pipeLength,
      position: [
        (startX + pipe.endX) / 2,
        12.4,
        pipe.z,
      ],
      material: pipe.material,
      segments: 14,
    });

    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);
  });
}

function addTankPipeConnections(group, materials) {
  const pipeY = 12.4;
  const tankSurfaceZ = 34;
  const elbowRadius = 1.1;

  [
    {
      id: "water",
      x: 50,
      mainPipeZ: -20,
      branchY: 9.2,
      material: materials.pipeBlue,
    },
    {
      id: "air",
      x: 100,
      mainPipeZ: -12,
      branchY: 7.4,
      material: materials.pipeGreen,
    },
    {
      id: "thermal",
      x: 150,
      mainPipeZ: -4,
      branchY: 5.6,
      material: materials.pipeOrange,
    },
  ].forEach((connection) => {
    const elbowCenterZ = connection.mainPipeZ + elbowRadius;
    const elbowCenterY = connection.branchY + elbowRadius;
    const riserBottomY = elbowCenterY;
    const jointOverlap = 0.12;
    const riserTopY = pipeY - elbowRadius;
    const riserHeight =
      riserTopY - riserBottomY + jointOverlap * 2;
    const branchLength =
      tankSurfaceZ - elbowCenterZ + jointOverlap * 2;
    const branchCenterZ =
      (tankSurfaceZ + elbowCenterZ) / 2;
    const supportZ =
      elbowCenterZ + branchLength * 0.58;
    const supportTopY = connection.branchY - 0.65;
    const supportPostHeight = supportTopY - 0.8;

    const riser = createCylinder({
      name: `utility-${connection.id}-tank-riser`,
      radiusTop: 0.65,
      height: riserHeight,
      position: [
        connection.x,
        (riserBottomY + riserTopY) / 2,
        connection.mainPipeZ,
      ],
      material: connection.material,
      segments: 14,
    });

    const branch = createCylinder({
      name: `utility-${connection.id}-tank-branch-pipe`,
      radiusTop: 0.65,
      height: branchLength,
      position: [
        connection.x,
        connection.branchY,
        branchCenterZ,
      ],
      material: connection.material,
      segments: 14,
    });

    branch.rotation.x = Math.PI / 2;

    const elbowCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(
        connection.x,
        elbowCenterY,
        connection.mainPipeZ,
      ),
      new THREE.Vector3(
        connection.x,
        connection.branchY,
        connection.mainPipeZ,
      ),
      new THREE.Vector3(
        connection.x,
        connection.branchY,
        elbowCenterZ,
      ),
    );
    const elbow = new THREE.Mesh(
      new THREE.TubeGeometry(
        elbowCurve,
        18,
        0.65,
        14,
        false,
      ),
      connection.material,
    );

    elbow.name = `utility-${connection.id}-tank-elbow`;
    elbow.castShadow = true;
    elbow.receiveShadow = true;

    const mainElbowCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(
        connection.x - elbowRadius,
        pipeY,
        connection.mainPipeZ,
      ),
      new THREE.Vector3(
        connection.x,
        pipeY,
        connection.mainPipeZ,
      ),
      new THREE.Vector3(
        connection.x,
        pipeY - elbowRadius,
        connection.mainPipeZ,
      ),
    );
    const mainPipeJoint = new THREE.Mesh(
      new THREE.TubeGeometry(
        mainElbowCurve,
        18,
        0.65,
        14,
        false,
      ),
      connection.material,
    );

    mainPipeJoint.name =
      `utility-${connection.id}-main-pipe-terminal-elbow`;
    mainPipeJoint.castShadow = true;
    mainPipeJoint.receiveShadow = true;

    const flange = createCylinder({
      name: `utility-${connection.id}-tank-inlet-flange`,
      radiusTop: 0.95,
      height: 0.42,
      position: [
        connection.x,
        connection.branchY,
        tankSurfaceZ,
      ],
      material: materials.dark,
      segments: 20,
    });

    flange.rotation.x = Math.PI / 2;

    group.add(
      riser,
      branch,
      elbow,
      mainPipeJoint,
      flange,
      createBox({
        name: `utility-${connection.id}-branch-support`,
        size: [0.5, supportPostHeight, 0.5],
        position: [
          connection.x,
          0.8 + supportPostHeight / 2,
          supportZ,
        ],
        material: materials.frame,
      }),
      createBox({
        name: `utility-${connection.id}-branch-support-beam`,
        size: [2.4, 0.45, 0.7],
        position: [
          connection.x,
          supportTopY - 0.225,
          supportZ,
        ],
        material: materials.frame,
      }),
    );
  });
}

function addElectricalYard(group, materials) {
  [185, 205].forEach((x, index) => {
    const transformer = new THREE.Group();
    const number = index + 1;

    transformer.name = `utility-transformer-${number}`;
    transformer.position.set(x, 0, -55);
    transformer.userData = {
      equipmentId: `TR-UT-0${number}`,
      equipmentType: "transformer",
      status: index === 0 ? "running" : "warning",
    };
    transformer.add(
      createBox({
        name: `utility-transformer-${number}-body`,
        size: [6.5, 7, 10],
        position: [0, 4.2, 0],
        material: materials.dark,
      }),
      createBox({
        name: `utility-transformer-warning-${number}`,
        size: [0.2, 2.2, 2.2],
        position: [-3.36, 4.8, 0],
        material: materials.warning,
        castShadow: false,
      }),
    );

    group.add(transformer);
  });
}

function addBuildingLabel(group, building) {
  const element = document.createElement("div");

  element.className = "factory-building-label utility-building-label";
  element.innerHTML = `
    <span>${building.code}</span>
    <strong>${building.name}</strong>
    <small>POWER · WATER · AIR · COOLING</small>
  `;

  const label = new CSS2DObject(element);

  label.name = "utility-center-label";
  label.position.set(-42, 21, 27);
  group.add(label);
}

export function createUtilityCenter(parent, building) {
  const group = new THREE.Group();
  const shellGroup = new THREE.Group();
  const outdoorEquipment = new THREE.Group();
  const materials = createMaterials();

  group.name = building.id;
  group.position.set(...building.position);
  group.rotation.y = building.rotationY;
  group.userData = {
    buildingId: building.id,
    buildingName: building.name,
  };

  shellGroup.name = `${building.id}-shell`;
  outdoorEquipment.name = `${building.id}-outdoor-equipment`;
  shellGroup.scale.set(
    building.shellScaleXZ ?? 1,
    building.shellScaleY ?? 1,
    building.shellScaleXZ ?? 1,
  );

  group.add(
    createBox({
      name: "utility-center-foundation",
      size: [500, 0.7, 280],
      position: [0, 0.38, 0],
      material: materials.foundation,
      castShadow: false,
    }),
  );

  addServiceBuilding(shellGroup, materials);
  addBuildingLabel(shellGroup, building);
  group.add(shellGroup);

  const interior = createUtilityCenterInterior(group);
  group.add(outdoorEquipment);
  addStorageTank({
    group: outdoorEquipment,
    materials,
    id: "utility-water-tank",
    equipmentId: "TANK-UT-01",
    status: "running",
    position: [50, 45],
    accentMaterial: materials.pipeBlue,
  });
  addStorageTank({
    group: outdoorEquipment,
    materials,
    id: "utility-air-tank",
    equipmentId: "TANK-UT-02",
    status: "warning",
    position: [100, 45],
    accentMaterial: materials.pipeGreen,
  });
  addStorageTank({
    group: outdoorEquipment,
    materials,
    id: "utility-thermal-tank",
    equipmentId: "TANK-UT-03",
    status: "running",
    position: [150, 45],
    accentMaterial: materials.pipeOrange,
  });
  addCoolingUnit({
    group: outdoorEquipment,
    materials,
    id: "utility-chiller-01",
    equipmentId: "CHILLER-UT-01",
    status: "running",
    position: [60, -55],
  });
  addCoolingUnit({
    group: outdoorEquipment,
    materials,
    id: "utility-chiller-02",
    equipmentId: "CHILLER-UT-02",
    status: "warning",
    position: [120, -55],
  });
  addPipeRack(group, materials);
  addTankPipeConnections(group, materials);
  addElectricalYard(outdoorEquipment, materials);
  parent.add(group);

  return { group, interior, outdoorEquipment };
}
