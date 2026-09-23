/*
 * 건물 정의.
 *
 * id 는 3D 모델 파일과 시점 설정이 함께 쓰는 식별자라 고정이다.
 * 공정 개편으로 바뀌는 것은 표시 이름과 건물 코드다.
 *
 *   MA-01 모듈 조립동   셀검사 → 스태킹 → 버스바 용접 → 모듈 EOL
 *   PA-01 팩 조립동     트레이·쿨링 → 모듈 장착 → 실링·기밀 → 팩 EOL
 *   UT-01 유틸리티 플랜트
 *   LG-01 자재·출하 물류센터
 *   HQ-01 영천공장 운영동
 */
export const FACTORY_A = Object.freeze({
  id: "factory-a",
  name: "모듈 조립동",
  code: "MA-01",
  position: [-300, 0.08, -220],
  rotationY: 0,
  shellScaleXZ: 2.8,
  shellScaleY: 2,
  footprint: [453.6, 285.6],
});

export const FACTORY_B = Object.freeze({
  id: "factory-b",
  name: "팩 조립동",
  code: "PA-01",
  position: [300, 0.08, -220],
  rotationY: 0,
  shellScaleXZ: 2.75,
  shellScaleY: 2,
  footprint: [462, 286],
});

export const UTILITY_CENTER = Object.freeze({
  id: "utility-center",
  name: "유틸리티 플랜트",
  code: "UT-01",
  position: [-300, 0.08, 220],
  rotationY: 0,
  shellScaleXZ: 2.2,
  shellScaleY: 1.8,
  footprint: [500, 280],
});

export const LOGISTICS_CENTER = Object.freeze({
  id: "logistics-center",
  name: "자재·출하 물류센터",
  code: "LG-01",
  position: [300, 0.08, 195],
  rotationY: 0,
  footprint: [480, 300],
});

export const CAMPUS_OFFICE = Object.freeze({
  id: "campus-office",
  name: "영천공장 운영동",
  code: "HQ-01",
  position: [260, 0.08, -485],
  rotationY: 0,
  footprint: [300, 120],
  towerFloors: 14,
  floorHeight: 8,
  podiumHeight: 18,
});
