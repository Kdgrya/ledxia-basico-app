// Denominaciones del peso dominicano para el contador de efectivo, de mayor a menor.
export const DENOMINATIONS = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1] as const;

// A partir de este valor las denominaciones son billetes (el resto, monedas).
export const BILL_THRESHOLD = 50;

export type CashBreakdown = Record<string, number>;

// Suma un desglose ({ "2000": 3, ... }) a un total en efectivo.
export function sumBreakdown(b: CashBreakdown | null | undefined): number {
  if (!b) return 0;
  return Object.entries(b).reduce(
    (sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0),
    0,
  );
}

// Total de billetes + monedas contados.
export function countPieces(b: CashBreakdown | null | undefined): number {
  if (!b) return 0;
  return Object.values(b).reduce((sum, count) => sum + (Number(count) || 0), 0);
}
