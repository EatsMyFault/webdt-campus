/*
 * 내보낸 A동 GLB 안에 설비 노드가 제대로 들어갔는지 확인한다.
 *
 * GLB 는 산출물이라 소스만 고치고 내보내기를 잊으면
 * 화면이 조용히 예전 상태로 남는다. 그 사고를 막기 위한 점검 도구다.
 *
 *   node scripts/inspectFactoryAGlb.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const modelPath = resolve(
  scriptDirectory,
  "../public/models/factory-a.glb",
);

const { MODULE_ASSEMBLY_EQUIPMENT } = await import(
  "../src/data/moduleAssemblyEquipmentData.js"
);

const buffer = await readFile(modelPath);
const loader = new GLTFLoader();

const gltf = await loader.parseAsync(
  buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ),
  "",
);

const sceneEquipmentIds = new Set();

gltf.scene.traverse((node) => {
  const id = node.userData?.equipmentId;

  if (id) {
    sceneEquipmentIds.add(id);
  }
});

const dataIds = MODULE_ASSEMBLY_EQUIPMENT.map((item) => item.id);
const missing = dataIds.filter((id) => !sceneEquipmentIds.has(id));
const unknown = [...sceneEquipmentIds].filter(
  (id) => !dataIds.includes(id),
);

console.log(`GLB 경로: ${modelPath}`);
console.log(`GLB 안 설비 노드: ${sceneEquipmentIds.size}종`);
console.log(`데이터 설비: ${dataIds.length}종`);
console.log(
  `GLB 에 없는 설비: ${missing.length ? missing.join(", ") : "없음"}`,
);
console.log(
  `데이터에 없는 GLB 설비: ${unknown.length ? unknown.join(", ") : "없음"}`,
);

if (missing.length || unknown.length) {
  console.error(
    "\nGLB 가 최신 소스와 다릅니다. npm run export:factory-a 를 실행하세요.",
  );
  process.exitCode = 1;
} else {
  console.log("\nGLB 와 설비 데이터가 일치합니다.");
}
