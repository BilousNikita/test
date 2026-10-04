import type { SupplierOrder } from "@prisma/client";
import { env } from "../env";
import {
  SupplierNotConfiguredError,
  type ImportedProduct,
  type SupplierAdapter,
  type TrackingInfo,
} from "./types";

/**
 * CJ Dropshipping adapter – STUB, ready to be completed with real API keys.
 *
 * How to enable:
 *  1. Create a CJ account → Developer → API → get your API key (and the account email).
 *  2. Set in .env:  SUPPLIER_ADAPTER=cj  CJ_API_KEY=...  CJ_API_EMAIL=...
 *     Optionally SUPPLIER_AUTO_PLACE=true to forward paid orders automatically.
 *  3. Fill in the TODO blocks below. Official docs: https://developers.cjdropshipping.com/
 *     (endpoints below are from API v2 – verify names/fields against the current docs):
 *       POST /api2.0/v1/authentication/getAccessToken   { email, password: apiKey } -> accessToken
 *       GET  /api2.0/v1/product/list?productNameEn=...  header CJ-Access-Token
 *       POST /api2.0/v1/shopping/order/createOrderV2    order + products [{ vid, quantity }]
 *       GET  /api2.0/v1/logistic/trackInfo?trackNumber=...
 *  4. Map CJ variant ids ("vid") to our Variant.supplierSku (CSV column variant_supplier_sku).
 */
const BASE = "https://developers.cjdropshipping.com/api2.0/v1";

let token: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  const { CJ_API_KEY, CJ_API_EMAIL } = env();
  if (!CJ_API_KEY || !CJ_API_EMAIL) throw new SupplierNotConfiguredError("CJ_API_KEY / CJ_API_EMAIL not set");
  if (token && token.expires > Date.now()) return token.value;
  const res = await fetch(`${BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_API_EMAIL, password: CJ_API_KEY }),
  });
  const json = (await res.json()) as { result?: boolean; data?: { accessToken: string }; message?: string };
  if (!json.result || !json.data) throw new Error(`CJ auth failed: ${json.message ?? res.status}`);
  token = { value: json.data.accessToken, expires: Date.now() + 1000 * 60 * 60 * 24 * 7 };
  return token.value;
}

export const cjAdapter: SupplierAdapter = {
  id: "cj",
  label: "CJ Dropshipping",
  autoPlaceEnabled: () => env().SUPPLIER_AUTO_PLACE && !!env().CJ_API_KEY,

  async fetchProducts({ query, page = 1 }): Promise<ImportedProduct[]> {
    const t = await accessToken();
    const res = await fetch(
      `${BASE}/product/list?pageNum=${page}&pageSize=20${query ? `&productNameEn=${encodeURIComponent(query)}` : ""}`,
      { headers: { "CJ-Access-Token": t } },
    );
    if (!res.ok) throw new Error(`CJ product list failed (${res.status})`);
    // TODO: map json.data.list[] -> ImportedProduct (name, sellPrice -> supplierCost, productImage, variants…)
    return [];
  },

  async placeOrder(order: SupplierOrder) {
    await accessToken();
    const shipping = JSON.parse(order.shippingSnapshot);
    const items = JSON.parse(order.itemsSnapshot) as { supplierSku: string; quantity: number }[];
    // TODO: POST `${BASE}/shopping/order/createOrderV2` with
    //   { orderNumber: order.id, shippingCountryCode: shipping.country, shippingCustomerName: shipping.name,
    //     shippingAddress: shipping.line1, shippingCity: shipping.city, shippingZip: shipping.postalCode,
    //     shippingPhone: shipping.phone, logisticName: "<your CJ logistic>",
    //     products: items.map(i => ({ vid: i.supplierSku, quantity: i.quantity })) }
    void shipping;
    void items;
    throw new SupplierNotConfiguredError("CJ placeOrder is not implemented yet – see cj-dropshipping.ts");
  },

  async getTracking(_ref: string): Promise<TrackingInfo | null> {
    // TODO: GET `${BASE}/logistic/trackInfo?trackNumber=...` and map to TrackingInfo
    return null;
  },
};
