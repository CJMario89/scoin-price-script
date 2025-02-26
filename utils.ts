export const formatNumber = ({
  number,
  decimals,
}: {
  number: number;
  decimals: number;
}) => {
  return number / Math.pow(10, decimals);
};

export const parseNumber = ({
  number,
  decimals,
}: {
  number: number;
  decimals: number;
}) => {
  return number * Math.pow(10, decimals);
};

export const getSCoinPrice = ({
  price,
  conversionRate,
}: {
  price: number;
  conversionRate: number;
}) => {
  return price * conversionRate;
};

export function normalizeSymbol(text: string) {
  return "s" + text;
}
