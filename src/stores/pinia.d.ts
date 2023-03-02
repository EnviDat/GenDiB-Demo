import 'pinia'

declare module 'pinia' {
  export interface PiniaCustomProperties {
    functionName: () => void
  }
}
