import * as THREE from "three";

import { createPackLineSimulation } from "./packLineSimulation.js";

/*
 * 팩 조립동 ㄷ자 컨베이어 운행 애니메이션.
 *
 * 컨베이어 구조물과 스테이션 배치는 createFactoryBInterior 가 만들고,
 * 여기서는 그 위를 지나는 팩과 벨트 클리트만 움직인다.
 *
 * 팩의 위치는 packLineSimulation 이 정한다.
 * 팩마다 설비에 올라가 사이클 타임을 채우고 다음 공정을 기다리므로,
 * 느린 공정 앞에는 팩이 줄을 서고 뒤는 빈 채로 흐른다.
 *
 * 벨트 자체는 계속 돈다. 팩만 스토퍼에 걸려 섰다 간다.
 * 컨베이어 설비가 멈춤으로 바뀌면 벨트도 팩도 함께 선다.
 */

/* 팩 메시 풀 크기. 라인이 가득 차도 이 수를 넘지 않는다. */
const MAX_PACK_MESHES = 48;

const CLEAT_COUNT = 48;
const BELT_WIDTH = 6;

/* 벨트 윗면에서 팩 중심까지의 높이 */
const CARRIER_LIFT = 1.15;
const CLEAT_LIFT = 0.4;

/*
 * 팩이 스테이션 사이를 건너가는 데 쓰는 시간의 비율.
 * 대부분의 시간은 설비 위에서 작업으로 가고 이동은 잠깐이다.
 */
const TRAVEL_FRACTION_OF_TAKT = 0.2;

/*
 * 화면을 열자마자 병목 앞에 팩이 쌓여 있어야 한눈에 읽힌다.
 * 그래서 라인을 미리 한참 돌려 정상 상태로 만들어 둔다.
 */
const WARM_UP_SECONDS = 5400;

const STOPPED_STATUSES = new Set(["idle", "stopped"]);

export function createPackConveyorPath(pointValues) {
  if (!Array.isArray(pointValues) || pointValues.length < 2) {
    throw new Error("컨베이어 경로 좌표가 부족합니다.");
  }

  const points = pointValues.map((point) => new THREE.Vector3(...point));
  const path = new THREE.CurvePath();

  for (let index = 0; index < points.length - 1; index += 1) {
    path.add(new THREE.LineCurve3(points[index], points[index + 1]));
  }

  return path;
}

export function createPackConveyorController({
  parent,
  path: pathPoints,
  stations,
  getStationState,
  taktSeconds = 60,
  warmUpSeconds = WARM_UP_SECONDS,
  equipmentId = "CNV-PA-01",
  equipmentStore = null,
}) {
  if (!parent) {
    throw new Error("컨베이어 애니메이션을 붙일 부모 그룹이 필요합니다.");
  }

  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error("스테이션 목록이 필요합니다.");
  }

  if (typeof getStationState !== "function") {
    throw new Error("스테이션 상태를 읽을 함수가 필요합니다.");
  }

  const root = new THREE.Group();
  const path = createPackConveyorPath(pathPoints);
  const pathLength = Math.max(path.getLength(), 0.001);
  const stationSpacing = pathLength / stations.length;
  const travelSpeed =
    stationSpacing / Math.max(taktSeconds * TRAVEL_FRACTION_OF_TAKT, 0.001);

  const simulation = createPackLineSimulation({
    stations,
    pathLength,
    getStationState,
    travelSpeed,
  });

  /*
   * 팩은 트레이 위에 얹힌 알루미늄 케이스라 밝고 반사가 있다.
   * 클리트는 벨트와 같은 어두운 색이어야 벨트가 흐르는 것처럼 보인다.
   */
  const carrierGeometry = new THREE.BoxGeometry(5.2, 1.7, 7.6);
  const carrierMaterial = new THREE.MeshStandardMaterial({
    color: 0xaebcc2,
    roughness: 0.38,
    metalness: 0.58,
  });
  const moduleGeometry = new THREE.BoxGeometry(4.2, 0.9, 6.2);
  const moduleMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d8f9c,
    roughness: 0.46,
    metalness: 0.42,
  });
  const cleatGeometry = new THREE.BoxGeometry(BELT_WIDTH - 0.4, 0.14, 0.5);
  const cleatMaterial = new THREE.MeshStandardMaterial({
    color: 0x3c5158,
    roughness: 0.82,
    metalness: 0.12,
  });

  const carriers = [];
  const cleats = [];

  root.name = "factory-b-conveyor-motion";

  for (let index = 0; index < MAX_PACK_MESHES; index += 1) {
    const carrier = new THREE.Group();
    const body = new THREE.Mesh(carrierGeometry, carrierMaterial);
    const moduleBlock = new THREE.Mesh(moduleGeometry, moduleMaterial);

    body.castShadow = true;
    body.receiveShadow = true;
    moduleBlock.position.y = 1.2;
    moduleBlock.castShadow = true;

    carrier.name = `${equipmentId}-carrier-${index + 1}`;
    carrier.visible = false;
    carrier.add(body, moduleBlock);
    carriers.push(carrier);
    root.add(carrier);
  }

  for (let index = 0; index < CLEAT_COUNT; index += 1) {
    const cleat = new THREE.Mesh(cleatGeometry, cleatMaterial);

    cleat.name = `${equipmentId}-cleat-${index + 1}`;
    cleat.userData.offset = index / CLEAT_COUNT;
    cleat.castShadow = false;
    cleat.receiveShadow = false;
    cleats.push(cleat);
    root.add(cleat);
  }

  parent.add(root);

  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  let beltProgress = 0;

  function placeOnPath(object, pathProgress, lift) {
    const clamped = THREE.MathUtils.clamp(pathProgress, 0, 1);

    path.getPointAt(clamped, point);
    path.getTangentAt(clamped, tangent).normalize();

    object.position.set(point.x, point.y + lift, point.z);

    /*
     * 진행 방향이 로컬 +Z 가 되도록 돌린다.
     * 팩은 긴 쪽이 진행 방향과 나란해지고,
     * 클리트는 벨트를 가로지르게 선다.
     */
    object.rotation.y = Math.atan2(tangent.x, tangent.z);
  }

  /* 컨베이어 설비 자체가 멈추면 팩도 벨트도 선다 */
  function isConveyorRunning() {
    const equipment = equipmentStore?.getEquipmentById(equipmentId) ?? null;
    const status = equipment?.status ?? "running";

    return !STOPPED_STATUSES.has(status);
  }

  /*
   * 팩 하나에 메시 하나를 고정으로 물린다.
   * 인덱스로 그때그때 짝지으면 앞 팩이 출하될 때마다
   * 메시가 한 칸씩 밀려 팩들이 순간이동하는 것처럼 보인다.
   */
  const carrierByPackId = new Map();
  const freeCarriers = carriers.map((_, index) => index);
  const seenPackIds = new Set();

  function applyPacks() {
    const packs = simulation.getPacks();

    seenPackIds.clear();

    packs.forEach((pack) => {
      let index = carrierByPackId.get(pack.id);

      if (index === undefined) {
        index = freeCarriers.pop();

        /* 풀이 모자라면 그 팩은 이번 프레임에 그리지 않는다 */
        if (index === undefined) return;

        carrierByPackId.set(pack.id, index);
      }

      seenPackIds.add(pack.id);

      const carrier = carriers[index];

      carrier.visible = true;
      placeOnPath(carrier, pack.distance / pathLength, CARRIER_LIFT);
    });

    carrierByPackId.forEach((index, packId) => {
      if (seenPackIds.has(packId)) return;

      carriers[index].visible = false;
      freeCarriers.push(index);
      carrierByPackId.delete(packId);
    });
  }

  function applyCleats() {
    cleats.forEach((cleat) => {
      placeOnPath(
        cleat,
        THREE.MathUtils.euclideanModulo(
          beltProgress + cleat.userData.offset,
          1,
        ),
        CLEAT_LIFT,
      );
    });
  }

  function update(deltaSeconds) {
    const safeDeltaSeconds = Math.min(Math.max(deltaSeconds, 0), 0.05);

    if (isConveyorRunning()) {
      simulation.update(safeDeltaSeconds);

      beltProgress = THREE.MathUtils.euclideanModulo(
        beltProgress + (travelSpeed / pathLength) * safeDeltaSeconds,
        1,
      );
    }

    applyPacks();
    applyCleats();
  }

  function destroy() {
    parent.remove(root);
    root.clear();

    carrierGeometry.dispose();
    carrierMaterial.dispose();
    moduleGeometry.dispose();
    moduleMaterial.dispose();
    cleatGeometry.dispose();
    cleatMaterial.dispose();
  }

  /* 정상 상태까지 미리 돌려 두고 첫 프레임을 그린다 */
  simulation.warmUp(warmUpSeconds);
  applyPacks();
  applyCleats();

  return {
    root,
    update,
    destroy,
    simulation,
    travelSpeed,
    stationSpacing,
    pathLength,
  };
}
