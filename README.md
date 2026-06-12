# Mystic Forest Three

ローポリボクセル風の神秘の森を探索できる、Vite + TypeScript + Three.js 製のブラウザゲームです。

段差のある浮遊島、川、橋、石畳、発光クリスタル、ランタン、松や巨木を3Dシーンとして構成しています。プレイヤーキャラクターは8方向の歩行スプライトで表示し、カメラ角度と移動方向に応じて画像を切り替えます。

## 起動方法

```sh
npm install
npm run dev
```

起動後、表示されたローカルURLをブラウザで開きます。

## ビルド

```sh
npm run build
```

## 操作方法

| 操作 | 内容 |
| --- | --- |
| `W` / `A` / `S` / `D` | プレイヤー移動 |
| 矢印キー | プレイヤー移動 |
| マウスドラッグ | マップのカメラ回転 |
| マウスホイール / トラックパッド | ズームイン・ズームアウト |

## 実装内容

- Three.js の `OrthographicCamera` でアイソメトリック寄りの視点を構築
- ボクセル状の地形ブロックを生成し、草地、土、岩、石畳、水面を配置
- 発光する水色/紫のクリスタル、ランタン、キノコ、木、橋、小石をシーン内に配置
- `OrbitControls` でマップを回転可能にし、カメラ方向を元にプレイヤー移動方向を算出
- プレイヤーは透明Planeメッシュで描画し、8方向の歩行スプライトを選択して回転表現
- 移動中のみ4フレームの歩行アニメーションを再生
- 地形の高さに合わせてプレイヤーの足元と影を追従

## 使用技術

| 技術 | 用途 |
| --- | --- |
| Vite | 開発サーバー、ビルド |
| TypeScript | ゲームロジック、入力処理、型安全な実装 |
| Three.js | 3D描画、ジオメトリ、マテリアル、ライティング、カメラ |
| OrbitControls | マップの回転、ズーム操作 |
| HTML Canvas / WebGL | ブラウザ上でのリアルタイム描画 |
| npm | 依存関係管理、スクリプト実行 |

## 使用スキル

| スキル | 用途 |
| --- | --- |
| `$imagegen` | ゲーム内テクスチャ、発光クリスタル素材、キノコ傘素材の画像生成 |
| `$generate2dsprite` | プレイヤー歩行アニメーションの生成、マゼンタ背景除去、透明PNG化、フレーム分割、QC |

## Image genで生成した画像

このゲームでは、手続き的な色だけではなく、`$imagegen` で生成した画像素材をThree.jsのマテリアルやスプライトとして使用しています。

| ファイル | 用途 |
| --- | --- |
| `public/textures/mystic-forest-atlas.png` | 草地、土、岩、樹皮、松葉、水面、石畳などの3x3素材アトラス |
| `public/textures/crystal-emissive-atlas.png` | 水色/紫の発光クリスタル専用テクスチャ |
| `public/textures/mushroom-cap-pink-v2.png` | キノコの傘用の高コントラストなピンク系テクスチャ |
| `public/sprites/player-walk-*/raw-sheet.png` | 8方向それぞれの歩行アニメーション原画 |
| `public/sprites/player-walk-*/sheet-transparent.png` | ゲーム内で使用する透明化済み歩行スプライトシート |
| `public/sprites/player-walk-*/animation.gif` | 各方向の歩行アニメーション確認用GIF |

### プレイヤースプライト

プレイヤーは以下の8方向で生成しています。

- `player-walk-down`
- `player-walk-up`
- `player-walk-left`
- `player-walk-right`
- `player-walk-down-left`
- `player-walk-down-right`
- `player-walk-up-left`
- `player-walk-up-right`

各方向は `2x2` の4フレーム歩行ループです。`$generate2dsprite` の後処理で `#FF00FF` 背景を透明化し、`pipeline-meta.json` で `edge_touch_frames: []` を確認しています。

## 主なファイル構成

```text
mystic-forest-three/
  index.html
  package.json
  src/
    main.ts
    style.css
  public/
    textures/
      mystic-forest-atlas.png
      crystal-emissive-atlas.png
      mushroom-cap-pink-v2.png
    sprites/
      player-walk-down/
      player-walk-up/
      player-walk-left/
      player-walk-right/
      player-walk-down-left/
      player-walk-down-right/
      player-walk-up-left/
      player-walk-up-right/
```

## 検証

以下を確認済みです。

- `npm run build` が成功すること
- `http://127.0.0.1:5173/` でゲームが表示されること
- ブラウザコンソールに実行時エラーが出ないこと
- キー入力でプレイヤーが移動すること
- カメラ角度に応じてプレイヤーの方向スプライトが切り替わること
