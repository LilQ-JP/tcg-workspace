# デプロイ手順書 (Deployment Guide)

このプロジェクトは GitHub Actions を使用して GitHub Pages に自動デプロイされるように設定されています。

## 自動デプロイの手順

1.  **変更をコミットしてプッシュする**
    `main` ブランチに変更をプッシュすると、GitHub Actions が自動的に起動します。
    ```bash
    git add .
    git commit -m "Description of changes"
    git push origin main
    ```

2.  **デプロイ状況を確認する**
    GitHub リポジトリの [Actions] タブから "Deploy to GitHub Pages" ワークフローの進行状況を確認できます。

3.  **公開先を確認する**
    デプロイが完了すると、以下の URL でアプリが公開されます。
    - URL: [https://lilq-jp.github.io/tcg-workspace/](https://lilq-jp.github.io/tcg-workspace/)

## ローカルでのデプロイ（手動）

もし GitHub Actions を使用せずにローカルから手動でデプロイしたい場合は、以下のコマンドを使用します。

```bash
npm run deploy
```
※ このコマンドは内部的に `npm run build` を実行した後、`gh-pages` パッケージを使用して `dist` フォルダの内容を `gh-pages` ブランチにプッシュします。

## 注意事項

- **Vite のベースパス**: `vite.config.js` の `base` 設定が `'./'` になっていることを確認してください。これは GitHub Pages でアセットを正しく読み込むために必要です。
- **PWA 設定**: `public/manifest-v2.json` などが更新された場合、ブラウザのキャッシュにより反映に時間がかかる場合があります。
