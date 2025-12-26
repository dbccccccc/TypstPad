// Script to download typst fonts for self-hosting
// Run with: node scripts/download-fonts.js

import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fontsDir = join(__dirname, '..', 'public', 'fonts')

// Text fonts from typst-assets
const textFonts = [
  'DejaVuSansMono-Bold.ttf',
  'DejaVuSansMono-BoldOblique.ttf',
  'DejaVuSansMono-Oblique.ttf',
  'DejaVuSansMono.ttf',
  'LibertinusSerif-Bold.otf',
  'LibertinusSerif-BoldItalic.otf',
  'LibertinusSerif-Italic.otf',
  'LibertinusSerif-Regular.otf',
  'LibertinusSerif-Semibold.otf',
  'LibertinusSerif-SemiboldItalic.otf',
  'NewCM10-Bold.otf',
  'NewCM10-BoldItalic.otf',
  'NewCM10-Italic.otf',
  'NewCM10-Regular.otf',
  'NewCMMath-Bold.otf',
  'NewCMMath-Book.otf',
  'NewCMMath-Regular.otf',
]

const TEXT_BASE_URL = 'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts/'

async function downloadFont(url, destPath) {
  console.log(`Downloading: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  await writeFile(destPath, Buffer.from(buffer))
  console.log(`  Saved: ${destPath}`)
}

async function main() {
  // Create fonts directory
  if (!existsSync(fontsDir)) {
    await mkdir(fontsDir, { recursive: true })
    console.log(`Created directory: ${fontsDir}`)
  }

  console.log('\nDownloading text fonts...\n')

  for (const font of textFonts) {
    const url = TEXT_BASE_URL + font
    const destPath = join(fontsDir, font)

    if (existsSync(destPath)) {
      console.log(`Skipping (exists): ${font}`)
      continue
    }

    try {
      await downloadFont(url, destPath)
    } catch (error) {
      console.error(`Error downloading ${font}:`, error.message)
    }
  }

  console.log('\nDone! Fonts saved to public/fonts/')
}

main().catch(console.error)
