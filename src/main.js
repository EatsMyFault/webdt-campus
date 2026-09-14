import "./style.css";

import { SITE } from "./config/siteConfig.js";

import {
  FACTORY_A,
  FACTORY_B,
  UTILITY_CENTER,
  LOGISTICS_CENTER,
} from "./config/buildingConfig.js";

import {
  SITE_VIEWPOINTS,
} from "./config/viewpointConfig.js";

import {
  createScene,
} from "./scene/createScene.js";

import {
  createGraphicsQualityController,
} from "./scene/graphicsQualityController.js";

import {
  createSite,
} from "./scene/createSite.js";

import {
  createCameraViewController,
} from "./scene/cameraViewController.js";

import {
  createDragLookController,
} from "./scene/dragLookController.js";

import {
  createKeyboardMovementController,
} from "./scene/keyboardMovementController.js";

import {
  loadProductionFactory,
} from "./buildings/loadProductionFactory.js";

import {
  createAssemblyFactory,
} from "./buildings/createAssemblyFactory.js";

import {
  createUtilityCenter,
} from "./buildings/createUtilityCenter.js";

import {
  createLogisticsCenter,
} from "./buildings/createLogisticsCenter.js";

import {
  loadLogisticsTruckModels,
} from "./buildings/loadLogisticsTruckModels.js";

import {
  createPipeFlowController,
} from "./animations/pipeFlowController.js";

import {
  createLogisticsOperationController,
} from "./animations/logisticsOperationController.js";

import {
  createFactoryDoorController,
} from "./interactions/factoryDoorController.js";

import {
  createEquipmentSelectionController,
} from "./interactions/equipmentSelectionController.js";

import {
  createEquipmentDetailPanel,
} from "./ui/equipmentDetailPanel.js";

import {
  createFacilityLabelController,
} from "./ui/facilityLabelController.js";

import {
  createSiteControlPanel,
} from "./ui/siteControlPanel.js";

import {
  EQUIPMENT_DATA,
  getEquipmentById,
} from "./data/equipmentDataRegistry.js";

import {
  UTILITY_FLOW_DATA,
} from "./data/utilityFlowData.js";


/*
 * 출입문 상태에 따라 UI에 표시할 글자
 */
const DOOR_STATUS_VIEW = {
  closed: {
    label: "폐쇄",
    action: "출입문 개방",
  },

  opening: {
    label: "개방 중",
    action: "출입문 폐쇄",
  },

  open: {
    label: "개방",
    action: "출입문 폐쇄",
  },

  closing: {
    label: "폐쇄 중",
    action: "출입문 개방",
  },
};


/*
 * 기본 DOM 요소
 */
const container = document.querySelector(
  "#scene-container",
);

if (!container) {
  throw new Error(
    "#scene-container 요소를 찾을 수 없습니다.",
  );
}


/*
 * Three.js Scene 생성
 */
const sceneSystem = createScene(container);


/*
 * 그래픽 품질 UI와 렌더링 옵션 연결
 */
const graphicsPanel = document.querySelector(
  "#graphics-panel",
);

const graphicsToggleButton = document.querySelector(
  "#graphics-toggle-button",
);

const graphicsOptions = document.querySelector(
  "#graphics-options",
);

const graphicsQualityValue = document.querySelector(
  "#graphics-quality-value",
);

const graphicsQualityButtons = [
  ...document.querySelectorAll(
    "[data-graphics-quality]",
  ),
];

const graphicsQualityController =
  createGraphicsQualityController({
    scene: sceneSystem.scene,
    camera: sceneSystem.camera,
    controls: sceneSystem.controls,
    renderer: sceneSystem.renderer,
    sunlight: sceneSystem.sunlight,
    resize: sceneSystem.resize,
    panel: graphicsPanel,
    toggleButton: graphicsToggleButton,
    optionsElement: graphicsOptions,
    valueElement: graphicsQualityValue,
    qualityButtons: graphicsQualityButtons,
  });


/*
 * 단지 부지 생성
 */
const site = createSite(
  sceneSystem.scene,
  SITE,
);


/*
 * 건물 생성
 */
const [
  factory,
  logisticsTruckModels,
] = await Promise.all([
  loadProductionFactory(
    site.group,
    FACTORY_A,
  ),
  loadLogisticsTruckModels(),
]);

const factoryB = createAssemblyFactory(
  site.group,
  FACTORY_B,
);

const utilityCenter = createUtilityCenter(
  site.group,
  UTILITY_CENTER,
);

const logisticsCenter = createLogisticsCenter(
  site.group,
  LOGISTICS_CENTER,
  logisticsTruckModels,
);

/*
 * 건물 CSS2D 라벨의 거리별 크기와
 * 실내 시점 표시 여부를 관리한다.
 */
const facilityLabelController =
  createFacilityLabelController({
    camera: sceneSystem.camera,
    root: site.group,
  });

const pipeFlowController =
  createPipeFlowController({
    parent: utilityCenter.group,
    flows: UTILITY_FLOW_DATA,
  });

/*
 * 물류 트럭 작업 흐름 컨트롤러.
 * 입차부터 출차까지 트럭을 경로에 따라 움직인다.
 */
const logisticsOperationController =
  createLogisticsOperationController({
    root: logisticsCenter.group,
  });

/*
 * 2D 평면 시점에서는 내부 배치가 보이도록
 * 선택한 건물의 지붕과 옥상 부속만 숨긴다.
 */
const roofNameKeywords = [
  "roof",
  "clerestory",
  "monitor-",
  "solar-",
  "air-handler",
  "exhaust-stack",
  "exhaust-cap",
];

function collectRoofObjects(root) {
  const objects = [];

  root.traverse((object) => {
    const objectName = object.name.toLowerCase();

    if (
      roofNameKeywords.some(
        (keyword) => objectName.includes(keyword),
      )
    ) {
      objects.push(object);
    }
  });

  return objects;
}

const facilityRoofObjects = new Map([
  ["factory-a", collectRoofObjects(factory.group)],
  ["factory-b", collectRoofObjects(factoryB.group)],
  ["utility", collectRoofObjects(utilityCenter.group)],
  ["logistics", collectRoofObjects(logisticsCenter.group)],
]);

function updateRoofVisibility(viewpoint) {
  facilityRoofObjects.forEach((objects) => {
    objects.forEach((object) => {
      object.visible = true;
    });
  });

  if (viewpoint.mode !== "2d") return;

  const activeRoofObjects =
    facilityRoofObjects.get(viewpoint.facilityId) ?? [];

  activeRoofObjects.forEach((object) => {
    object.visible = false;
  });
}


/*
 * A동 출입문 UI
 */
const factoryADoorPanel = document.querySelector(
  "#factory-door-panel",
);

const factoryADoorCards = [
  ...factoryADoorPanel.querySelectorAll(
    "[data-door-card]",
  ),
];

const factoryADoorToggleButtons = [
  ...factoryADoorPanel.querySelectorAll(
    "[data-door-toggle]",
  ),
];


/*
 * B동 출입문 UI
 */
const factoryBDoorPanel = document.querySelector(
  "#factory-b-door-panel",
);

const factoryBDoorCards = [
  ...factoryBDoorPanel.querySelectorAll(
    "[data-door-card]",
  ),
];

const factoryBDoorToggleButtons = [
  ...factoryBDoorPanel.querySelectorAll(
    "[data-door-toggle]",
  ),
];

/*
 * 물류센터 도크 셔터 UI
 *
 * 도크 개수가 많으므로 같은 HTML을 7번 적지 않고
 * createLogisticsCenter가 반환한 셔터 데이터로 카드를 만든다.
 */
const logisticsDoorPanel = document.querySelector(
  "#logistics-door-panel",
);

const logisticsDoorList = logisticsDoorPanel.querySelector(
  "[data-logistics-door-list]",
);

logisticsCenter.doors.forEach(
  (door, index) => {
    const card = document.createElement(
      "section",
    );

    card.className = "door-control-item";
    card.dataset.doorCard = door.id;
    card.dataset.status = "closed";
    card.innerHTML = `
      <div class="door-control-meta">
        <div>
          <strong>${index + 1}번 상하차 도크</strong>
          <span>${door.id}</span>
        </div>

        <strong data-door-status>폐쇄</strong>
      </div>

      <div class="door-progress" aria-hidden="true">
        <i data-door-progress></i>
      </div>

      <button
        type="button"
        data-door-toggle
        data-door-id="${door.id}"
      >
        출입문 개방
      </button>
    `;

    logisticsDoorList.append(card);
  },
);

const logisticsDoorCards = [
  ...logisticsDoorPanel.querySelectorAll(
    "[data-door-card]",
  ),
];

const logisticsDoorToggleButtons = [
  ...logisticsDoorPanel.querySelectorAll(
    "[data-door-toggle]",
  ),
];


/*
 * 세부 시점 UI
 */
const factoryASubviews = document.querySelector(
  "#factory-a-subviews",
);

const factoryBSubviews = document.querySelector(
  "#factory-b-subviews",
);

const utilitySubviews = document.querySelector(
  "#utility-subviews",
);

const logisticsSubviews = document.querySelector(
  "#logistics-subviews",
);


/*
 * 건물별 메인 시점 버튼
 */
const factoryAMainButton = document.querySelector(
  ".viewpoint-list > [data-viewpoint='factory-a']",
);

const factoryBMainButton = document.querySelector(
  ".viewpoint-list > [data-viewpoint='factory-b']",
);

const utilityMainButton = document.querySelector(
  ".viewpoint-list > [data-viewpoint='utility']",
);

const logisticsMainButton = document.querySelector(
  ".viewpoint-list > [data-viewpoint='logistics']",
);


/*
 * 설비 상세정보 팝업
 */
const equipmentDetailModal = document.querySelector(
  "#equipment-detail-modal",
);

let equipmentSelectionController = null;
let selectedEquipmentFacilityId = null;

const equipmentDetailPanel =
  createEquipmentDetailPanel({
    root: equipmentDetailModal,

    onClose() {
      selectedEquipmentFacilityId = null;
      equipmentSelectionController?.clearSelection();
    },
  });


/*
 * A동, B동, 유틸리티와 물류 설비 선택 컨트롤러
 */
equipmentSelectionController =
  createEquipmentSelectionController({
    camera: sceneSystem.camera,
    scene: sceneSystem.scene,
    domElement: sceneSystem.renderer.domElement,
    roots: [
      factory.interior,
      factoryB.interior,
      utilityCenter.outdoorEquipment,
      logisticsCenter.group,
    ],
    initiallyEnabled: false,

    onSelect(equipmentId) {
      const equipment =
        logisticsOperationController
          .createLiveEquipment(equipmentId) ??
        getEquipmentById(equipmentId);

      if (equipment) {
        selectedEquipmentFacilityId =
          equipment.facilityId;
        equipmentDetailPanel.open(equipment);
      }
    },
  });


/*
 * A동과 B동이 공통으로 사용하는
 * 출입문 UI 갱신 함수
 */
function updateDoorControlCards(
  cards,
  {
    doors,
    selectedDoorId,
  },
) {
  doors.forEach((door) => {
    const card = cards.find(
      (item) =>
        item.dataset.doorCard === door.id,
    );

    if (!card) {
      return;
    }

    const view =
      DOOR_STATUS_VIEW[door.status];

    card.dataset.status = door.status;

    card.classList.toggle(
      "selected",
      door.id === selectedDoorId,
    );

    const statusElement =
      card.querySelector(
        "[data-door-status]",
      );

    const progressElement =
      card.querySelector(
        "[data-door-progress]",
      );

    const toggleButton =
      card.querySelector(
        "[data-door-toggle]",
      );

    statusElement.textContent =
      view.label;

    progressElement.style.width =
      `${Math.round(door.openness * 100)}%`;

    toggleButton.textContent =
      view.action;
  });
}


/*
 * A동 출입문 컨트롤러
 */
const factoryDoorController =
  createFactoryDoorController({
    camera: sceneSystem.camera,
    domElement:
      sceneSystem.renderer.domElement,
    doors: factory.doors,
    initiallyEnabled: false,

    onChange(state) {
      updateDoorControlCards(
        factoryADoorCards,
        state,
      );
    },
  });


/*
 * B동 출입문 컨트롤러
 */
const factoryBDoorController =
  createFactoryDoorController({
    camera: sceneSystem.camera,
    domElement:
      sceneSystem.renderer.domElement,
    doors: factoryB.doors,
    initiallyEnabled: false,

    onChange(state) {
      updateDoorControlCards(
        factoryBDoorCards,
        state,
      );
    },
  });

/*
 * 물류센터 도크 셔터 컨트롤러
 */
const logisticsDoorController =
  createFactoryDoorController({
    camera: sceneSystem.camera,
    domElement:
      sceneSystem.renderer.domElement,
    doors: logisticsCenter.doors,
    initiallyEnabled: false,

    onChange(state) {
      updateDoorControlCards(
        logisticsDoorCards,
        state,
      );
    },
  });


/*
 * A동 제어 버튼 클릭
 */
function handleFactoryADoorToggle(event) {
  const doorId =
    event.currentTarget.dataset.doorId;

  factoryDoorController.toggleDoor(
    doorId,
  );
}


/*
 * B동 제어 버튼 클릭
 */
function handleFactoryBDoorToggle(event) {
  const doorId =
    event.currentTarget.dataset.doorId;

  factoryBDoorController.toggleDoor(
    doorId,
  );
}

/*
 * 물류센터 도크 셔터 제어 버튼 클릭
 */
function handleLogisticsDoorToggle(event) {
  const doorId =
    event.currentTarget.dataset.doorId;

  logisticsDoorController.toggleDoor(
    doorId,
  );
}


/*
 * 출입문 버튼 이벤트 등록
 */
factoryADoorToggleButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      handleFactoryADoorToggle,
    );
  },
);

factoryBDoorToggleButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      handleFactoryBDoorToggle,
    );
  },
);

logisticsDoorToggleButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      handleLogisticsDoorToggle,
    );
  },
);


/*
 * 모든 시점 버튼
 */
const viewpointButtons = [
  ...document.querySelectorAll(
    "[data-viewpoint]",
  ),
];


/*
 * 카메라 시점 전환 컨트롤러
 */
const cameraViewController =
  createCameraViewController({
    camera: sceneSystem.camera,
    controls: sceneSystem.controls,
    viewpoints: SITE_VIEWPOINTS,

    onViewChange(viewpoint) {
      updateRoofVisibility(viewpoint);
      facilityLabelController.setViewpoint(
        viewpoint,
      );

      graphicsQualityController.setOverviewMode(
        viewpoint.id === "campus-overview",
      );

      /*
       * 현재 선택된 시점의 종류를 판별한다.
       *
       * factory-a-interior도 factory-a로 시작하므로
       * A동 시점으로 인식된다.
       */
      const isFactoryAView =
        viewpoint.id.startsWith(
          "factory-a",
        );

      const isFactoryBView =
        viewpoint.id.startsWith(
          "factory-b",
        );

      const isUtilityView =
        viewpoint.id.startsWith(
          "utility",
        );

      const isLogisticsView =
        viewpoint.id.startsWith(
          "logistics",
        );

      const activeFacilityId =
        isFactoryAView
          ? "factory-a"
          : isFactoryBView
            ? "factory-b"
            : isUtilityView
              ? "utility"
              : isLogisticsView
                ? "logistics"
                : null;


      /*
       * 왼쪽 세부 시점 목록 표시
       */
      factoryASubviews.hidden =
        !isFactoryAView;

      factoryBSubviews.hidden =
        !isFactoryBView;

      utilitySubviews.hidden =
        !isUtilityView;

      logisticsSubviews.hidden =
        !isLogisticsView;


      /*
       * 오른쪽 출입문 제어 패널 표시
       */
      factoryADoorPanel.hidden =
        !isFactoryAView;

      factoryBDoorPanel.hidden =
        !isFactoryBView;

      logisticsDoorPanel.hidden =
        !isLogisticsView;


      /*
       * 접근성 상태 갱신
       */
      factoryAMainButton.setAttribute(
        "aria-expanded",
        String(isFactoryAView),
      );

      factoryBMainButton.setAttribute(
        "aria-expanded",
        String(isFactoryBView),
      );

      utilityMainButton.setAttribute(
        "aria-expanded",
        String(isUtilityView),
      );

      logisticsMainButton.setAttribute(
        "aria-expanded",
        String(isLogisticsView),
      );


      /*
       * 현재 건물의 상호작용만 활성화
       */
      factoryDoorController.setEnabled(
        isFactoryAView,
      );

      factoryBDoorController.setEnabled(
        isFactoryBView,
      );

      logisticsDoorController.setEnabled(
        isLogisticsView,
      );

      equipmentSelectionController.setEnabled(
        isFactoryAView ||
          isFactoryBView ||
          isUtilityView ||
          isLogisticsView,
      );


      /*
       * 다른 건물 시점으로 이동하면 이전 건물의
       * 설비 상세정보와 선택 테두리를 닫는다.
       */
      if (
        selectedEquipmentFacilityId &&
        selectedEquipmentFacilityId !==
          activeFacilityId
      ) {
        equipmentDetailPanel.close();
      }


      /*
       * 현재 시점 버튼 활성화 표시
       */
      viewpointButtons.forEach(
        (button) => {
          const isFactoryAMainButton =
            button === factoryAMainButton;

          const isFactoryBMainButton =
            button === factoryBMainButton;

          const isUtilityMainButton =
            button === utilityMainButton;

          const isLogisticsMainButton =
            button === logisticsMainButton;

          let isActive =
            button.dataset.viewpoint ===
            viewpoint.id;


          /*
           * 하위 시점을 선택해도
           * 해당 건물의 메인 버튼은 활성 상태로 표시한다.
           */
          if (isFactoryAMainButton) {
            isActive = isFactoryAView;
          }

          if (isFactoryBMainButton) {
            isActive = isFactoryBView;
          }

          if (isUtilityMainButton) {
            isActive = isUtilityView;
          }

          if (isLogisticsMainButton) {
            isActive = isLogisticsView;
          }

          button.classList.toggle(
            "active",
            isActive,
          );

          button.setAttribute(
            "aria-pressed",
            String(isActive),
          );
        },
      );
    },
  });


/*
 * 지정한 시점으로 카메라 이동
 */
function moveToViewpoint(viewId) {
  cameraViewController.moveTo(viewId);
}


/*
 * 시점 버튼 클릭
 */
function handleViewpointClick(event) {
  const viewId =
    event.currentTarget.dataset.viewpoint;

  moveToViewpoint(viewId);
}


/*
 * 숫자키 단축키
 */
function handleViewpointShortcut(event) {
  /*
   * input이나 textarea를 입력 중일 때는
   * 숫자키 단축키를 실행하지 않는다.
   */
  if (
    event.target instanceof HTMLElement &&
    (
      event.target.matches(
        "input, textarea, select",
      ) ||
      event.target.isContentEditable
    )
  ) {
    return;
  }

  const viewpoint =
    SITE_VIEWPOINTS.find(
      (item) =>
        event.code ===
        `Digit${item.shortcut}`,
    );

  if (!viewpoint) {
    return;
  }

  event.preventDefault();

  /*
   * 마우스로 누른 시점 버튼은 브라우저 포커스를 계속 가진다.
   * 그 상태에서 숫자키를 누르면 이전 버튼에 포커스 테두리가
   * 남으므로, 숫자 시점 전환 직전에 해당 포커스만 해제한다.
   *
   * input/textarea는 위에서 이미 제외했기 때문에
   * 사용자 입력 중인 요소의 포커스를 빼앗지는 않는다.
   */
  const focusedElement =
    document.activeElement;

  if (
    focusedElement instanceof HTMLElement &&
    focusedElement.closest("[data-viewpoint]")
  ) {
    focusedElement.blur();
  }

  moveToViewpoint(viewpoint.id);
}


/*
 * 시점 이벤트 등록
 */
viewpointButtons.forEach((button) => {
  button.addEventListener(
    "click",
    handleViewpointClick,
  );
});

window.addEventListener(
  "keydown",
  handleViewpointShortcut,
);


/*
 * 단지 통합 관제 패널.
 * 물류 트럭·도크는 실시간 상태를 덮어써서 집계한다.
 */
const siteControlPanel =
  createSiteControlPanel({
    root: document.querySelector(
      "#site-control-panel",
    ),
    equipment: EQUIPMENT_DATA,

    getLiveStatus: (equipmentId) =>
      logisticsOperationController.getLiveStatus(
        equipmentId,
      ),

    getLogisticsSummary: () =>
      logisticsOperationController.getLogisticsSummary(),

    onSelectFacility: (facilityId) => {
      moveToViewpoint(facilityId);
    },
  });


/*
 * 마우스 시점 회전 컨트롤러
 */
const dragLookController =
  createDragLookController({
    camera: sceneSystem.camera,
    controls: sceneSystem.controls,
    domElement:
      sceneSystem.renderer.domElement,

    isBlocked: () =>
      cameraViewController.isTransitioning() ||
      equipmentDetailPanel.isOpen(),

    getViewMode: () =>
      cameraViewController.getActiveViewId() ?? "",
  });


/*
 * WASD 이동 컨트롤러
 */
const keyboardMovement =
  createKeyboardMovementController({
    camera: sceneSystem.camera,
    controls: sceneSystem.controls,
    moveSpeed: 22,
    sprintMultiplier: 2.5,

    is2DView: () =>
      cameraViewController
        .getActiveViewId()
        ?.endsWith("-2d") ?? false,

    isBlocked: () =>
      cameraViewController.isTransitioning() ||
      equipmentDetailPanel.isOpen(),
  });


/*
 * 화면 크기 변경 처리
 */
const resizeObserver =
  new ResizeObserver(
    sceneSystem.resize,
  );

resizeObserver.observe(container);


/*
 * 물류 상세정보 갱신 주기(초).
 * 매 프레임 다시 그릴 필요는 없으므로 간격을 둔다.
 */
const LOGISTICS_DETAIL_REFRESH_INTERVAL = 0.25;

/*
 * 단지 관제 패널 갱신 주기(초)
 */
const SITE_PANEL_REFRESH_INTERVAL = 0.5;

let logisticsDetailRefreshTimer = 0;
let sitePanelRefreshTimer = 0;


/*
 * 단지 관제 패널의 집계를 다시 계산한다.
 */
function updateSiteControlPanel(deltaSeconds) {
  sitePanelRefreshTimer += deltaSeconds;

  if (
    sitePanelRefreshTimer <
    SITE_PANEL_REFRESH_INTERVAL
  ) {
    return;
  }

  sitePanelRefreshTimer = 0;
  siteControlPanel.update();
}


/*
 * 물류 설비 상세정보가 열려 있으면
 * 트럭 운행 상태를 반영해 다시 그린다.
 */
function updateLogisticsDetail(deltaSeconds) {
  logisticsDetailRefreshTimer += deltaSeconds;

  if (
    logisticsDetailRefreshTimer <
    LOGISTICS_DETAIL_REFRESH_INTERVAL
  ) {
    return;
  }

  logisticsDetailRefreshTimer = 0;

  if (!equipmentDetailPanel.isOpen()) {
    return;
  }

  const equipmentId =
    equipmentDetailPanel.getOpenEquipmentId();

  if (!equipmentId) {
    return;
  }

  const equipment =
    logisticsOperationController.createLiveEquipment(
      equipmentId,
    );

  if (equipment) {
    equipmentDetailPanel.refresh(equipment);
  }
}


/*
 * 애니메이션 이전 시간
 */
let previousAnimationTime = null;


/*
 * Three.js 렌더링 루프
 */
function animate(animationTime) {
  const deltaSeconds =
    previousAnimationTime === null
      ? 0
      : (
        animationTime -
        previousAnimationTime
      ) / 1000;

  previousAnimationTime =
    animationTime;


  /*
   * 기능별 업데이트
   */
  keyboardMovement.update(
    deltaSeconds,
  );

  cameraViewController.update(
    deltaSeconds,
  );

  graphicsQualityController.update();
  facilityLabelController.update();

  factoryDoorController.update(
    deltaSeconds,
  );

  factoryBDoorController.update(
    deltaSeconds,
  );

  logisticsDoorController.update(
    deltaSeconds,
  );

  pipeFlowController.update(
    deltaSeconds,
  );

  logisticsOperationController.update(
    deltaSeconds,
  );

  equipmentSelectionController.update();
  updateLogisticsDetail(deltaSeconds);
  updateSiteControlPanel(deltaSeconds);

  sceneSystem.controls.update();


  /*
   * WebGL 3D 화면 렌더링
   */
  sceneSystem.renderer.render(
    sceneSystem.scene,
    sceneSystem.camera,
  );


  /*
   * CSS2D 건물 라벨 렌더링
   */
  sceneSystem.labelRenderer.render(
    sceneSystem.scene,
    sceneSystem.camera,
  );
}


/*
 * 애니메이션 시작
 */
sceneSystem.renderer.setAnimationLoop(
  animate,
);


/*
 * 페이지 종료 시 이벤트와 Three.js 자원 정리
 */
window.addEventListener(
  "beforeunload",
  () => {
    sceneSystem.renderer.setAnimationLoop(
      null,
    );

    resizeObserver.disconnect();


    /*
     * 시점 버튼 이벤트 제거
     */
    viewpointButtons.forEach(
      (button) => {
        button.removeEventListener(
          "click",
          handleViewpointClick,
        );
      },
    );

    window.removeEventListener(
      "keydown",
      handleViewpointShortcut,
    );


    /*
     * A동 문 버튼 이벤트 제거
     */
    factoryADoorToggleButtons.forEach(
      (button) => {
        button.removeEventListener(
          "click",
          handleFactoryADoorToggle,
        );
      },
    );


    /*
     * B동 문 버튼 이벤트 제거
     */
    factoryBDoorToggleButtons.forEach(
      (button) => {
        button.removeEventListener(
          "click",
          handleFactoryBDoorToggle,
        );
      },
    );

    /*
     * 물류센터 도크 셔터 버튼 이벤트 제거
     */
    logisticsDoorToggleButtons.forEach(
      (button) => {
        button.removeEventListener(
          "click",
          handleLogisticsDoorToggle,
        );
      },
    );


    /*
     * 컨트롤러 및 Three.js 자원 정리
     */
    cameraViewController.destroy();
    dragLookController.destroy();
    keyboardMovement.destroy();
    factoryDoorController.destroy();
    factoryBDoorController.destroy();
    logisticsDoorController.destroy();
    equipmentSelectionController.destroy();
    equipmentDetailPanel.destroy();
    facilityLabelController.destroy();
    pipeFlowController.destroy();
    logisticsOperationController.destroy();
    siteControlPanel.destroy();
    graphicsQualityController.destroy();

    site.dispose();
    sceneSystem.dispose();
  },
  {
    once: true,
  },
);
