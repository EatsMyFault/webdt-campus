/*
 * 화면 상단 중앙의 현재 날짜 및 시간 표시
 * 렌더 루프에서 매 프레임 호출되지만 초가 바뀔 때만 DOM을 건드린다.
 */
const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function createCampusClock({
  dateElement,
  timeElement,
}) {
  if (!dateElement || !timeElement) {
    throw new Error("시계를 표시할 요소가 필요합니다.");
  }

  let shownSecond = null;

  function update() {
    const now = new Date();
    const second = Math.floor(now.getTime() / 1000);

    if (second === shownSecond) {
      return;
    }

    shownSecond = second;
    dateElement.textContent = DATE_FORMAT.format(now);
    timeElement.textContent = TIME_FORMAT.format(now);
  }

  update();

  return { update };
}
