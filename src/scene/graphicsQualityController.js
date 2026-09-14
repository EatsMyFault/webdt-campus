const STORAGE_KEY = "webdt-campus-graphics-quality";

const QUALITY_PRESETS = Object.freeze({
  low: {
    label: "낮음",
    pixelRatio: 1,
    shadows: false,
    shadowMapSize: 1024,
    detailFog: [750, 2200],
    overviewFog: [1600, 3800],
  },
  medium: {
    label: "중간",
    pixelRatio: 1.25,
    shadows: true,
    shadowMapSize: 2048,
    detailFog: [900, 2600],
    overviewFog: [2400, 5200],
  },
  high: {
    label: "높음",
    pixelRatio: 2,
    shadows: true,
    shadowMapSize: 4096,
    detailFog: [1100, 3200],
    overviewFog: null,
  },
});

function detectAutomaticQuality() {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;

  if (
    (Number.isFinite(memory) && memory <= 4) ||
    (Number.isFinite(cores) && cores <= 4)
  ) {
    return "low";
  }

  if (
    Number.isFinite(memory) &&
    memory >= 8 &&
    Number.isFinite(cores) &&
    cores >= 8
  ) {
    return "high";
  }

  return "medium";
}

function loadSavedQuality() {
  try {
    const savedQuality = localStorage.getItem(STORAGE_KEY);

    if (
      savedQuality === "auto" ||
      Object.hasOwn(QUALITY_PRESETS, savedQuality)
    ) {
      return savedQuality;
    }
  } catch {
    // 저장소를 사용할 수 없는 환경에서는 자동 품질로 시작한다.
  }

  return "auto";
}

export function createGraphicsQualityController({
  scene,
  camera,
  controls,
  renderer,
  sunlight,
  resize,
  modal,
  toggleButton,
  closeButtons,
  valueElement,
  qualityButtons,
}) {
  const fog = scene.fog;
  let selectedQuality = loadSavedQuality();
  let resolvedQuality = "medium";
  let isOverviewMode = true;

  function updateCameraPrecision() {
    const nextNear = isOverviewMode
      ? Math.min(
        8,
        Math.max(
          0.15,
          camera.position.distanceTo(controls.target) * 0.005,
        ),
      )
      : 0.15;

    if (Math.abs(camera.near - nextNear) < 0.02) {
      return;
    }

    camera.near = nextNear;
    camera.updateProjectionMatrix();
  }

  function updateFog() {
    const preset = QUALITY_PRESETS[resolvedQuality];

    /*
     * 높은 품질의 단지 전체뷰에서는 안개를 완전히 제거한다.
     * 상세 시점으로 돌아가면 기존 Fog 객체를 다시 연결한다.
     */
    if (isOverviewMode && preset.overviewFog === null) {
      scene.fog = null;
      return;
    }

    scene.fog = fog;

    if (!fog) {
      return;
    }

    const [near, far] = isOverviewMode
      ? preset.overviewFog
      : preset.detailFog;

    fog.near = near;
    fog.far = far;
  }

  function applyQuality(quality) {
    selectedQuality = quality;
    resolvedQuality = quality === "auto"
      ? detectAutomaticQuality()
      : quality;

    const preset = QUALITY_PRESETS[resolvedQuality];
    const nextShadowMapSize = preset.shadowMapSize;

    /*
     * preset.pixelRatio는 상한값이 아니라 실제 렌더링 배율이다.
     * 따라서 DPR 1 모니터에서도 높음은 2배 해상도로 그린다.
     */
    renderer.setPixelRatio(preset.pixelRatio);

    renderer.shadowMap.enabled = preset.shadows;
    sunlight.castShadow = preset.shadows;

    if (
      sunlight.shadow.mapSize.x !== nextShadowMapSize ||
      sunlight.shadow.mapSize.y !== nextShadowMapSize
    ) {
      sunlight.shadow.map?.dispose();
      sunlight.shadow.map = null;
      sunlight.shadow.mapSize.set(
        nextShadowMapSize,
        nextShadowMapSize,
      );
    }

    renderer.shadowMap.needsUpdate = true;
    updateFog();
    resize();

    qualityButtons.forEach((button) => {
      const isActive =
        button.dataset.graphicsQuality === selectedQuality;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    valueElement.textContent = selectedQuality === "auto"
      ? `자동 · ${preset.label}`
      : preset.label;

    try {
      localStorage.setItem(STORAGE_KEY, selectedQuality);
    } catch {
      // 저장 실패는 렌더링 동작에 영향을 주지 않는다.
    }
  }

  function handleQualityClick(event) {
    applyQuality(event.currentTarget.dataset.graphicsQuality);
  }

  function open() {
    modal.hidden = false;
    toggleButton.setAttribute("aria-expanded", "true");
    closeButtons[0]?.focus();
  }

  function close() {
    if (modal.hidden) return;

    modal.hidden = true;
    toggleButton.setAttribute("aria-expanded", "false");
    toggleButton.focus();
  }

  function handleToggleClick() {
    if (modal.hidden) {
      open();
      return;
    }

    close();
  }

  function handleBackdropClick(event) {
    if (event.target === modal) {
      close();
    }
  }

  qualityButtons.forEach((button) => {
    button.addEventListener("click", handleQualityClick);
  });

  toggleButton.addEventListener("click", handleToggleClick);
  closeButtons.forEach((button) => {
    button.addEventListener("click", close);
  });
  modal.addEventListener("click", handleBackdropClick);
  applyQuality(selectedQuality);

  return {
    open,
    close,
    isOpen: () => !modal.hidden,

    setOverviewMode(value) {
      isOverviewMode = value;
      updateFog();
      updateCameraPrecision();
    },

    update() {
      updateCameraPrecision();
    },

    getQuality() {
      return {
        selected: selectedQuality,
        resolved: resolvedQuality,
      };
    },

    destroy() {
      qualityButtons.forEach((button) => {
        button.removeEventListener("click", handleQualityClick);
      });

      toggleButton.removeEventListener("click", handleToggleClick);
      closeButtons.forEach((button) => {
        button.removeEventListener("click", close);
      });
      modal.removeEventListener("click", handleBackdropClick);
    },
  };
}
