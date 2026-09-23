import { MODULE_ASSEMBLY_EQUIPMENT } from "./moduleAssemblyEquipmentData.js";
import { PACK_ASSEMBLY_EQUIPMENT } from "./packAssemblyEquipmentData.js";
import { UTILITY_EQUIPMENT } from "./utilityEquipmentData.js";
import { LOGISTICS_EQUIPMENT } from "./logisticsEquipmentData.js";

export const EQUIPMENT_DATA = [
  ...MODULE_ASSEMBLY_EQUIPMENT,
  ...PACK_ASSEMBLY_EQUIPMENT,
  ...UTILITY_EQUIPMENT,
  ...LOGISTICS_EQUIPMENT,
];

const equipmentById = new Map();

EQUIPMENT_DATA.forEach((equipment) => {
  if (equipmentById.has(equipment.id)) {
    throw new Error(`중복된 설비 ID입니다: ${equipment.id}`);
  }

  equipmentById.set(equipment.id, equipment);
});

export function getEquipmentById(equipmentId) {
  return equipmentById.get(equipmentId) ?? null;
}

export function getEquipmentByFacility(facilityId) {
  return EQUIPMENT_DATA.filter(
    (equipment) => equipment.facilityId === facilityId,
  );
}
