/*
 * 사업장 정체성 단일 소스.
 *
 * 화면에 나가는 회사·사업장 이름은 모두 여기서 가져온다.
 * 실제 사업장 자료를 반영할 때 이 파일만 고치면
 * 타이틀, 관제 패널 머리말, 라벨이 함께 따라간다.
 *
 * 설비 수치와 생산 실적은 전부 데모용 더미 데이터다.
 */
export const COMPANY = Object.freeze({
  name: "카펙발레오",
  nameEn: "KAPEC Valeo",
  site: "영천공장",
  siteEn: "Yeongcheon Plant",
  siteCode: "YC",

  /* 브라우저 타이틀과 메타 설명 */
  documentTitle: "카펙발레오 영천공장 디지털 트윈",
  documentDescription:
    "카펙발레오 영천공장의 전기차 배터리 시스템 생산 공정을 담은 디지털 트윈",

  /* 관제 화면 머리말 */
  headline: "영천공장 통합 관제",
  subheadline: "배터리 시스템 생산 디지털 트윈",
});

/*
 * 영천공장이 맡는 제품군.
 *
 * 셀은 외부에서 조달한 각형(prismatic) 셀을 쓰고,
 * 공장은 모듈 조립부터 팩 완성까지를 담당한다.
 * 설비 데이터의 제품 코드와 작업지시 번호가 이 목록을 따른다.
 */
export const PRODUCT_LINES = Object.freeze([
  Object.freeze({
    id: "pack-400-60",
    code: "BP-400-60",
    name: "400V급 60kWh 배터리 팩",
    shortName: "400V 60kWh 팩",
    voltageClass: 400,
    capacityKwh: 60,
    moduleCount: 8,
  }),
  Object.freeze({
    id: "pack-800-95",
    code: "BP-800-95",
    name: "800V급 95kWh 배터리 팩",
    shortName: "800V 95kWh 팩",
    voltageClass: 800,
    capacityKwh: 95,
    moduleCount: 12,
  }),
  Object.freeze({
    id: "pack-phev-18",
    code: "BP-PHEV-18",
    name: "PHEV용 18kWh 배터리 팩",
    shortName: "PHEV 18kWh 팩",
    voltageClass: 350,
    capacityKwh: 18,
    moduleCount: 3,
  }),
  Object.freeze({
    id: "module-p12",
    code: "BM-P12",
    name: "각형 12셀 배터리 모듈",
    shortName: "12셀 모듈",
    voltageClass: 44,
    capacityKwh: 7.9,
    moduleCount: 1,
  }),
]);

const productByCode = new Map(
  PRODUCT_LINES.map((product) => [product.code, product]),
);

export function getProductByCode(code) {
  return productByCode.get(code) ?? null;
}
