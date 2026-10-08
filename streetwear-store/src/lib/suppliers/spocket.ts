import { env } from "../env";
import { SupplierNotConfiguredError, type SupplierAdapter } from "./types";

/**
 * Spocket adapter – STUB.
 * Spocket does not offer a fully public REST API for every account; access is usually granted
 * via their partner program (contact Spocket support for API credentials and docs).
 *
 * To enable once you have credentials:
 *  1. Set SUPPLIER_ADAPTER=spocket and SPOCKET_API_KEY=... in .env
 *  2. Implement fetchProducts() → map Spocket products to ImportedProduct (see types.ts)
 *  3. Implement placeOrder() → create the order at Spocket, return its id as supplierOrderRef
 *  4. Optionally implement getTracking()
 * Until then use the CSV adapter: export products from Spocket and import them in Admin → Import/Export.
 */
export const spocketAdapter: SupplierAdapter = {
  id: "spocket",
  label: "Spocket",
  autoPlaceEnabled: () => env().SUPPLIER_AUTO_PLACE && !!env().SPOCKET_API_KEY,
  async fetchProducts() {
    throw new SupplierNotConfiguredError("Spocket adapter not implemented – see spocket.ts");
  },
  async placeOrder() {
    throw new SupplierNotConfiguredError("Spocket adapter not implemented – see spocket.ts");
  },
};
