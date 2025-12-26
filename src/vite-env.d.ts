/// <reference types="vite/client" />

// Type declarations for WASM imports
declare module '*.wasm?url' {
  const url: string
  export default url
}

declare module '*.wasm?init' {
  const initWasm: (options?: WebAssembly.Imports) => Promise<WebAssembly.Instance>
  export default initWasm
}
