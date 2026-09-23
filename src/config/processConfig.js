/*
 * 배터리 시스템 생산 공정 흐름.
 *
 * 영천공장은 외부 조달한 각형 셀을 받아 모듈을 만들고,
 * 그 모듈로 완성 팩까지 조립·시험해 출하한다.
 * 공정 순서가 그대로 건물 배치와 물류 동선이 되므로,
 * 화면에 나가는 공정 이름과 순서는 모두 이 파일을 따른다.
 *
 *   모듈 조립동(MA-01)               팩 조립동(PA-01)
 *   셀검사 → 스태킹 → 용접 → 모듈EOL  →  트레이 → 모듈장착 → 실링 → 팩EOL
 *        ↑ 유틸리티 플랜트(UT-01) 공급        ↓ 물류센터(LG-01) 출하
 */

/*
 * 공정 단계.
 *
 * facilityId 는 3D 건물 식별자와 같다.
 * 건물 식별자 자체는 모델 파일과 묶여 있어 바꾸지 않고,
 * 표시 이름만 공정에 맞춘다.
 */
export const PROCESS_STEPS = Object.freeze([
  Object.freeze({
    id: "cell-inspection",
    order: 1,
    facilityId: "factory-a",
    name: "셀 수입검사",
    description:
      "입고한 각형 셀의 개방전압과 내부저항을 측정하고 외관·치수를 비전으로 선별한다.",
    output: "합격 셀",
  }),
  Object.freeze({
    id: "stacking",
    order: 2,
    facilityId: "factory-a",
    name: "셀 스태킹",
    description:
      "셀과 절연 필름을 번갈아 적층하고 규정 압력으로 가압해 셀 스택을 만든다.",
    output: "셀 스택",
  }),
  Object.freeze({
    id: "laser-welding",
    order: 3,
    facilityId: "factory-a",
    name: "버스바 레이저 용접",
    description:
      "셀 탭과 버스바를 레이저로 용접해 직병렬 회로를 잇고 용접부를 비전으로 검사한다.",
    output: "결선 완료 스택",
  }),
  Object.freeze({
    id: "module-eol",
    order: 4,
    facilityId: "factory-a",
    name: "모듈 EOL 검사",
    description:
      "엔드플레이트를 체결한 뒤 절연내압과 충방전 용량, 온도센서 도통을 검사한다.",
    output: "합격 모듈",
  }),
  Object.freeze({
    id: "tray-cooling",
    order: 5,
    facilityId: "factory-b",
    name: "트레이·쿨링플레이트",
    description:
      "팩 트레이를 세정·검사하고 쿨링플레이트를 얹은 뒤 열전도 접착제를 도포한다.",
    output: "냉각 조립 트레이",
  }),
  Object.freeze({
    id: "module-mounting",
    order: 6,
    facilityId: "factory-b",
    name: "모듈 장착·결선",
    description:
      "로봇으로 모듈을 트레이에 안착하고 고전압 버스바와 하네스, BMS·BDU를 체결한다.",
    output: "결선 완료 팩",
  }),
  Object.freeze({
    id: "sealing-leak",
    order: 7,
    facilityId: "factory-b",
    name: "실링·기밀검사",
    description:
      "커버 실런트를 도포해 볼팅하고 냉각수를 진공 주입한 뒤 기밀 누설을 검사한다.",
    output: "밀폐 완료 팩",
  }),
  Object.freeze({
    id: "pack-eol",
    order: 8,
    facilityId: "factory-b",
    name: "팩 EOL 시험",
    description:
      "절연과 고전압 안전, 충방전과 CAN 통신을 시험하고 출하 SOC로 조정해 각인한다.",
    output: "합격 완성 팩",
  }),
]);

const stepById = new Map(
  PROCESS_STEPS.map((step) => [step.id, step]),
);

export function getProcessStep(stepId) {
  return stepById.get(stepId) ?? null;
}

export function getProcessSteps(facilityId) {
  return PROCESS_STEPS.filter(
    (step) => step.facilityId === facilityId,
  );
}

/*
 * 건물 하나가 담당하는 공정 구간을 "셀 수입검사 → 모듈 EOL 검사" 처럼 요약한다.
 * 시점 메뉴와 관제 패널의 부제로 쓴다.
 */
export function describeProcessRange(facilityId) {
  const steps = getProcessSteps(facilityId);

  if (steps.length === 0) {
    return "";
  }

  if (steps.length === 1) {
    return steps[0].name;
  }

  return `${steps[0].name} → ${steps[steps.length - 1].name}`;
}
