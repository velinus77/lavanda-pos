export interface SurchargeConfig {
  enabled: boolean;
  percent: number;
  flat: number;
  roundTo: number;
}

function moneyToPiastres(value: number): number {
  return Math.round(value * 100);
}

function roundPiastresToStep(valuePiastres: number, stepPiastres: number): number {
  if (stepPiastres <= 0) return valuePiastres;
  return Math.round(valuePiastres / stepPiastres) * stepPiastres;
}

export function calculateSurcharge(totalPiastres: number, config: SurchargeConfig): number {
  if (!config.enabled || totalPiastres <= 0) return 0;

  const percentPiastres = Math.round((totalPiastres * (config.percent * 100)) / 10000);
  const flatPiastres = moneyToPiastres(config.flat);
  const roundToPiastres = moneyToPiastres(config.roundTo);

  return roundPiastresToStep(percentPiastres + flatPiastres, roundToPiastres);
}

export function formatEGP(piastres: number): string {
  return `${(piastres / 100).toFixed(2)} EGP`;
}
