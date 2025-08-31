import type { Models } from "./Models.ts"

export type Config = {
  chunksPerContext: number
  similarity: number
  model: Models
}