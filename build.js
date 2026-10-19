const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.copyFileSync(
  path.join(__dirname, 'lstm-forecast-example.html'),
  path.join(distDir, 'lstm-forecast-example.html')
);

// The screener site is the home page; the old forecast page lives at /forecast.html
fs.copyFileSync(path.join(__dirname, 'site.html'), path.join(distDir, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'lstm-forecast-example.html'), path.join(distDir, 'forecast.html'));

console.log('Build complete: frontend files copied to dist/');
