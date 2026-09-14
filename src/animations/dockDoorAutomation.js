/*
 * 도크 셔터 자동 개폐.
 *
 * 트럭이 배정 도크에 붙기 시작하면 그 도크의 셔터를 열고,
 * 출차를 시작하면 닫는다.
 *
 * 매 프레임 셔터 상태를 덮어쓰지 않고, 트럭이 도크 구간에
 * 들고 나는 순간에만 움직인다. 그래야 도크 제어 패널이나
 * 클릭으로 수동 조작한 셔터를 자동 제어가 곧바로 되돌리지 않는다.
 */

import {
  LOGISTICS_DOCKS,
} from "../data/logisticsEquipmentData.js";

/*
 * 셔터를 열어 두는 운행 단계.
 *
 * 후진 접안(docking)보다 한 단계 앞선 도크 대기(waiting)부터 열어
 * 트럭이 들어올 때는 이미 열려 있게 한다.
 */
const DOCK_OCCUPIED_STAGES = Object.freeze(
  new Set(["waiting", "docking", "handling"]),
);

/*
 * 설비 데이터가 도크와 셔터를 이어 두었다.
 */
export const DOCK_DOOR_LINKS = Object.freeze(
  LOGISTICS_DOCKS.map((dock) => Object.freeze({
    dockId: dock.id,
    doorId: dock.logistics.doorId,
  })),
);

export function createDockDoorAutomation({
  operationController,
  doorController,
  links = DOCK_DOOR_LINKS,
}) {
  if (!operationController) {
    throw new Error("트럭 운행 컨트롤러가 필요합니다.");
  }

  if (!doorController) {
    throw new Error("도크 셔터 컨트롤러가 필요합니다.");
  }

  /*
   * 배정된 트럭이 없는 도크는 자동 제어 대상이 아니다.
   * 그런 셔터는 수동 조작 상태를 그대로 둔다.
   */
  const occupancy = new Map(
    links.map((link) => [link.dockId, false]),
  );

  function update() {
    links.forEach(({ dockId, doorId }) => {
      const dockState =
        operationController.getDockState(dockId);

      const occupied =
        Boolean(dockState) &&
        DOCK_OCCUPIED_STAGES.has(dockState.stage);

      if (occupancy.get(dockId) === occupied) {
        return;
      }

      occupancy.set(dockId, occupied);
      doorController.setDoorOpen(doorId, occupied);
    });
  }

  return {
    update,

    destroy() {
      occupancy.clear();
    },
  };
}
