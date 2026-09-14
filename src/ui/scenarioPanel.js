const STATE_VIEW = Object.freeze({
  idle: {
    label: "대기",
    action: "시나리오 재생",
  },
  playing: {
    label: "재생 중",
    action: "재생 중",
  },
  paused: {
    label: "일시정지",
    action: "계속 재생",
  },
  completed: {
    label: "완료",
    action: "다시 재생",
  },
});

function formatSeconds(value) {
  return `00:${String(Math.floor(value)).padStart(2, "0")}`;
}

function createEventItem(event) {
  const item = document.createElement("li");
  const time = document.createElement("time");
  const message = document.createElement("span");

  item.dataset.tone = event.tone;
  time.textContent = `+${String(event.at).padStart(2, "0")}초`;
  message.textContent = event.message;
  item.append(time, message);

  return item;
}

export function createScenarioPanel({ root, engine }) {
  if (!root) {
    throw new Error("시나리오 패널 요소를 찾을 수 없습니다.");
  }

  const stateBadge = root.querySelector("#scenario-state");
  const stageLabel = root.querySelector("#scenario-stage");
  const timeLabel = root.querySelector("#scenario-time");
  const progress = root.querySelector(".scenario-progress");
  const progressFill = root.querySelector("#scenario-progress-fill");
  const eventList = root.querySelector("#scenario-event-list");
  const playButton = root.querySelector('[data-scenario-action="play"]');
  const pauseButton = root.querySelector('[data-scenario-action="pause"]');
  const resetButton = root.querySelector('[data-scenario-action="reset"]');

  let renderedEventKey = "";

  function handlePlay() {
    engine.play();
  }

  function handlePause() {
    engine.pause();
  }

  function handleReset() {
    engine.reset();
  }

  function renderEvents(events) {
    const visibleEvents = [...events].reverse().slice(0, 4);
    const eventKey = visibleEvents.map((event) => event.id).join("|");

    if (eventKey === renderedEventKey) return;

    renderedEventKey = eventKey;

    if (!visibleEvents.length) {
      const empty = document.createElement("li");
      empty.className = "scenario-event-empty";
      empty.textContent = "재생하면 설비 상태 변화가 기록됩니다.";
      eventList.replaceChildren(empty);
      return;
    }

    eventList.replaceChildren(...visibleEvents.map(createEventItem));
  }

  function update() {
    const scenario = engine.getState();
    const view = STATE_VIEW[scenario.state];

    root.dataset.state = scenario.state;
    stateBadge.textContent = view.label;
    stageLabel.textContent = scenario.stage;
    timeLabel.textContent = `${formatSeconds(scenario.elapsed)} / ${formatSeconds(scenario.duration)}`;
    progressFill.style.width = `${Math.round(scenario.progress * 100)}%`;
    progress.setAttribute(
      "aria-valuenow",
      String(Math.round(scenario.progress * 100)),
    );
    playButton.textContent = view.action;
    playButton.disabled = scenario.state === "playing";
    pauseButton.disabled = scenario.state !== "playing";
    resetButton.disabled = scenario.state === "idle" && scenario.elapsed === 0;

    renderEvents(scenario.events);
  }

  playButton.addEventListener("click", handlePlay);
  pauseButton.addEventListener("click", handlePause);
  resetButton.addEventListener("click", handleReset);
  update();

  return {
    update,

    destroy() {
      playButton.removeEventListener("click", handlePlay);
      pauseButton.removeEventListener("click", handlePause);
      resetButton.removeEventListener("click", handleReset);
    },
  };
}
