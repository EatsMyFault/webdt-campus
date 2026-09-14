import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { SITE_ZONES } from "../config/siteConfig.js";

function createSurface({
  name,
  width,
  depth,
  color,
  x = 0,
  y = 0,
  z = 0,
  opacity = 1,
  surfaceLayer = 0,
}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.88,
      metalness: 0,
      transparent: opacity < 1,
      opacity,
      polygonOffset: surfaceLayer > 0,
      polygonOffsetFactor: -surfaceLayer,
      polygonOffsetUnits: -surfaceLayer,
    }),
  );

  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;

  return mesh;
}

function createBox({
  name,
  width,
  height,
  depth,
  color,
  x = 0,
  y = height / 2,
  z = 0,
}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
    }),
  );

  mesh.name = name;
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

function createZone(zone) {
  const [x, z] = zone.position;
  const [width, depth] = zone.size;
  const group = new THREE.Group();

  group.name = `${zone.id}-zone`;

  const pad = createSurface({
    name: `${zone.id}-pad`,
    width,
    depth,
    color: zone.color,
    x,
    y: 0.055,
    z,
    opacity: zone.opacity ?? 0.22,
    surfaceLayer: 2,
  });

  const edgeMaterial = new THREE.LineBasicMaterial({
    color: zone.color,
    transparent: true,
    opacity: 0.95,
  });

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.BoxGeometry(width, 0.12, depth),
    ),
    edgeMaterial,
  );

  edge.position.set(x, 0.11, z);

  group.add(pad, edge);

  if (zone.showLabel !== false) {
    const labelElement = document.createElement("div");

    labelElement.className = `site-zone-label ${zone.id}`;
    labelElement.textContent = zone.label;
    labelElement.style.setProperty("--zone-accent", zone.accent);

    const label = new CSS2DObject(labelElement);

    label.position.set(x, 1.4, z);
    group.add(label);
  }

  return group;
}

/*
 * 모서리가 둥근 사각형 경로.
 * 셰이프를 눕히므로 y축은 -z에 해당하지만,
 * 원점 대칭이라 부호를 신경 쓸 필요가 없다.
 */
function traceRoundedRect(path, halfWidth, halfDepth, radius) {
  const r = Math.max(
    0,
    Math.min(radius, halfWidth, halfDepth),
  );

  path.moveTo(-halfWidth + r, -halfDepth);
  path.lineTo(halfWidth - r, -halfDepth);
  path.absarc(halfWidth - r, -halfDepth + r, r, -Math.PI / 2, 0);
  path.lineTo(halfWidth, halfDepth - r);
  path.absarc(halfWidth - r, halfDepth - r, r, 0, Math.PI / 2);
  path.lineTo(-halfWidth + r, halfDepth);
  path.absarc(-halfWidth + r, halfDepth - r, r, Math.PI / 2, Math.PI);
  path.lineTo(-halfWidth, -halfDepth + r);
  path.absarc(
    -halfWidth + r,
    -halfDepth + r,
    r,
    Math.PI,
    Math.PI * 1.5,
  );
  path.closePath();

  return path;
}

/*
 * 부지를 한 바퀴 두르는 순환도로.
 *
 * 네 변을 사각형 네 장으로 깔면 모서리가 직각으로 꺾인다.
 * 바깥선과 안쪽선을 각각 둥근 사각형으로 그린 고리 하나로 만들어
 * 네 모서리를 곡선으로 잇는다.
 */
function createLoopRoad({ site, color }) {
  const perimeterInset = site.roadWidth / 2 + 16;
  const halfWidth = site.width / 2 - perimeterInset;
  const halfDepth = site.depth / 2 - perimeterInset;
  const half = site.roadWidth / 2;
  const outerRadius = site.roadCornerRadius ?? half * 2;

  const shape = traceRoundedRect(
    new THREE.Shape(),
    halfWidth + half,
    halfDepth + half,
    outerRadius,
  );

  shape.holes.push(
    traceRoundedRect(
      new THREE.Path(),
      halfWidth - half,
      halfDepth - half,
      outerRadius - site.roadWidth,
    ),
  );

  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 24),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
    }),
  );

  mesh.name = "perimeter-loop-road";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.045;
  mesh.receiveShadow = true;

  return mesh;
}

function createRoadMarkings(group, site, originZ) {
  const markingMaterial = new THREE.MeshBasicMaterial({
    color: 0xf6f0ce,
    transparent: true,
    opacity: 0.88,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  const halfWidth = site.width / 2;
  const halfDepth = site.depth / 2;

  for (
    let z = -halfDepth + 48;
    z <= halfDepth - 48;
    z += 30
  ) {
    const marking = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 10),
      markingMaterial,
    );

    marking.rotation.x = -Math.PI / 2;
    marking.position.set(0, 0.095, z);
    group.add(marking);
  }

  for (
    let x = -halfWidth + 48;
    x <= halfWidth - 48;
    x += 32
  ) {
    if (Math.abs(x) < 58) {
      continue;
    }

    const marking = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 0.8),
      markingMaterial,
    );

    marking.rotation.x = -Math.PI / 2;
    marking.position.set(x, 0.095, originZ);
    group.add(marking);
  }
}

function createBoundary(group, site) {
  const wallColor = 0xd5dde0;
  const halfWidth = site.width / 2;
  const halfDepth = site.depth / 2;
  const gateWidth = 58;
  const frontSegmentWidth = (site.width - gateWidth) / 2;
  const frontSegmentOffset = gateWidth / 2 + frontSegmentWidth / 2;

  group.add(
    createBox({
      name: "north-boundary",
      width: site.width,
      height: 1.2,
      depth: 2,
      color: wallColor,
      z: -halfDepth,
    }),
    createBox({
      name: "west-boundary",
      width: 2,
      height: 1.2,
      depth: site.depth,
      color: wallColor,
      x: -halfWidth,
    }),
    createBox({
      name: "east-boundary",
      width: 2,
      height: 1.2,
      depth: site.depth,
      color: wallColor,
      x: halfWidth,
    }),
    createBox({
      name: "south-boundary-left",
      width: frontSegmentWidth,
      height: 1.2,
      depth: 2,
      color: wallColor,
      x: -frontSegmentOffset,
      z: halfDepth,
    }),
    createBox({
      name: "south-boundary-right",
      width: frontSegmentWidth,
      height: 1.2,
      depth: 2,
      color: wallColor,
      x: frontSegmentOffset,
      z: halfDepth,
    }),
  );

  group.add(
    createBox({
      name: "gate-pillar-left",
      width: 4,
      height: 7,
      depth: 4,
      color: 0xf6f8f7,
      x: -gateWidth / 2,
      z: halfDepth,
    }),
    createBox({
      name: "gate-pillar-right",
      width: 4,
      height: 7,
      depth: 4,
      color: 0xf6f8f7,
      x: gateWidth / 2,
      z: halfDepth,
    }),
  );
}

function createTrees(group, site) {
  const positions = [];
  const halfWidth = site.width / 2;
  const halfDepth = site.depth / 2;
  const treeOffset = 18;

  for (
    let x = -halfWidth + 30;
    x <= halfWidth - 30;
    x += 36
  ) {
    positions.push(
      [x, -halfDepth - treeOffset],
      [x, halfDepth + treeOffset],
    );
  }

  for (
    let z = -halfDepth + 30;
    z <= halfDepth - 30;
    z += 36
  ) {
    positions.push(
      [-halfWidth - treeOffset, z],
      [halfWidth + treeOffset, z],
    );
  }

  const trunkGeometry = new THREE.CylinderGeometry(0.65, 0.9, 5, 7);
  const crownGeometry = new THREE.IcosahedronGeometry(3.8, 1);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    new THREE.MeshStandardMaterial({ color: 0x81644a, roughness: 1 }),
    positions.length,
  );
  const crowns = new THREE.InstancedMesh(
    crownGeometry,
    new THREE.MeshStandardMaterial({ color: 0x5e9d65, roughness: 0.95 }),
    positions.length,
  );
  const matrix = new THREE.Matrix4();

  positions.forEach(([x, z], index) => {
    matrix.makeTranslation(x, 2.5, z);
    trunks.setMatrixAt(index, matrix);

    matrix.makeTranslation(x, 7.2, z);
    crowns.setMatrixAt(index, matrix);
  });

  trunks.castShadow = true;
  crowns.castShadow = true;
  trunks.receiveShadow = true;
  crowns.receiveShadow = true;
  trunks.name = "site-tree-trunks";
  crowns.name = "site-tree-crowns";

  group.add(trunks, crowns);
}

export function createSite(scene, site) {
  const siteGroup = new THREE.Group();

  siteGroup.name = "factory-campus-site";

  /*
   * 부지 사각형은 원점이 아니라 centerZ 를 중심으로 놓인다.
   * 지면·도로·담장은 이 그룹에 담고, 원점에 고정돼야 하는
   * 로터리와 교차로만 originZ 만큼 되돌려 붙인다.
   */
  const centerZ = site.centerZ ?? 0;
  const originZ = -centerZ;
  const baseGroup = new THREE.Group();

  baseGroup.name = "campus-site-base";
  baseGroup.position.z = centerZ;
  siteGroup.add(baseGroup);

  const worldGround = createSurface({
    name: "world-ground",
    width: site.worldWidth,
    depth: site.worldDepth,
    color: 0xa9c89d,
    y: -0.08,
  });

  const parcel = createSurface({
    name: "campus-parcel",
    width: site.width,
    depth: site.depth,
    color: 0xe7e8df,
    y: 0,
  });

  const roadColor = 0x65737a;
  const perimeterInset = site.roadWidth / 2 + 16;
  const horizontalRoadLength =
    site.width - perimeterInset * 2;
  const verticalRoadLength =
    site.depth - perimeterInset * 2;
  const centralRoadWidth = 40;

  baseGroup.add(
    worldGround,
    parcel,
    createLoopRoad({
      site,
      color: roadColor,
    }),
    createSurface({
      name: "central-road",
      width: centralRoadWidth,
      depth: verticalRoadLength,
      color: roadColor,
      y: 0.055,
      surfaceLayer: 1,
    }),
    createSurface({
      name: "cross-road",
      width: horizontalRoadLength,
      depth: centralRoadWidth,
      color: roadColor,
      y: 0.06,
      z: originZ,
      surfaceLayer: 1,
    }),
    createSurface({
      name: "entrance-road",
      width: centralRoadWidth,
      depth: 180,
      color: roadColor,
      y: 0.05,
      z: site.depth / 2 + 88,
      surfaceLayer: 1,
    }),
  );

  SITE_ZONES.forEach((zone) => {
    siteGroup.add(createZone(zone));
  });

  const roundabout = createSurface({
    name: "central-roundabout",
    width: 1,
    depth: 1,
    color: roadColor,
    surfaceLayer: 3,
  });

  roundabout.geometry.dispose();
  roundabout.geometry = new THREE.CircleGeometry(46, 64);
  roundabout.rotation.x = -Math.PI / 2;
  roundabout.position.set(0, 0.075, originZ);

  const roundaboutIsland = createSurface({
    name: "roundabout-island",
    width: 1,
    depth: 1,
    color: 0x7eaa6c,
    surfaceLayer: 4,
  });

  roundaboutIsland.geometry.dispose();
  roundaboutIsland.geometry = new THREE.CircleGeometry(18, 48);
  roundaboutIsland.rotation.x = -Math.PI / 2;
  roundaboutIsland.position.set(0, 0.095, originZ);

  baseGroup.add(roundabout, roundaboutIsland);

  createRoadMarkings(baseGroup, site, originZ);
  createBoundary(baseGroup, site);
  createTrees(baseGroup, site);

  scene.add(siteGroup);

  return {
    group: siteGroup,

    dispose() {
      siteGroup.traverse((object) => {
        object.geometry?.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }

        object.element?.remove();
      });

      siteGroup.removeFromParent();
    },
  };
}
