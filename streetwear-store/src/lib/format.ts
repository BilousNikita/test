import { formatMoney } from "./money";
import { getSettings } from "./settings";

/** Server-side money formatter bound to the current store currency/locale. */
export async function getMoney() {
  const s = await getSettings();
  return (minor: number) => formatMoney(minor, s.currency, s.locale);
}
