import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, rmdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { seedData } from './seed-data.js'

const configuredDataFile = process.env.DATA_FILE
const dataDir = configuredDataFile
  ? path.dirname(path.resolve(process.cwd(), configuredDataFile))
  : path.resolve(process.cwd(), 'data')
const dataFile = configuredDataFile
  ? path.resolve(process.cwd(), configuredDataFile)
  : path.join(dataDir, 'db.json')
const lockDir = `${dataFile}.lock`
const readRetryCount = 5
const writeLockRetryCount = 1000

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  if (!existsSync(dataFile)) {
    atomicWrite(seedData)
  }
}

function withWriteLock(action) {
  let acquired = false

  for (let attempt = 1; attempt <= writeLockRetryCount; attempt += 1) {
    try {
      mkdirSync(lockDir)
      acquired = true
      break
    } catch (error) {
      if (error?.code !== 'EEXIST' || attempt === writeLockRetryCount) throw error
    }
  }

  if (!acquired) throw new Error('Could not acquire store write lock')

  try {
    return action()
  } finally {
    rmdirSync(lockDir)
  }
}

function atomicWrite(nextState) {
  return withWriteLock(() => {
    const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`
    writeFileSync(tempFile, JSON.stringify(nextState, null, 2))
    rmSync(dataFile, { force: true })
    renameSync(tempFile, dataFile)
  })
}

function safeRead() {
  let lastError

  for (let attempt = 1; attempt <= readRetryCount; attempt += 1) {
    try {
      return JSON.parse(readFileSync(dataFile, 'utf8'))
    } catch (error) {
      lastError = error
      const isRetryable = error instanceof SyntaxError || error?.code === 'ENOENT'
      if (!isRetryable || attempt === readRetryCount) break
    }
  }

  throw lastError
}

export function createStore() {
  ensureStore()

  function read() {
    return safeRead()
  }

  function write(nextState) {
    atomicWrite(nextState)
    return clone(nextState)
  }

  return {
    path: dataFile,
    read,
    write,
    reset() {
      return write(clone(seedData))
    },
  }
}
