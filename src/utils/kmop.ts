import { encode, decode } from '@msgpack/msgpack';
// lz4js は CJS パッケージのため named export の形が環境によって異なることがあります。
// ビルド時にエラーが出た場合は `import LZ4 from 'lz4js'` 等に読み替えてください。
import * as LZ4 from 'lz4js';

import {
  FileOperationError,
  FileOperationException,
  type CommonObservationPoint,
  type KmopHeader,
} from '@/types';
import { toJson, fromJson } from '@/utils/fileFormat';

const KMOP_MAGIC = 'KMOP';
const KMOP_VERSION = 0;

interface KmopPayload {
  header: KmopHeader;
  points: ReturnType<typeof toJson>[];
}

/**
 * 観測点配列を KMOP (MessagePack + LZ4圧縮) バイナリにシリアライズする。
 *
 * フォーマット:
 *   [4 bytes] マジックナンバー "KMOP"
 *   [4 bytes] 圧縮前サイズ (uint32, little endian) - LZ4 展開に必要
 *   [N bytes] LZ4圧縮された MessagePack バイナリ
 */
export function serializeKmop(
  points: CommonObservationPoint[],
  dataVersion: string,
): Uint8Array {
  const header: KmopHeader = {
    version: KMOP_VERSION,
    packedAt: new Date().toISOString(),
    source: 'ObservationPointEditor',
    dataVersion,
  };
  const payload: KmopPayload = { header, points: points.map(toJson) };

  const packed = encode(payload);
  const compressed: Uint8Array = LZ4.compress(packed);

  const out = new Uint8Array(4 + 4 + compressed.length);
  out.set(new TextEncoder().encode(KMOP_MAGIC), 0);
  new DataView(out.buffer).setUint32(4, packed.length, true);
  out.set(compressed, 8);
  return out;
}

export function deserializeKmop(data: Uint8Array): {
  header: KmopHeader;
  points: CommonObservationPoint[];
} {
  const magic = new TextDecoder().decode(data.slice(0, 4));
  if (magic !== KMOP_MAGIC) {
    throw new FileOperationException(
      FileOperationError.InvalidFormat,
      'KMOPファイルのマジックナンバーが不正です',
    );
  }
  const uncompressedSize = new DataView(data.buffer, data.byteOffset).getUint32(4, true);
  const compressed = data.slice(8);

  let packed: Uint8Array;
  try {
    packed = LZ4.decompress(compressed, uncompressedSize);
  } catch (e) {
    throw new FileOperationException(
      FileOperationError.ParseError,
      `LZ4展開に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  let payload: KmopPayload;
  try {
    payload = decode(packed) as KmopPayload;
  } catch (e) {
    throw new FileOperationException(
      FileOperationError.ParseError,
      `MessagePack解析に失敗しました: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return {
    header: payload.header,
    points: payload.points.map((p, i) => fromJson(p, i + 1)),
  };
}
