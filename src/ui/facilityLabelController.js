import * as THREE from "three";

/*
 * CSS2D 라벨은 기본적으로 카메라 거리와 관계없이
 * 항상 같은 픽셀 크기로 그려진다.
 * 건물 라벨만 찾아 거리 기반 크기와 표시 여부를 관리한다.
 */
const DEFAULT_INDOOR_VIEW_IDS = new Set([
  "factory-a-interior",
  "factory-a-support",
  "factory-b-interior",
  "utility-service",
  "logistics-interior",
]);

const REFERENCE_DISTANCE = 340;
const MINIMUM_SCALE = 0.46;
const MAXIMUM_SCALE = 1;
const MAXIMUM_VISIBLE_DISTANCE = 2600;

export function createFacilityLabelController({
  camera,
  root,
  indoorViewIds = DEFAULT_INDOOR_VIEW_IDS,
}) {
  const labels = [];
  const worldPosition = new THREE.Vector3();
  let hiddenForIndoorView = false;

  root.traverse((object) => {
    const element = object.element;

    if (
      !element?.classList?.contains(
        "factory-building-label",
      )
    ) {
      return;
    }

    /*
     * 바깥 element는 CSS2DRenderer가 화면 위치를 계산하는 층,
     * visual은 우리가 거리 배율만 적용하는 안쪽 층이다.
     * 두 변환을 같은 요소에 적용하면 좌표까지 함께 축소된다.
     */
    const visual = document.createElement("div");
    const contentNodes = [
      ...element.childNodes,
    ];

    visual.className =
      "facility-label-visual";

    contentNodes.forEach((node) => {
      visual.append(node);
    });

    element.append(visual);

    labels.push({
      object,
      element,
    });
  });

  function update() {
    labels.forEach(({ object, element }) => {
      object.getWorldPosition(worldPosition);

      const distance =
        camera.position.distanceTo(worldPosition);

      const scale = THREE.MathUtils.clamp(
        REFERENCE_DISTANCE /
          Math.max(distance, 1),
        MINIMUM_SCALE,
        MAXIMUM_SCALE,
      );

      const shouldHide =
        hiddenForIndoorView ||
        distance > MAXIMUM_VISIBLE_DISTANCE;

      /*
       * CSS2DRenderer가 사용하는 바깥 element의 transform은
       * 건드리지 않고, 안쪽 시각 요소가 읽을 변수만 바꾼다.
       */
      element.style.setProperty(
        "--facility-label-scale",
        scale.toFixed(3),
      );

      element.style.visibility =
        shouldHide ? "hidden" : "visible";

      element.setAttribute(
        "aria-hidden",
        String(shouldHide),
      );
    });
  }

  return {
    setViewpoint(viewpoint) {
      hiddenForIndoorView =
        indoorViewIds.has(viewpoint.id);

      update();
    },

    update,

    destroy() {
      labels.forEach(({ element }) => {
        element.style.removeProperty(
          "--facility-label-scale",
        );
        element.style.removeProperty(
          "visibility",
        );
        element.removeAttribute("aria-hidden");
      });
    },
  };
}
