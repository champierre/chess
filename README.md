# チェス棋譜ビューワー

チェスの棋譜（PGN形式）をブラウザで再生できるWebアプリケーションです。

## 機能

- PGN形式の棋譜をテキストエリアに入力
- チェスボードでの手順の可視化
- 進行・巻き戻し機能による手順の確認
- レスポンシブデザイン対応

## 使用例

1. テキストエリアにPGN形式の棋譜をペースト
2. 「棋譜を読み込む」ボタンをクリック
3. 「次の手」「前の手」ボタンで手順を確認

## 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/champierre/devin.git
cd devin/chess-viewer

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

## 使用技術

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [chessboard.js](https://chessboardjs.com/)
- [chess.js](https://github.com/jhlywa/chess.js)
- [Tailwind CSS](https://tailwindcss.com/)

## デプロイ

GitHub Actionsを使用して、mainブランチへのプッシュ時に自動的にGitHub Pagesへデプロイされます。

デプロイされたアプリケーションは以下のURLでアクセスできます：
https://champierre.github.io/devin/

## ライセンス

MIT License

## 貢献

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成
