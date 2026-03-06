import fs from 'fs'
import path from 'path'

function toUnpackedDir(dirname: string) {
  return dirname.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`)
}

export function resolveWorkerPath(
  dirname: string,
  bundledFilename: string,
  fallbackFilename = 'worker.js',
  existsSync = fs.existsSync
) {
  const bundledPath = path.resolve(dirname, 'workers', bundledFilename)
  const unpackedPath = path.resolve(toUnpackedDir(dirname), 'workers', bundledFilename)

  if (existsSync(unpackedPath)) return unpackedPath
  if (existsSync(bundledPath)) return bundledPath

  return path.resolve(dirname, fallbackFilename)
}
