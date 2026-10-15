import { mkdir, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

// Use the image processor shipped with Next, also used by next/image.
const require = createRequire(import.meta.url)
const sharp = createRequire(require.resolve("next/package.json"))("sharp")
const design = new URL("../public/design/", import.meta.url)
await mkdir(new URL("optimized/", design), { recursive: true })

const illustrations = [
  "type-deepfake", "type-sharing", "type-voyeurism",
  "case-deepfake", "case-compensation", "case-takedown",
]
const assets = [
  { source: "generated/home-hero-v2.png", output: "optimized/home-hero-v2.webp", width: 1672 },
  { source: "generated/story-envelope-v1.png", output: "optimized/story-envelope-v1.webp", width: 640 },
  { source: "../logo.PNG", output: "optimized/companion-avatar.webp", width: 512 },
  { source: "hero-portrait.png", output: "hero-portrait.webp", width: 2560 },
  ...illustrations.map((name) => ({ source: `${name}.svg`, output: `optimized/${name}.webp`, width: 512 })),
  { source: "rose.svg", output: "optimized/rose.webp", width: 1152 },
]

for (const { source, output, width } of assets) {
  const sourcePath = fileURLToPath(new URL(source, design))
  const outputPath = fileURLToPath(new URL(output, design))
  await sharp(sourcePath)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 88, effort: 6 })
    .toFile(outputPath)
  const original = await stat(sourcePath)
  const optimized = await stat(outputPath)
  console.log(`${source} -> ${output}: ${(original.size / 1000).toFixed(1)} -> ${(optimized.size / 1000).toFixed(1)} KB`)
}
