/*
 * 단지 운영 KPI의 데모 원천 데이터.
 *
 * 실제 서버를 연결할 때는 이 객체 대신 API 응답을 같은 모양으로
 * 전달하면 UI 코드를 수정하지 않고 사용할 수 있다.
 */
export const SITE_KPI_BASE = Object.freeze({
  previousUtilizationRate: 68.7,

  production: Object.freeze({
    completed: 2864,
    target: 4200,
    throughputPerHour: 410,
  }),

  quality: Object.freeze({
    inspected: 2864,
    defects: 39,
    liveDefectRate: 1.36,
    targetRate: 1.5,
  }),

  energy: Object.freeze({
    consumedKwh: 6842.4,
    budgetKwh: 9200,
    currentPowerKw: 735,
  }),
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits = 1) {
  return Number(value.toFixed(digits));
}

export function createSiteKpiTracker(
  base = SITE_KPI_BASE,
) {
  let completed = base.production.completed;
  let inspected = base.quality.inspected;
  let defects = base.quality.defects;
  let consumedKwh = base.energy.consumedKwh;

  function createSnapshot(statusCounts = {}) {
    const running = Math.max(statusCounts.running ?? 0, 0);
    const warning = Math.max(statusCounts.warning ?? 0, 0);
    const idle = Math.max(statusCounts.idle ?? 0, 0);
    const stopped = Math.max(statusCounts.stopped ?? 0, 0);
    const total = running + warning + idle + stopped;
    const operating = running + warning;
    const utilizationRate = total > 0
      ? (operating / total) * 100
      : 0;
    const productionRate = base.production.target > 0
      ? (completed / base.production.target) * 100
      : 0;
    const defectRate = inspected > 0
      ? (defects / inspected) * 100
      : 0;
    const energyRate = base.energy.budgetKwh > 0
      ? (consumedKwh / base.energy.budgetKwh) * 100
      : 0;

    return {
      utilization: {
        value: round(utilizationRate),
        change: round(
          utilizationRate - base.previousUtilizationRate,
        ),
        operating,
        total,
        progress: clamp(utilizationRate, 0, 100),
      },

      production: {
        value: Math.floor(completed),
        target: base.production.target,
        rate: round(productionRate),
        progress: clamp(productionRate, 0, 100),
      },

      defect: {
        value: round(defectRate, 2),
        count: Math.round(defects),
        inspected: Math.floor(inspected),
        targetRate: base.quality.targetRate,
        progress: clamp(
          (defectRate / base.quality.targetRate) * 100,
          0,
          100,
        ),
      },

      energy: {
        value: round(consumedKwh),
        budget: base.energy.budgetKwh,
        rate: round(energyRate),
        currentPower: base.energy.currentPowerKw,
        progress: clamp(energyRate, 0, 100),
      },
    };
  }

  function update(elapsedSeconds = 0, statusCounts = {}) {
    const safeElapsedSeconds = clamp(elapsedSeconds, 0, 5);
    const snapshot = createSnapshot(statusCounts);
    const utilizationFactor = snapshot.utilization.progress / 100;
    const productionGain =
      (base.production.throughputPerHour / 3600) *
      safeElapsedSeconds *
      utilizationFactor;
    const availableProduction = Math.max(
      base.production.target - completed,
      0,
    );
    const appliedProductionGain = Math.min(
      productionGain,
      availableProduction,
    );

    completed += appliedProductionGain;
    inspected += appliedProductionGain;
    defects +=
      appliedProductionGain *
      (base.quality.liveDefectRate / 100);

    /*
     * 유휴 상태에서도 조명·공조 등 기본 전력을 사용한다고 보고
     * 55%를 기저 부하, 나머지를 가동률 연동 부하로 계산한다.
     */
    const powerFactor = 0.55 + utilizationFactor * 0.45;

    consumedKwh +=
      (base.energy.currentPowerKw / 3600) *
      safeElapsedSeconds *
      powerFactor;

    return createSnapshot(statusCounts);
  }

  function reset() {
    completed = base.production.completed;
    inspected = base.quality.inspected;
    defects = base.quality.defects;
    consumedKwh = base.energy.consumedKwh;
  }

  return {
    update,
    createSnapshot,
    reset,
  };
}
