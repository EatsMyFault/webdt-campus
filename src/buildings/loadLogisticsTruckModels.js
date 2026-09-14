import {
  GLTFLoader,
} from "three/addons/loaders/GLTFLoader.js";

/*
 * 물류센터에서 사용하는 외부 CC0 차량 모델.
 *
 * 같은 GLB를 트럭 수만큼 다시 읽지 않고 각 원본을 한 번만
 * 로드한 뒤 createLogisticsCenter에서 clone하여 사용한다.
 */
const TRUCK_MODEL_SOURCES = Object.freeze({
  box: `${import.meta.env.BASE_URL}models/vehicles/box-truck.glb`,
  curtainside:
    `${import.meta.env.BASE_URL}models/vehicles/curtainside-truck.glb`,
});

function prepareTemplate(scene, modelId) {
  scene.name = `logistics-${modelId}-truck-template`;

  scene.traverse((object) => {
    if (!object.isMesh) return;

    object.castShadow = true;
    object.receiveShadow = true;
  });

  return scene;
}

export async function loadLogisticsTruckModels() {
  const loader = new GLTFLoader();

  const entries = await Promise.all(
    Object.entries(TRUCK_MODEL_SOURCES).map(
      async ([modelId, url]) => {
        try {
          const gltf = await loader.loadAsync(url);

          return [
            modelId,
            prepareTemplate(gltf.scene, modelId),
          ];
        } catch (error) {
          console.warn(
            `물류 트럭 GLB 로딩 실패: ${url}`,
            error,
          );

          /*
           * 한 모델이 실패해도 공장 전체 초기화를 막지 않는다.
           * null이면 기존 절차형 트럭이 대신 생성된다.
           */
          return [modelId, null];
        }
      },
    ),
  );

  return Object.freeze(
    Object.fromEntries(entries),
  );
}
