"use client";

import { useRef } from "react";
import { CloseIcon } from "@/components/ui/icons";

export type SizeGuideType = "tops" | "bottoms" | "none";

// [REVIEW] Replace with your supplier's exact garment measurements.
const GUIDES: Record<Exclude<SizeGuideType, "none">, { head: string[]; rows: string[][]; note: string }> = {
  tops: {
    head: ["Size", "Chest (cm)", "Length (cm)", "Sleeve (cm)"],
    rows: [
      ["XS", "104", "66", "21"],
      ["S", "110", "69", "22"],
      ["M", "116", "72", "23"],
      ["L", "122", "75", "24"],
      ["XL", "128", "78", "25"],
      ["XXL", "134", "81", "26"],
    ],
    note: "Garment measurements, laid flat. Our tops are cut boxy/oversized — size down for a regular fit.",
  },
  bottoms: {
    head: ["Size", "Waist (cm)", "Hip (cm)", "Inseam (cm)"],
    rows: [
      ["28 / S", "72", "100", "76"],
      ["30 / M", "77", "105", "77"],
      ["32 / L", "82", "110", "78"],
      ["34 / XL", "87", "115", "79"],
      ["36 / XXL", "92", "120", "80"],
    ],
    note: "Body measurements. If you are between sizes, choose the larger size.",
  },
};

export function SizeGuide({ type }: { type: SizeGuideType }) {
  const ref = useRef<HTMLDialogElement>(null);
  if (type === "none") return null;
  const g = GUIDES[type];
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-xs underline underline-offset-4"
      >
        Size guide
      </button>
      <dialog
        ref={ref}
        className="bg-surface text-ink m-auto w-[min(92vw,560px)] p-0"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="display text-3xl">Size guide</h2>
            <button onClick={() => ref.current?.close()} aria-label="Close size guide" className="-me-2 p-2">
              <CloseIcon />
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-ink border-b text-start">
                {g.head.map((h) => (
                  <th key={h} className="py-2 text-start text-xs font-semibold tracking-wide uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r[0]} className="border-line border-b">
                  {r.map((c, i) => (
                    <td key={i} className={`py-2.5 ${i === 0 ? "font-medium" : "text-muted"}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted mt-4 text-xs">{g.note}</p>
        </div>
      </dialog>
    </>
  );
}
