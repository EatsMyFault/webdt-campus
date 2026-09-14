export const FACTORY_A = Object.freeze({
  id: "factory-a",
  name: "정밀가공 생산 A동",
  code: "A-01",
  position: [-300, 0.08, -220],
  rotationY: 0,
  shellScaleXZ: 2.8,
  shellScaleY: 2,
  footprint: [453.6, 285.6],
});

export const FACTORY_B = Object.freeze({
  id: "factory-b",
  name: "스마트 조립 생산 B동",
  code: "B-01",
  position: [300, 0.08, -220],
  rotationY: 0,
  shellScaleXZ: 2.75,
  shellScaleY: 2,
  footprint: [462, 286],
});

export const UTILITY_CENTER = Object.freeze({
  id: "utility-center",
  name: "통합 유틸리티 센터",
  code: "UT-01",
  position: [-300, 0.08, 220],
  rotationY: 0,
  shellScaleXZ: 2.2,
  shellScaleY: 1.8,
  footprint: [500, 280],
});

export const LOGISTICS_CENTER = Object.freeze({
  id: "logistics-center",
  name: "스마트 물류·출하 센터",
  code: "LG-01",
  position: [300, 0.08, 195],
  rotationY: 0,
  footprint: [480, 300],
});
