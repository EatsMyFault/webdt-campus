import * as THREE from "three";

const PIPE_RADIUS = 0.65;
const MIN_MARKER_SPEED = 8;
const MAX_MARKER_SPEED = 30;

function createFlowPath(pointValues) {
  const points = pointValues.map(
    (point) => new THREE.Vector3(...point),
  );
  const path = new THREE.CurvePath();

  for (let index = 0; index < points.length - 1; index += 1) {
    path.add(
      new THREE.LineCurve3(
        points[index],
        points[index + 1],
      ),
    );
  }

  return path;
}

function createFlowState(flow) {
  if (!Array.isArray(flow.points) || flow.points.length < 2) {
    throw new Error(`배관 경로 좌표가 부족합니다: ${flow.id}`);
  }

  const group = new THREE.Group();
  const path = createFlowPath(flow.points);
  const markerCount = Math.max(1, Math.floor(flow.markerCount ?? 10));
  const markerRadius = Math.max(0.1, flow.markerRadius ?? 0.45);
  const geometry = new THREE.SphereGeometry(
    markerRadius,
    12,
    8,
  );
  const material = new THREE.MeshStandardMaterial({
    color: flow.color,
    emissive: flow.emissiveColor ?? flow.color,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const markers = [];

  group.name = `${flow.id}-markers`;
  group.userData.flowId = flow.id;

  for (let index = 0; index < markerCount; index += 1) {
    const marker = new THREE.Mesh(geometry, material);

    marker.name = `${flow.id}-marker-${index + 1}`;
    marker.renderOrder = 4;
    marker.userData.offset = index / markerCount;
    marker.frustumCulled = false;
    markers.push(marker);
    group.add(marker);
  }

  return {
    flow,
    group,
    path,
    pathLength: Math.max(path.getLength(), 0.001),
    markerRadius,
    geometry,
    material,
    markers,
    progress: 0,
  };
}

export function createPipeFlowController({
  parent,
  flows,
}) {
  if (!parent) {
    throw new Error("유량 마커를 추가할 부모 그룹이 필요합니다.");
  }

  if (!Array.isArray(flows)) {
    throw new Error("배관 유량 데이터 배열이 필요합니다.");
  }

  const root = new THREE.Group();
  const states = flows.map(createFlowState);
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const surfaceNormal = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const fallbackAxis = new THREE.Vector3(1, 0, 0);
  let elapsed = 0;

  root.name = "utility-pipe-flow-markers";
  states.forEach((state) => root.add(state.group));
  parent.add(root);

  function updateMarkerPosition(state, marker, pathProgress) {
    state.path.getPointAt(pathProgress, point);
    state.path.getTangentAt(pathProgress, tangent).normalize();

    /*
     * 마커를 배관 중심에 두면 불투명한 배관 안에 묻힌다.
     * 진행 방향에 수직인 표면 방향을 계산해 배관 바깥으로 올린다.
     */
    surfaceNormal
      .copy(worldUp)
      .addScaledVector(
        tangent,
        -worldUp.dot(tangent),
      );

    if (surfaceNormal.lengthSq() < 0.000001) {
      surfaceNormal.crossVectors(
        tangent,
        fallbackAxis,
      );
    }

    surfaceNormal.normalize();
    point.addScaledVector(
      surfaceNormal,
      PIPE_RADIUS + state.markerRadius * 0.62,
    );

    marker.position.copy(point);
  }

  function update(deltaSeconds) {
    const safeDeltaSeconds = Math.min(
      Math.max(deltaSeconds, 0),
      0.05,
    );

    elapsed += safeDeltaSeconds;

    states.forEach((state) => {
      const { flow } = state;
      const flowRate = Math.max(0, Number(flow.flowRate) || 0);
      const nominalFlowRate = Math.max(
        Number(flow.nominalFlowRate) || 1,
        0.001,
      );
      const isStopped =
        flow.status === "stopped" ||
        flow.status === "idle" ||
        flowRate <= 0;

      state.group.visible = !isStopped;
      if (isStopped) return;

      const flowRatio = THREE.MathUtils.clamp(
        flowRate / nominalFlowRate,
        0,
        1.5,
      );
      const worldSpeed = THREE.MathUtils.lerp(
        MIN_MARKER_SPEED,
        MAX_MARKER_SPEED,
        Math.min(flowRatio, 1),
      );
      const direction = flow.direction === -1 ? -1 : 1;

      state.progress = THREE.MathUtils.euclideanModulo(
        state.progress +
          (worldSpeed / state.pathLength) *
            safeDeltaSeconds *
            direction,
        1,
      );

      if (flow.status === "warning") {
        const pulse = (Math.sin(elapsed * 6) + 1) / 2;
        state.material.opacity = 0.58 + pulse * 0.38;
        state.material.emissiveIntensity = 1.2 + pulse * 1.5;
      } else {
        state.material.opacity = 0.94;
        state.material.emissiveIntensity = 1.5;
      }

      state.markers.forEach((marker) => {
        const markerProgress = THREE.MathUtils.euclideanModulo(
          state.progress + marker.userData.offset,
          1,
        );

        updateMarkerPosition(
          state,
          marker,
          markerProgress,
        );
      });
    });
  }

  function destroy() {
    parent.remove(root);

    states.forEach((state) => {
      state.geometry.dispose();
      state.material.dispose();
      state.group.clear();
    });

    root.clear();
  }

  return {
    root,
    update,
    destroy,
  };
}
