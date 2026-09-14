import test from "node:test";
import assert from "node:assert/strict";

import {
  SITE,
  SITE_ZONES,
} from "../src/config/siteConfig.js";
import {
  CAMPUS_OFFICE,
} from "../src/config/buildingConfig.js";
import {
  SITE_VIEWPOINTS,
} from "../src/config/viewpointConfig.js";

test("확장된 부지 안에 통합운영 사무동이 배치된다", () => {
  const [x, , z] = CAMPUS_OFFICE.position;
  const [width, depth] = CAMPUS_OFFICE.footprint;
  const perimeterInset = SITE.roadWidth / 2 + 16;

  /*
   * 부지 사각형은 원점이 아니라 centerZ 를 중심으로 놓인다.
   */
  const siteNorthEdge = SITE.centerZ - SITE.depth / 2;
  const siteSouthEdge = SITE.centerZ + SITE.depth / 2;
  const northRoadCenter =
    SITE.centerZ - (SITE.depth / 2 - perimeterInset);
  const northRoadSouthEdge =
    northRoadCenter + SITE.roadWidth / 2;
  const officeNorthEdge = z - depth / 2;

  assert.ok(
    Math.abs(x) + width / 2 < SITE.width / 2,
  );
  assert.ok(officeNorthEdge > siteNorthEdge);
  assert.ok(z + depth / 2 < siteSouthEdge);
  assert.ok(officeNorthEdge > northRoadSouthEdge);
  assert.ok(SITE.depth > 900);
});

test("사무동 구역과 숫자키 5 시점이 등록된다", () => {
  const officeZone = SITE_ZONES.find(
    (zone) => zone.id === "office",
  );
  const officeView = SITE_VIEWPOINTS.find(
    (viewpoint) => viewpoint.id === "office",
  );

  assert.ok(officeZone);
  assert.equal(officeView?.shortcut, "5");
  assert.equal(CAMPUS_OFFICE.towerFloors, 14);
});
