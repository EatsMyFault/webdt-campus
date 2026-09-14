import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

export function createScene(container) {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color(0xdcecf4);
  scene.fog = new THREE.Fog(0xdcecf4, 900, 2600);

  const camera = new THREE.PerspectiveCamera(
    48,
    1,
    0.1,
    5000,
  );

  camera.position.set(820, 680, 920);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = "webgl-canvas";

  const labelRenderer = new CSS2DRenderer();

  labelRenderer.domElement.className = "label-layer";

  const controls = new OrbitControls(
    camera,
    renderer.domElement,
  );

  controls.target.set(0, 0, 5);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  /*
   * 좌클릭 회전은 dragLookController가 자유시점 방식으로 담당한다.
   * OrbitControls에는 휠 확대/축소와 우클릭 평행 이동만 남긴다.
   */
  controls.enableRotate = false;
  controls.minDistance = 4;
  controls.maxDistance = 2200;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.screenSpacePanning = false;

  const hemisphereLight = new THREE.HemisphereLight(
    0xf5fbff,
    0x76906a,
    1.7,
  );

  const sunlight = new THREE.DirectionalLight(0xfff7df, 3);

  sunlight.position.set(-600, 900, 500);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -900;
  sunlight.shadow.camera.right = 900;
  sunlight.shadow.camera.top = 700;
  sunlight.shadow.camera.bottom = -700;
  sunlight.shadow.camera.near = 30;
  sunlight.shadow.camera.far = 2200;
  sunlight.shadow.bias = -0.0002;

  scene.add(hemisphereLight, sunlight);
  container.append(renderer.domElement, labelRenderer.domElement);

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
  }

  resize();

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    sunlight,
    resize,

    dispose() {
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
