const VALID_STATES = new Set([
  "idle",
  "playing",
  "paused",
  "completed",
]);

export function createScenarioEngine({
  store,
  scenario,
  onStep,
  onReset,
}) {
  if (!scenario?.steps?.length) {
    throw new Error("시나리오 단계가 필요합니다.");
  }

  const steps = [...scenario.steps].sort((a, b) => a.at - b.at);
  const duration = scenario.duration ?? steps.at(-1).at;

  let state = "idle";
  let elapsed = 0;
  let nextStepIndex = 0;
  let stage = "시나리오 준비";
  let events = [];

  function setState(nextState) {
    if (!VALID_STATES.has(nextState)) {
      throw new Error(`잘못된 시나리오 상태입니다: ${nextState}`);
    }

    state = nextState;
  }

  function addEvent(step) {
    if (!step.message) return;

    events = [
      ...events,
      {
        id: `${scenario.id}-${nextStepIndex}-${step.at}`,
        at: step.at,
        tone: step.tone ?? "info",
        message: step.message,
      },
    ];
  }

  function runStep(step) {
    step.apply?.({
      store,
      scenario,
      elapsed,
    });

    stage = step.stage ?? stage;
    addEvent(step);
    onStep?.({ step, scenario, elapsed });
  }

  function runDueSteps() {
    while (
      nextStepIndex < steps.length &&
      steps[nextStepIndex].at <= elapsed
    ) {
      const step = steps[nextStepIndex];
      nextStepIndex += 1;
      runStep(step);
    }
  }

  function play() {
    if (state === "completed") {
      reset();
    }

    if (state === "playing") return;

    setState("playing");
    runDueSteps();
  }

  function pause() {
    if (state === "playing") {
      setState("paused");
    }
  }

  function reset() {
    elapsed = 0;
    nextStepIndex = 0;
    stage = "시나리오 준비";
    events = [];
    setState("idle");

    if (scenario.targetEquipmentId) {
      store.resetEquipment(scenario.targetEquipmentId);
    }

    onReset?.({ scenario });
  }

  function update(deltaSeconds) {
    if (state !== "playing" || deltaSeconds <= 0) return;

    elapsed = Math.min(duration, elapsed + deltaSeconds);
    runDueSteps();

    if (elapsed >= duration) {
      setState("completed");
    }
  }

  function getState() {
    return {
      id: scenario.id,
      title: scenario.title,
      targetEquipmentId: scenario.targetEquipmentId,
      state,
      stage,
      elapsed,
      duration,
      progress: duration > 0 ? elapsed / duration : 0,
      events: [...events],
    };
  }

  return {
    play,
    pause,
    reset,
    update,
    getState,
  };
}
