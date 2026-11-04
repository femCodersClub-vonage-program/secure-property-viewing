// Converts images to WebP, limits their size and removes their metadata.
// `npm run images` optimizes them; `npm run images:check` only reports, for the CI.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const IMAGE_FOLDERS = ['docs/images', 'client/src/assets', 'client/public']
const CONVERTIBLE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])
const FILES_THAT_MENTION_IMAGES = new Set(['.md', '.ts', '.tsx', '.css', '.html'])
const MAX_WIDTH_PX = 2000
const WEBP_QUALITY = 80
const MAX_SIZE_KB = 500

const sizeInKb = (file) => Math.round(statSync(file).size / 1024)
const fromRoot = (file) => relative(REPO_ROOT, file).replaceAll('\\', '/')

const listFiles = (folder) =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })

const listImages = () =>
  IMAGE_FOLDERS.map((folder) => join(REPO_ROOT, folder))
    .filter(existsSync)
    .flatMap(listFiles)

const isConvertible = (file) => CONVERTIBLE_EXTENSIONS.has(extname(file).toLowerCase())
const isOversizedWebp = (file) =>
  extname(file).toLowerCase() === '.webp' && sizeInKb(file) > MAX_SIZE_KB

const reportProblems = () => {
  const problems = listImages().flatMap((file) => {
    if (isConvertible(file)) return [`${fromRoot(file)}: not converted to WebP`]
    if (isOversizedWebp(file))
      return [`${fromRoot(file)}: ${sizeInKb(file)} KB, over ${MAX_SIZE_KB} KB`]
    return []
  })
  problems.forEach((problem) => console.error(problem))
  if (problems.length > 0) {
    console.error('\nRun `npm run images` in client/ and commit the result.')
    process.exitCode = 1
    return
  }
  console.log('All images are optimized.')
}

const updateMentions = (oldName, newName) => {
  const trackedFiles = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    },
  ).split('\n')

  for (const file of trackedFiles) {
    const path = join(REPO_ROOT, file)
    if (!FILES_THAT_MENTION_IMAGES.has(extname(file).toLowerCase()) || !existsSync(path)) continue
    const content = readFileSync(path, 'utf8')
    if (!content.includes(oldName)) continue
    writeFileSync(path, content.replaceAll(oldName, newName))
    console.log(`  updated the mention in ${file}`)
  }
}

const optimizeAll = async () => {
  const { default: sharp } = await import('sharp')

  for (const file of listImages().filter(
    (image) => isConvertible(image) || isOversizedWebp(image),
  )) {
    const output = join(dirname(file), `${basename(file, extname(file))}.webp`)
    const sizeBefore = sizeInKb(file)
    // Read into memory first, because an oversized WebP is overwritten with its own output
    const webp = await sharp(readFileSync(file))
      .rotate()
      .resize({ width: MAX_WIDTH_PX, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    writeFileSync(output, webp)
    if (file !== output) {
      unlinkSync(file)
      updateMentions(basename(file), basename(output))
    }
    console.log(`${fromRoot(output)}: ${sizeBefore} KB -> ${sizeInKb(output)} KB`)
  }
  reportProblems()
}

if (process.argv.includes('--check')) {
  reportProblems()
} else {
  await optimizeAll()
}
