export {
  calculateSurchargePiastres as calculateSurcharge,
  type SurchargeConfig,
} from "@lavanda/shared/pos";

export function formatEGP(piastres: number): string {
  return `${(piastres / 100).toFixed(2)} EGP`;
}
