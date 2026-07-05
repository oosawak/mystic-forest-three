# Mystic Forest Three

ローポリボクセル風の神秘の森を探索できる、2.5Dブラウザゲームです。

段差のある森、川、橋、石畳、発光クリスタル、ランタン、キノコや巨木を3Dシーンとして構成しています。
プレイヤーと3人の仲間（companion）はスプライトで表示し、移動方向に応じてアニメーションを切り替えます。

## GitHub Pages

https://miya123123.github.io/mystic-forest-three/

## 起動方法

```sh
npm install
npm run dev
```

起動後、表示されたローカルURLをブラウザで開きます。

## 操作方法

| 操作 | 内容 |
| --- | --- |
| `W` / `A` / `S` / `D` | プレイヤー移動 |
| 矢印キー | プレイヤー移動 |
| マウスドラッグ | マップのカメラ回転 |
| マウスホイール | ズームイン・ズームアウト |

## 特徴

- ボクセル状の地形ブロックを生成し、草地、土、石畳、水面を配置
- 発光する水色/紫のクリスタル、ランタン、キノコ、木、橋をシーン内に配置
- `OrbitControls` でマップを回転可能にし、カメラ方向を元にプレイヤー移動方向を算出
- 移動中のみ歩行アニメーションを再生
- thief / swordsman / wizard の companion が隊列追従
- プレイヤーの足元へ影を追従

## 使用技術

| 技術 | 用途 |
| --- | --- |
| Codex（GPT-5.5）| 実装、README作成 |
| Vite | 開発サーバー、ビルド |
| TypeScript | ゲームロジック、入力処理 |
| Three.js | 3D描画、ジオメトリ、マテリアル、ライティング、カメラ |
| HTML Canvas / WebGL | ブラウザ上でのリアルタイム描画 |

## 使用Codexスキル

| スキル | 用途 |
| --- | --- |
| Image Gen | テクスチャー画像の生成 |
| Generate 2D Sprite | プレイヤー歩行アニメーションの生成、透明PNG化、フレーム分割 |
| Playwright Interactive | テスト |

## Image Genで生成した画像

| 画像ファイル | 用途 |
| --- | --- |
| `public/textures/mystic-forest-atlas.png` | 草地、土、岩、樹皮、松葉、水面、石畳などの3x3素材アトラス |
| `public/textures/crystal-emissive-atlas.png` | 水色/紫の発光クリスタル専用テクスチャ |
| `public/textures/mushroom-cap-pink-v2.png` | キノコの傘用の高コントラストなピンク系テクスチャ |
| `public/sprites/player-walk-*` | 主人公の8方向それぞれの歩行アニメーション |
| `public/sprites/companions` | 仲間キャラクターの4方向それぞれの歩行アニメーション |
