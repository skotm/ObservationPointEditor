# ObservationPointEditor

強震モニタ (K-NET / KiK-net / S-net) の観測点データについて、色を読み取るピクセル位置
(`point.center` + `point.offset`) を地図上でドラッグ編集するためのツールです。
`OBSERVATION_POINT_EDITOR_REQUIREMENTS.md` の仕様に基づく Vite + React + TypeScript 実装です。

## 構成

```
.
├── src/                    フロントエンド (React/TypeScript)
│   ├── types/               共通型定義
│   ├── utils/                座標計算・カラースケール・ファイル形式変換
│   ├── services/             CRUD・フィルタ・CSVインポート・重複統合・ピクセル検出
│   ├── hooks/                 状態管理 (Undo/Redo、ファイルI/O、ショートカット)
│   ├── components/           UIコンポーネント (地図キャンバス・パネル・ダイアログ)
│   └── App.tsx
├── worker/                  Cloudflare Worker (kmoni/海しる 画像プロキシ)
│   └── src/index.ts
└── .github/workflows/       GitHub Pages への自動デプロイ / Lint CI
```

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # Worker デプロイ後にURLを設定
npm run dev
```

## 画像プロキシ (Cloudflare Worker) のデプロイ

強震モニタ (kmoni) および海しる (umishiru) はブラウザから直接 CORS フェッチできないため、
Cloudflare Worker を経由して画像を取得します。

```bash
cd worker
npm install
npx wrangler login
# wrangler.toml の ALLOWED_ORIGINS を自分のGitHub PagesのURLに書き換える
npx wrangler deploy
```

デプロイ後に表示される `https://obs-point-image-proxy.<subdomain>.workers.dev` を
`.env.local` の `VITE_IMAGE_PROXY_BASE_URL` に設定してください。GitHub Actions 経由で
デプロイする場合は、リポジトリの Variables に `VITE_IMAGE_PROXY_BASE_URL` を追加してください。

### 実装済み: kmoniエンドポイント

- `GET /kmoni/latest` — 最新画像時刻の取得 (`webservice/server/pros/latest.json` を中継)
- `GET /kmoni/image?timestamp=YYYYMMDDHHMMSS&kind=shindo|accel` — 震度分布 / 最大加速度画像の取得

### 実装済み: 海しるエンドポイント

海しる (S-net 強震動情報レイヤー) は、以下のタイルURLから2枚 (y=11, y=12) を取得し、
縦に結合して1枚の背景画像として扱います。

```
https://www.msil.go.jp/data/tiles/smoni/tileimage/{time}/{time}/5/28/11.png
https://www.msil.go.jp/data/tiles/smoni/tileimage/{time}/{time}/5/28/12.png
```

`{time}` は `YYYYMMDDHHMMSS` 形式 (UTC)。取得時刻は下記のロジックで、現在時刻から
「データがまだサーバーに揃っていない場合は1分前を使う」ように自動計算されます
(`src/utils/umishiruTime.ts` / `worker/src/umishiruTime.ts` に同一ロジックを実装):

1. **秒削除**: 現在時刻 (UTC) の秒を切り捨てる (例 06:30:30 → 06:30:00)
2. **秒確認**: 切り捨て前の秒が 49 未満なら、データがまだ揃っていないとみなしてさらに1分巻き戻す
3. **遅延適用**: 追加の安全マージン (`UMISHIRU_DELAY_MINUTES`、既定 0分) をさらに引く

- `GET /umishiru/tile?time=YYYYMMDDHHMMSS&y=11|12` — タイル画像を取得 (time省略時は自動計算)
- `GET /umishiru/latest` — 自動計算された `time` を `{ time }` 形式で返す

Worker の環境変数 `UMISHIRU_DELAY_MINUTES` (`worker/wrangler.toml` の `[vars]`) で
安全マージンを調整できます。

## GitHub Pages へのデプロイ

`main` ブランチに push すると `.github/workflows/deploy.yml` が自動でビルド・デプロイします。
リポジトリの Settings → Pages → Source を "GitHub Actions" に設定してください。
プロジェクトページ (`https://<user>.github.io/<repo>/`) 名を使う場合、ビルド時の
`VITE_BASE_PATH` はワークフロー内でリポジトリ名から自動設定されます。カスタムドメインを
使う場合は `vite.config.ts` の `REPO_BASE` を `/` のままにしてください。

## ファイル形式

- **JSON** (`.json`): 人間が読める形式。`{ meta, points: [...] }` または配列そのもの。
- **KMOP** (`.kmop`): MessagePack + LZ4圧縮したバイナリ形式。大量データの高速な読み書き用。

## 主な操作

| 操作 | 方法 |
| --- | --- |
| 観測点を選択 | 地図上でクリック |
| 読み取り位置を移動 | 選択した観測点をドラッグ |
| 微調整 | 選択中に矢印キー (Shiftで1px単位、通常5px単位) |
| パン | Alt+ドラッグ / マウス中ボタンドラッグ |
| ズーム | マウスホイール |
| 元に戻す/やり直す | Ctrl(Cmd)+Z / Ctrl(Cmd)+Shift+Z |
| 保存 | Ctrl(Cmd)+S (JSON保存) |
| 削除 | 選択中に Delete / Backspace |

## 既知の制約・要調整箇所

- `src/services/importService.ts` の CSV 列名判定は、NIED公開CSVの一般的な列名を
  想定した実装です。実データを取り込む際は `COLUMN_ALIASES` を確認・調整してください。
- `src/App.tsx` のピクセル検出における「色付きピクセル」判定 (背景色との区別) は簡易実装です。
  強震モニタ画像の正確な背景色・透明色に合わせて調整してください。
- `src/utils/shindoColorScale.ts` の震度カラースケールは近似値です。厳密な色の再現が
  必要な場合は、強震モニタの凡例画像からカラーテーブルを抽出してください。
