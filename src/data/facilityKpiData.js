/*
 * 건물별 운영 KPI.
 *
 * 통합 관제 패널의 KPI 카드 4장은 현재 시점에 맞춰 통째로 교체된다.
 * 생산동은 생산 계획, 유틸리티는 공급 상태, 물류는 입출고 처리량이
 * 핵심 지표라 건물마다 지표 구성 자체가 다르다.
 *
 * 값은 모두 데모용 더미 데이터다.
 * 생산 A·B동의 생산량·불량·에너지 합계는 siteKpiData.js의
 * 단지 합계(SITE_KPI_BASE)와 맞춰 두었다.
 */

import { createSiteKpiTracker } from "./siteKpiData.js";

/*
 * 카드 색은 지표 종류가 아니라 자리 순서를 따른다.
 * 어느 건물을 보든 네 장의 색 리듬이 같아진다.
 */
const CARD_TONES = Object.freeze([
  "primary",
  "flow",
  "caution",
  "energy",
]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatNumber(value, digits = 0) {
  return value.toLocaleString("ko-KR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatChange(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%p`;
}

/*
 * 경과 시간과 가동률에 비례해 누적값을 올린다.
 * 설비가 멈춰 있어도 기저 부하가 있는 지표는 floor로 조절한다.
 */
function accumulate({
  current,
  perHour,
  elapsedSeconds,
  utilizationFactor,
  floor = 0,
  limit = Infinity,
}) {
  const factor = floor + (1 - floor) * utilizationFactor;
  const gain = (perHour / 3600) * elapsedSeconds * factor;

  return Math.min(current + gain, limit);
}

function createUtilizationCard(snapshot) {
  return {
    id: "utilization",
    label: "설비 가동률",
    unit: "%",
    valueText: formatNumber(snapshot.value, 1),
    description:
      `전일 대비 ${formatChange(snapshot.change)} · ` +
      `${snapshot.operating}/${snapshot.total}대 가동`,
    progress: snapshot.progress,
    level: "normal",
  };
}

/*
 * 상태 집계만으로 계산하는 가동률.
 * 생산동은 siteKpiData의 스냅샷을 그대로 쓰고,
 * 유틸리티·물류는 이 함수로 같은 모양을 만든다.
 */
function createUtilizationSnapshot(statusCounts, previousRate) {
  const running = Math.max(statusCounts.running ?? 0, 0);
  const warning = Math.max(statusCounts.warning ?? 0, 0);
  const idle = Math.max(statusCounts.idle ?? 0, 0);
  const stopped = Math.max(statusCounts.stopped ?? 0, 0);
  const total = running + warning + idle + stopped;
  const operating = running + warning;
  const value = total > 0 ? (operating / total) * 100 : 0;

  return {
    value: Number(value.toFixed(1)),
    change: Number((value - previousRate).toFixed(1)),
    operating,
    total,
    progress: clamp(value, 0, 100),
  };
}


/*
 * 생산 A·B동: 가동률 · 생산량 · 불량률 · 에너지
 */
const PRODUCTION_BASES = Object.freeze({
  "factory-a": Object.freeze({
    previousUtilizationRate: 88.9,

    production: Object.freeze({
      completed: 1684,
      target: 2400,
      throughputPerHour: 240,
    }),

    quality: Object.freeze({
      inspected: 1684,
      defects: 25,
      liveDefectRate: 1.48,
      targetRate: 1.5,
    }),

    energy: Object.freeze({
      consumedKwh: 2480.5,
      budgetKwh: 3200,
      currentPowerKw: 268,
    }),
  }),

  "factory-b": Object.freeze({
    previousUtilizationRate: 64.1,

    production: Object.freeze({
      completed: 1180,
      target: 1800,
      throughputPerHour: 170,
    }),

    quality: Object.freeze({
      inspected: 1180,
      defects: 14,
      liveDefectRate: 1.19,
      targetRate: 1.5,
    }),

    energy: Object.freeze({
      consumedKwh: 1930.4,
      budgetKwh: 2600,
      currentPowerKw: 208,
    }),
  }),
});

function createProductionTracker(facilityId) {
  const base = PRODUCTION_BASES[facilityId];
  const tracker = createSiteKpiTracker(base);

  function toCards(snapshot) {
    return [
      createUtilizationCard(snapshot.utilization),

      {
        id: "production",
        label: "생산량",
        unit: "EA",
        valueText: formatNumber(snapshot.production.value),
        description:
          `계획 ${snapshot.production.rate.toFixed(1)}% · ` +
          `목표 ${formatNumber(snapshot.production.target)} EA`,
        progress: snapshot.production.progress,
        level: "normal",
      },

      {
        id: "defect",
        label: "불량률",
        unit: "%",
        valueText: snapshot.defect.value.toFixed(2),
        description:
          `불량 ${formatNumber(snapshot.defect.count)}건 · ` +
          `목표 ${snapshot.defect.targetRate.toFixed(2)}% 이하`,
        progress: snapshot.defect.progress,
        level:
          snapshot.defect.value <= snapshot.defect.targetRate
            ? "good"
            : "warning",
      },

      {
        id: "energy",
        label: "에너지 사용량",
        unit: "kWh",
        valueText: formatNumber(snapshot.energy.value, 1),
        description:
          `예산 ${snapshot.energy.rate.toFixed(1)}% · ` +
          `현재 ${formatNumber(snapshot.energy.currentPower)} kW`,
        progress: snapshot.energy.progress,
        level: snapshot.energy.rate >= 90 ? "warning" : "normal",
      },
    ];
  }

  return {
    caption: "주간조",

    update({ elapsedSeconds = 0, statusCounts = {} } = {}) {
      return toCards(
        tracker.update(elapsedSeconds, statusCounts),
      );
    },

    reset() {
      tracker.reset();
    },
  };
}


/*
 * 유틸리티 센터: 가동률 · 수전 전력 · 용수 · 압축공기 압력
 */
const UTILITY_BASE = Object.freeze({
  previousUtilizationRate: 96.4,

  /*
   * 기저 부하에 가동률 연동 부하를 더해 수전 전력을 만든다.
   */
  power: Object.freeze({
    baseKw: 520,
    loadKw: 430,
    contractKw: 1100,
  }),

  water: Object.freeze({
    consumedTon: 184.2,
    budgetTon: 320,
    perHour: 26,
  }),

  /*
   * 사용량이 늘수록 압축공기 압력은 떨어진다.
   */
  air: Object.freeze({
    normalBar: 7.2,
    dropBar: 0.6,
    minimumBar: 6.2,
  }),
});

function createUtilityTracker() {
  const { power, water, air } = UTILITY_BASE;

  let consumedTon = water.consumedTon;

  function update({ elapsedSeconds = 0, statusCounts = {} } = {}) {
    const utilization = createUtilizationSnapshot(
      statusCounts,
      UTILITY_BASE.previousUtilizationRate,
    );

    const utilizationFactor = utilization.progress / 100;

    consumedTon = accumulate({
      current: consumedTon,
      perHour: water.perHour,
      elapsedSeconds: clamp(elapsedSeconds, 0, 5),
      utilizationFactor,
      floor: 0.5,
      limit: water.budgetTon,
    });

    const powerKw = power.baseKw + power.loadKw * utilizationFactor;
    const powerRate = (powerKw / power.contractKw) * 100;
    const waterRate = (consumedTon / water.budgetTon) * 100;
    const pressureBar =
      air.normalBar - air.dropBar * utilizationFactor;

    return [
      createUtilizationCard(utilization),

      {
        id: "power",
        label: "수전 전력",
        unit: "kW",
        valueText: formatNumber(powerKw),
        description:
          `계약 ${formatNumber(power.contractKw)} kW · ` +
          `사용률 ${powerRate.toFixed(1)}%`,
        progress: clamp(powerRate, 0, 100),
        level: powerRate >= 90 ? "warning" : "normal",
      },

      {
        id: "water",
        label: "공정용수 사용량",
        unit: "t",
        valueText: formatNumber(consumedTon, 1),
        description:
          `예산 ${waterRate.toFixed(1)}% · ` +
          `목표 ${formatNumber(water.budgetTon)} t 이하`,
        progress: clamp(waterRate, 0, 100),
        level: waterRate >= 90 ? "warning" : "normal",
      },

      {
        id: "air",
        label: "압축공기 압력",
        unit: "bar",
        valueText: pressureBar.toFixed(1),
        description:
          `기준 ${air.minimumBar.toFixed(1)} bar 이상 · ` +
          `여유 ${(pressureBar - air.minimumBar).toFixed(1)} bar`,
        progress: clamp(
          ((pressureBar - air.minimumBar) /
            (air.normalBar - air.minimumBar)) *
            100,
          0,
          100,
        ),
        level:
          pressureBar >= air.minimumBar ? "good" : "warning",
      },
    ];
  }

  return {
    caption: "연속 운전",
    update,

    reset() {
      consumedTon = water.consumedTon;
    },
  };
}


/*
 * 물류·출하 센터: 가동률 · 입출고 처리 · 도크 점유 · 구내 운행
 *
 * 도크와 트럭은 누적값이 아니라 운행 컨트롤러의 실시간 집계를 쓴다.
 */
const LOGISTICS_BASE = Object.freeze({
  previousUtilizationRate: 22.0,

  shipment: Object.freeze({
    completed: 128,
    target: 210,
    perHour: 34,
  }),
});

function createLogisticsTracker() {
  const { shipment } = LOGISTICS_BASE;

  let completed = shipment.completed;

  function update({
    elapsedSeconds = 0,
    statusCounts = {},
    logistics = {},
  } = {}) {
    const utilization = createUtilizationSnapshot(
      statusCounts,
      LOGISTICS_BASE.previousUtilizationRate,
    );

    const utilizationFactor = utilization.progress / 100;

    completed = accumulate({
      current: completed,
      perHour: shipment.perHour,
      elapsedSeconds: clamp(elapsedSeconds, 0, 5),
      utilizationFactor,
      limit: shipment.target,
    });

    const shipmentRate = (completed / shipment.target) * 100;
    const totalDocks = Math.max(logistics.totalDocks ?? 0, 0);
    const occupiedDocks = Math.max(logistics.occupiedDocks ?? 0, 0);
    const dockRate = totalDocks > 0
      ? (occupiedDocks / totalDocks) * 100
      : 0;

    const totalTrucks = Math.max(logistics.totalTrucks ?? 0, 0);
    const movingTrucks = Math.max(logistics.movingTrucks ?? 0, 0);
    const handlingTrucks = Math.max(
      logistics.handlingTrucks ?? 0,
      0,
    );
    const standbyTrucks = Math.max(
      totalTrucks - movingTrucks - handlingTrucks,
      0,
    );

    return [
      createUtilizationCard(utilization),

      {
        id: "shipment",
        label: "입출고 처리",
        unit: "건",
        valueText: formatNumber(Math.floor(completed)),
        description:
          `계획 ${shipmentRate.toFixed(1)}% · ` +
          `목표 ${formatNumber(shipment.target)}건`,
        progress: clamp(shipmentRate, 0, 100),
        level: "normal",
      },

      {
        id: "dock",
        label: "도크 점유율",
        unit: "%",
        valueText: formatNumber(dockRate, 1),
        description:
          `사용 ${occupiedDocks} / ${totalDocks} · ` +
          `상·하차 ${handlingTrucks}대`,
        progress: clamp(dockRate, 0, 100),
        level: "normal",
      },

      {
        id: "truck",
        label: "구내 운행 트럭",
        unit: "대",
        valueText: String(movingTrucks),
        description:
          `전체 ${totalTrucks}대 · 대기 ${standbyTrucks}대`,
        progress: totalTrucks > 0
          ? clamp((movingTrucks / totalTrucks) * 100, 0, 100)
          : 0,
        level: "normal",
      },
    ];
  }

  return {
    caption: "실시간",
    update,

    reset() {
      completed = shipment.completed;
    },
  };
}


const TRACKER_FACTORIES = Object.freeze({
  "factory-a": () => createProductionTracker("factory-a"),
  "factory-b": () => createProductionTracker("factory-b"),
  utility: createUtilityTracker,
  logistics: createLogisticsTracker,
});

export function hasFacilityKpi(facilityId) {
  return facilityId in TRACKER_FACTORIES;
}

/*
 * 건물 하나의 KPI 트래커를 만든다.
 * update()는 카드 4장을 같은 모양으로 돌려주므로
 * 대시보드는 건물 종류를 몰라도 그대로 그릴 수 있다.
 */
export function createFacilityKpiTracker(facilityId) {
  const createTracker = TRACKER_FACTORIES[facilityId];

  if (!createTracker) {
    throw new Error(
      `KPI 구성이 없는 건물입니다: ${facilityId}`,
    );
  }

  const tracker = createTracker();

  return {
    caption: tracker.caption,

    update(context) {
      return tracker.update(context).map((card, index) => ({
        ...card,
        tone: CARD_TONES[index] ?? "primary",
      }));
    },

    reset: tracker.reset,
  };
}
