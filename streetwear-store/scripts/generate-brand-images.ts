/** Regenerates the placeholder brand imagery in public/brand (hero, story, OG image). */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { renderComposition } from "../prisma/placeholder-art";

async function main() {
  const dir = path.join(process.cwd(), "public", "brand");
  await fs.mkdir(dir, { recursive: true });

  const hero = await renderComposition({
    width: 2400,
    height: 1400,
    bg: "#151515",
    accent: "#ff5a1f",
    items: [
      { garment: "hoodie", color: "#e8e2d4", x: 180, y: 120, scale: 0.85, rotate: -6 },
      { garment: "tee", color: "#2b2b2b", x: 920, y: 160, scale: 0.8, rotate: 4 },
      { garment: "cargo", color: "#5b5e3c", x: 1560, y: 60, scale: 0.85, rotate: -3 },
    ],
  });
  await fs.writeFile(path.join(dir, "hero.webp"), hero);

  const story = await renderComposition({
    width: 1600,
    height: 2000,
    bg: "#d9d3c5",
    items: [
      { garment: "zip-hoodie", color: "#1f2a44", x: 60, y: 120, scale: 1.0, rotate: -8 },
      { garment: "cap", color: "#111111", x: 620, y: 900, scale: 0.75, rotate: 10 },
    ],
  });
  await fs.writeFile(path.join(dir, "story.webp"), story);

  await sharp(hero)
    .resize(1200, 630, { fit: "cover" })
    .jpeg({ quality: 82 })
    .toFile(path.join(dir, "og.jpg"));
  console.log("Brand images written to public/brand");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
