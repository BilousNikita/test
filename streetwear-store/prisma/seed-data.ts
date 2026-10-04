/**
 * PLACEHOLDER CATALOG – every record created from this file is flagged `isPlaceholder = true`
 * and can be removed in one go with `npm run seed:clear`.
 * Prices are in MINOR units (USD cents by default).
 */
import type { Garment } from "./placeholder-art";

export const COLORS = {
  Black: "#141414",
  Bone: "#e8e2d4",
  "Washed Grey": "#8d8d8a",
  Olive: "#5b5e3c",
  Navy: "#1f2a44",
  Rust: "#a2502b",
  White: "#f7f7f5",
  Sand: "#c8b58f",
  Charcoal: "#333333",
  Sky: "#9fb7c9",
} as const;
export type ColorName = keyof typeof COLORS;

export const CATEGORIES = [
  { slug: "t-shirts", name: "T-Shirts", description: "Heavyweight cotton tees with boxy, considered fits." },
  { slug: "hoodies", name: "Hoodies", description: "Brushed-back fleece, dropped shoulders, built to last." },
  { slug: "pants", name: "Pants", description: "Wide-leg trousers and utility cargos." },
  { slug: "shorts", name: "Shorts", description: "Track shorts and fleece shorts for warm days." },
  { slug: "accessories", name: "Accessories", description: "Caps, bags and the finishing details." },
];

export const COLLECTIONS = [
  {
    slug: "core-essentials",
    name: "Core Essentials",
    description: "The everyday uniform. Heavyweight basics in a neutral palette.",
    garment: "tee" as Garment,
    color: "Bone" as ColorName,
    bg: "#d9d3c5",
  },
  {
    slug: "night-shift",
    name: "Night Shift",
    description: "Tonal blacks and charcoals for after dark.",
    garment: "hoodie" as Garment,
    color: "Black" as ColorName,
    bg: "#2a2a2a",
  },
  {
    slug: "summer-drop",
    name: "Summer Drop",
    description: "Lightweight shorts, washed tees and sun-faded colour.",
    garment: "shorts" as Garment,
    color: "Rust" as ColorName,
    bg: "#e9c9a8",
  },
];

const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const WAIST_SIZES = ["28", "30", "32", "34", "36"];

export interface SeedProduct {
  slug: string;
  name: string;
  category: string;
  collections: string[];
  garment: Garment;
  description: string;
  details: string[];
  tags: string;
  supplierName: string;
  supplierSku: string;
  supplierCost: number;
  retailPrice?: number; // set => manual price override
  compareAtPrice?: number;
  featured?: boolean;
  colors: ColorName[];
  sizes: string[];
}

const SUPPLIERS = { cj: "CJ Dropshipping", print: "PrintLab Studio", local: "Atelier Goods Co." };

export const PRODUCTS: SeedProduct[] = [
  {
    slug: "heavyweight-boxy-tee",
    name: "Heavyweight Boxy Tee",
    category: "t-shirts",
    collections: ["core-essentials"],
    garment: "tee",
    description:
      "Our signature tee in 260gsm combed cotton. A boxy, slightly cropped body with dropped shoulders and a dense ribbed collar that keeps its shape wash after wash.",
    details: [
      "260gsm 100% combed cotton",
      "Boxy fit – size down for a closer fit",
      "Pre-shrunk, garment washed",
      "Tonal embroidered mark on chest",
    ],
    tags: "tee basic heavyweight cotton",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-TEE-260",
    supplierCost: 1150,
    featured: true,
    colors: ["Black", "Bone", "Washed Grey"],
    sizes: TOP_SIZES,
  },
  {
    slug: "archive-logo-tee",
    name: "Archive Logo Tee",
    category: "t-shirts",
    collections: ["night-shift"],
    garment: "tee",
    description:
      "A relaxed tee printed with our archive mark on the back. Water-based inks for a soft hand-feel that fades beautifully over time.",
    details: [
      "220gsm cotton jersey",
      "Relaxed fit",
      "Water-based back print",
      "Made to order by our print partner",
    ],
    tags: "tee graphic logo print",
    supplierName: SUPPLIERS.print,
    supplierSku: "PL-ARCH-01",
    supplierCost: 1300,
    colors: ["Black", "White"],
    sizes: TOP_SIZES,
  },
  {
    slug: "garment-dyed-pocket-tee",
    name: "Garment-Dyed Pocket Tee",
    category: "t-shirts",
    collections: ["summer-drop"],
    garment: "tee",
    description:
      "Dyed after sewing for a lived-in colour and soft, broken-in feel from day one. Finished with a patch pocket on the chest.",
    details: [
      "240gsm cotton",
      "Garment dyed – every piece is slightly unique",
      "Regular fit",
      "Patch chest pocket",
    ],
    tags: "tee pocket garment dyed summer",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-TEE-GD",
    supplierCost: 1200,
    colors: ["Rust", "Sky", "Sand"],
    sizes: TOP_SIZES,
  },
  {
    slug: "oversized-fleece-hoodie",
    name: "Oversized Fleece Hoodie",
    category: "hoodies",
    collections: ["core-essentials", "night-shift"],
    garment: "hoodie",
    description:
      "A heavyweight 450gsm brushed-back fleece hoodie with an oversized body, double-layer hood and a deep kangaroo pocket.",
    details: [
      "450gsm cotton/poly brushed fleece",
      "Oversized fit",
      "Double-layer hood, flat drawcords",
      "Ribbed cuffs and hem",
    ],
    tags: "hoodie fleece oversized heavyweight",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-HD-450",
    supplierCost: 2600,
    compareAtPrice: 9500,
    featured: true,
    colors: ["Black", "Bone", "Olive"],
    sizes: TOP_SIZES,
  },
  {
    slug: "zip-through-studio-hoodie",
    name: "Zip-Through Studio Hoodie",
    category: "hoodies",
    collections: ["night-shift"],
    garment: "zip-hoodie",
    description:
      "A clean zip-through with a two-way metal zip, split welt pockets and a boxy silhouette that layers over everything.",
    details: ["420gsm loopback cotton", "Two-way metal zip", "Boxy fit", "Split welt pockets"],
    tags: "hoodie zip layering",
    supplierName: SUPPLIERS.local,
    supplierSku: "AG-ZIP-420",
    supplierCost: 3100,
    retailPrice: 8900,
    colors: ["Navy", "Charcoal"],
    sizes: TOP_SIZES,
  },
  {
    slug: "washed-pullover-hoodie",
    name: "Washed Pullover Hoodie",
    category: "hoodies",
    collections: ["summer-drop"],
    garment: "hoodie",
    description:
      "Enzyme and stone washed for a vintage, sun-faded look. Lighter weight for transitional weather.",
    details: ["360gsm cotton fleece", "Vintage wash", "Relaxed fit", "Embroidered mark on chest"],
    tags: "hoodie washed vintage",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-HD-WASH",
    supplierCost: 2400,
    colors: ["Washed Grey", "Sand"],
    sizes: TOP_SIZES,
  },
  {
    slug: "pleated-wide-leg-trouser",
    name: "Pleated Wide-Leg Trouser",
    category: "pants",
    collections: ["core-essentials"],
    garment: "pants",
    description:
      "Double pleats, a high rise and a generous wide leg. Tailoring details with streetwear proportions.",
    details: [
      "Cotton twill with a soft drape",
      "High rise, double pleats",
      "Wide straight leg",
      "Adjustable side tabs",
    ],
    tags: "pants trousers pleated wide leg tailoring",
    supplierName: SUPPLIERS.local,
    supplierSku: "AG-TRS-PL",
    supplierCost: 3300,
    featured: true,
    colors: ["Black", "Sand"],
    sizes: WAIST_SIZES,
  },
  {
    slug: "utility-cargo-pant",
    name: "Utility Cargo Pant",
    category: "pants",
    collections: ["night-shift"],
    garment: "cargo",
    description: "Ripstop cargo pants with bellowed thigh pockets, articulated knees and drawcord hems.",
    details: ["Cotton ripstop", "Six pockets", "Articulated knees", "Drawcord hem for a tapered look"],
    tags: "pants cargo utility ripstop",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-CRG-RS",
    supplierCost: 2900,
    colors: ["Olive", "Black", "Charcoal"],
    sizes: WAIST_SIZES,
  },
  {
    slug: "nylon-track-short",
    name: "Nylon Track Short",
    category: "shorts",
    collections: ["summer-drop"],
    garment: "shorts",
    description: "Lightweight crinkle-nylon shorts with a mesh lining and elasticated waist. Made for heat.",
    details: [
      "Crinkle nylon shell, mesh lining",
      "Elastic waist with drawcord",
      '7" inseam',
      "Zip back pocket",
    ],
    tags: "shorts nylon track summer",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-SH-NYL",
    supplierCost: 1400,
    colors: ["Black", "Navy", "Rust"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "heavy-fleece-short",
    name: "Heavy Fleece Short",
    category: "shorts",
    collections: ["core-essentials"],
    garment: "shorts",
    description: "The hoodie, but shorts. Brushed-back fleece cut long and relaxed with a raw-edge hem.",
    details: ["400gsm brushed fleece", 'Relaxed fit, 9" inseam', "Raw-edge hem", "Side seam pockets"],
    tags: "shorts fleece sweatshorts",
    supplierName: SUPPLIERS.cj,
    supplierSku: "CJ-SH-FLC",
    supplierCost: 1700,
    colors: ["Washed Grey", "Black"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    slug: "six-panel-logo-cap",
    name: "Six-Panel Logo Cap",
    category: "accessories",
    collections: ["core-essentials"],
    garment: "cap",
    description:
      "An unstructured six-panel cap in washed cotton twill with an embroidered mark and brass buckle.",
    details: ["Washed cotton twill", "Unstructured crown", "Brass buckle closure", "One size fits most"],
    tags: "cap hat accessories",
    supplierName: SUPPLIERS.print,
    supplierSku: "PL-CAP-6P",
    supplierCost: 900,
    retailPrice: 3500,
    colors: ["Black", "Bone", "Navy"],
    sizes: ["One Size"],
  },
  {
    slug: "canvas-tote-bag",
    name: "Canvas Tote Bag",
    category: "accessories",
    collections: ["summer-drop"],
    garment: "tote",
    description:
      "A heavy 16oz canvas tote with long handles and an inner zip pocket. Fits a laptop and then some.",
    details: ["16oz cotton canvas", "Inner zip pocket", 'Fits a 16" laptop', "Printed mark"],
    tags: "bag tote accessories canvas",
    supplierName: SUPPLIERS.print,
    supplierSku: "PL-TOTE-16",
    supplierCost: 800,
    colors: ["Bone", "Black"],
    sizes: ["One Size"],
  },
];
