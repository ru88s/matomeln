const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/og-image.svg');
const pngPath = path.join(__dirname, '../public/og-image.png');

// SVGファイルを読み込んでPNGに変換
fs.readFile(svgPath, (err, svgBuffer) => {
  if (err) {
    console.error('SVGファイルの読み込みエラー:', err);
    process.exit(1);
  }

  sharp(svgBuffer)
    .resize(1200, 630)
    .png()
    .toFile(pngPath)
    .then(() => {
      console.log('✅ OG画像（PNG）を生成しました:', pngPath);
    })
    .catch((error) => {
      console.error('PNG変換エラー:', error);
      process.exit(1);
    });
});
