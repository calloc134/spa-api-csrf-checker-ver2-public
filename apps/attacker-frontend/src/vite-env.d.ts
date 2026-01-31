/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_A: string
  readonly VITE_API_B: string
  readonly VITE_API_C: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
