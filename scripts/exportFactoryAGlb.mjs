import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.({ target: this });
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((result) => {
      const base64 = Buffer.from(result).toString("base64");
      this.result = `data:${blob.type};base64,${base64}`;
      this.onloadend?.({ target: this });
    });
  }
}

class ElementStub {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.style = {};
  }

  setAttribute() {}

  remove() {}

  cloneNode() {
    return new ElementStub(this.ownerDocument);
  }
}

const documentStub = {
  defaultView: {
    Element: ElementStub,
  },

  createElement() {
    return new ElementStub(documentStub);
  },
};

globalThis.FileReader = NodeFileReader;
globalThis.document = documentStub;

const { FACTORY_A } = await import(
  "../src/config/buildingConfig.js"
);
const { createProductionFactory } = await import(
  "../src/buildings/createProductionFactory.js"
);

const exportRoot = new THREE.Group();
const factory = createProductionFactory(
  exportRoot,
  FACTORY_A,
);

/*
 * 건물의 단지 배치 좌표는 런타임에서 적용한다.
 * GLB에는 A동 자체의 로컬 모델만 저장한다.
 */
factory.group.position.set(0, 0, 0);
factory.group.rotation.set(0, 0, 0);

/* CSS2D HTML 라벨은 GLB에 포함할 수 없으므로 제외한다. */
const buildingLabel = factory.group.getObjectByName(
  "factory-a-label",
);
buildingLabel?.removeFromParent();

const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(
  factory.group,
  {
    binary: true,
    onlyVisible: true,
  },
);

const scriptDirectory = dirname(
  fileURLToPath(import.meta.url),
);
const outputPath = resolve(
  scriptDirectory,
  "../public/models/factory-a.glb",
);

await mkdir(dirname(outputPath), {
  recursive: true,
});
await writeFile(outputPath, Buffer.from(glb));

console.log(
  `A동 GLB 생성 완료: ${outputPath} (${(
    glb.byteLength /
    1024 /
    1024
  ).toFixed(2)} MB)`,
);
