import { env } from "../env";
import { cjAdapter } from "./cj-dropshipping";
import { csvAdapter } from "./csv";
import { spocketAdapter } from "./spocket";
import type { SupplierAdapter } from "./types";

const adapters: Record<string, SupplierAdapter> = {
  csv: csvAdapter,
  cj: cjAdapter,
  spocket: spocketAdapter,
};

/** Active adapter, chosen by SUPPLIER_ADAPTER (csv | cj | spocket). */
export function getSupplierAdapter(): SupplierAdapter {
  return adapters[env().SUPPLIER_ADAPTER] ?? csvAdapter;
}

export { csvAdapter, cjAdapter, spocketAdapter };
export type { SupplierAdapter, ImportedProduct, ImportedVariant } from "./types";
