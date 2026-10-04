"use client";

import Image from "next/image";
import { useState } from "react";
import { saveProductAction } from "@/lib/admin/product-actions";
import { SubmitButton } from "./SubmitButton";
import { PendingContext, useFormAction } from "./useFormAction";
import { Card, Field } from "./ui";

export interface ProductFormData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  details: string;
  status: string;
  featured: boolean;
  tags: string;
  categoryId: string;
  collectionIds: string[];
  supplierName: string;
  supplierSku: string;
  supplierUrl: string;
  supplierCost: string; // major units
  retailPrice: string;
  compareAtPrice: string;
  priceOverride: boolean;
  variants: {
    id?: string;
    sku: string;
    size: string;
    color: string;
    colorHex: string;
    stock: number;
    supplierSku: string;
  }[];
  images: { id: string; url: string; alt: string; color: string | null }[];
}

export function ProductForm({
  initial,
  categories,
  collections,
  markup,
  currency,
}: {
  initial: ProductFormData;
  categories: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  markup: number;
  currency: string;
}) {
  const { state, onSubmit, pending } = useFormAction(saveProductAction);
  const [variants, setVariants] = useState(initial.variants);
  const [images, setImages] = useState(initial.images);
  const [cost, setCost] = useState(initial.supplierCost);
  const [override, setOverride] = useState(initial.priceOverride);
  const [price, setPrice] = useState(initial.retailPrice);

  const autoPrice = cost ? Math.ceil(Number(cost) * markup) : 0;
  const effective = override ? Number(price || 0) : autoPrice;
  const margin = effective - Number(cost || 0);
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  const updateVariant = (i: number, patch: Partial<ProductFormData["variants"][number]>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  function addSizeRun() {
    const color = window.prompt("Colour name (e.g. Black)");
    if (!color) return;
    const hex = window.prompt("Colour hex", "#111111") || "#111111";
    const sizes = (window.prompt("Sizes, comma separated", "S,M,L,XL") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const base = (initial.supplierSku || initial.slug || "SKU").toUpperCase().replace(/[^A-Z0-9]+/g, "-");
    setVariants((vs) => [
      ...vs,
      ...sizes.map((size) => ({
        sku: `${base}-${color.slice(0, 4).toUpperCase()}-${size.toUpperCase()}`,
        size,
        color,
        colorHex: hex,
        stock: 10,
        supplierSku: "",
      })),
    ]);
  }

  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <input type="hidden" name="variants" value={JSON.stringify(variants)} />
        <input
          type="hidden"
          name="images"
          value={JSON.stringify(images.map(({ id, alt, color }) => ({ id, alt, color })))}
        />

        <div className="space-y-6">
          <Card title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Name" htmlFor="name">
                  <input id="name" name="name" defaultValue={initial.name} required className="input" />
                </Field>
              </div>
              <Field label="Slug (URL)" htmlFor="slug" hint="Leave empty to generate from the name">
                <input id="slug" name="slug" defaultValue={initial.slug} className="input" />
              </Field>
              <Field label="Tags" htmlFor="tags" hint="Space or comma separated, used by search">
                <input id="tags" name="tags" defaultValue={initial.tags} className="input" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" htmlFor="description">
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    defaultValue={initial.description}
                    className="input h-auto py-3"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Details (one per line)" htmlFor="details">
                  <textarea
                    id="details"
                    name="details"
                    rows={4}
                    defaultValue={initial.details}
                    className="input h-auto py-3"
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Images">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img, i) => (
                <div key={img.id} className="space-y-1.5">
                  <div className="bg-subtle relative aspect-[4/5]">
                    <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
                    {i === 0 && (
                      <span className="bg-ink text-bg absolute start-1 top-1 px-1.5 text-[10px]">MAIN</span>
                    )}
                  </div>
                  <select
                    value={img.color ?? ""}
                    onChange={(e) =>
                      setImages((im) =>
                        im.map((x, j) => (j === i ? { ...x, color: e.target.value || null } : x)),
                      )
                    }
                    className="input h-8 px-2 text-xs"
                    aria-label="Image colour"
                  >
                    <option value="">All colours</option>
                    {colors.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <div className="flex justify-between text-xs">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() =>
                        setImages((im) => {
                          const n = [...im];
                          [n[i - 1], n[i]] = [n[i]!, n[i - 1]!];
                          return n;
                        })
                      }
                      className="disabled:opacity-30"
                    >
                      ← Move
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((im) => im.filter((_, j) => j !== i))}
                      className="text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Upload images" hint="JPG/PNG/WebP, converted to WebP, max 2000px">
                <input type="file" name="newImages" accept="image/*" multiple className="text-sm" />
              </Field>
              <Field label="Colour for uploaded images">
                <select name="newImageColor" className="input h-10">
                  <option value="">All colours</option>
                  {colors.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title={`Variants (${variants.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-muted text-start text-[11px] uppercase">
                    <th className="p-1 text-start">SKU</th>
                    <th className="p-1 text-start">Size</th>
                    <th className="p-1 text-start">Colour</th>
                    <th className="p-1 text-start">Hex</th>
                    <th className="p-1 text-start">Stock</th>
                    <th className="p-1 text-start">Supplier SKU / ID</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id ?? `new-${i}`}>
                      <td className="p-1">
                        <input
                          value={v.sku}
                          onChange={(e) => updateVariant(i, { sku: e.target.value })}
                          className="input h-9 px-2 text-xs"
                          aria-label="SKU"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          value={v.size}
                          onChange={(e) => updateVariant(i, { size: e.target.value })}
                          className="input h-9 w-20 px-2 text-xs"
                          aria-label="Size"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          value={v.color}
                          onChange={(e) => updateVariant(i, { color: e.target.value })}
                          className="input h-9 w-28 px-2 text-xs"
                          aria-label="Colour"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="color"
                          value={v.colorHex.length === 7 ? v.colorHex : "#111111"}
                          onChange={(e) => updateVariant(i, { colorHex: e.target.value })}
                          className="border-line h-9 w-12 border"
                          aria-label="Colour hex"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          min={0}
                          value={v.stock}
                          onChange={(e) => updateVariant(i, { stock: Number(e.target.value) })}
                          className="input h-9 w-20 px-2 text-xs"
                          aria-label="Stock"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          value={v.supplierSku}
                          onChange={(e) => updateVariant(i, { supplierSku: e.target.value })}
                          className="input h-9 px-2 text-xs"
                          aria-label="Supplier SKU"
                        />
                      </td>
                      <td className="p-1">
                        <button
                          type="button"
                          onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))}
                          className="text-danger px-2"
                          aria-label="Remove variant"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn-outline h-9 px-4 text-[11px]"
                onClick={() =>
                  setVariants((vs) => [
                    ...vs,
                    {
                      sku: "",
                      size: "",
                      color: vs.at(-1)?.color ?? "",
                      colorHex: vs.at(-1)?.colorHex ?? "#111111",
                      stock: 0,
                      supplierSku: "",
                    },
                  ])
                }
              >
                Add variant
              </button>
              <button type="button" className="btn-outline h-9 px-4 text-[11px]" onClick={addSizeRun}>
                Add colour × size run
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="space-y-4">
              <select name="status" defaultValue={initial.status} className="input">
                <option value="active">Active (visible)</option>
                <option value="draft">Draft (hidden)</option>
                <option value="archived">Archived</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="featured" defaultChecked={initial.featured} /> Featured
              </label>
              <Field label="Category">
                <select name="categoryId" defaultValue={initial.categoryId} className="input">
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              {collections.length > 0 && (
                <fieldset>
                  <legend className="label">Collections</legend>
                  {collections.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="collectionIds"
                        value={c.id}
                        defaultChecked={initial.collectionIds.includes(c.id)}
                      />{" "}
                      {c.name}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>
          </Card>

          <Card title="Supplier & pricing">
            <div className="space-y-4">
              <Field label="Supplier name">
                <input name="supplierName" defaultValue={initial.supplierName} className="input" />
              </Field>
              <Field label="Supplier SKU">
                <input name="supplierSku" defaultValue={initial.supplierSku} className="input" />
              </Field>
              <Field label="Supplier URL">
                <input name="supplierUrl" type="url" defaultValue={initial.supplierUrl} className="input" />
              </Field>
              <Field label={`Supplier cost (${currency})`}>
                <input
                  name="supplierCost"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="input"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="priceOverride"
                  checked={override}
                  onChange={(e) => setOverride(e.target.checked)}
                />{" "}
                Set retail price manually
              </label>
              <Field
                label={`Retail price (${currency})`}
                hint={override ? "Manual price" : `Auto: cost × ${markup} = ${autoPrice.toFixed(2)}`}
              >
                <input
                  name="retailPrice"
                  inputMode="decimal"
                  value={override ? price : String(autoPrice)}
                  onChange={(e) => setPrice(e.target.value)}
                  readOnly={!override}
                  className={`input ${override ? "" : "bg-subtle"}`}
                />
              </Field>
              <Field
                label={`Compare-at price (${currency})`}
                hint="Optional original price shown struck through"
              >
                <input
                  name="compareAtPrice"
                  inputMode="decimal"
                  defaultValue={initial.compareAtPrice}
                  className="input"
                />
              </Field>
              <p className="text-sm">
                Margin:{" "}
                <strong className={margin < 0 ? "text-danger" : ""}>
                  {margin.toFixed(2)} {currency}
                </strong>
                {effective > 0 && (
                  <span className="text-muted"> ({((margin / effective) * 100).toFixed(1)}%)</span>
                )}
              </p>
            </div>
          </Card>

          <div className="border-line bg-surface sticky bottom-0 space-y-2 border p-4">
            <SubmitButton className="btn-primary w-full">Save product</SubmitButton>
            {state.error && (
              <p role="alert" className="text-danger text-sm">
                {state.error}
              </p>
            )}
            {state.ok && <p className="text-success text-sm">{state.message}</p>}
          </div>
        </div>
      </form>
    </PendingContext.Provider>
  );
}
