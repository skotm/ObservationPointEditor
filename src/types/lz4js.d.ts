declare module 'lz4js' {
  export function compress(input: Uint8Array): Uint8Array;
  export function decompress(input: Uint8Array, uncompressedSize?: number): Uint8Array;
}