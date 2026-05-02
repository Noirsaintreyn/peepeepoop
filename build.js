const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

const frontendFiles = [
  'lstm-forecast-example.html',
  'lstm-forecast-frontend.js',
];

for (const file of frontendFiles) {
  fs.copyFileSync(
    path.join(__dirname, file),
    path.join(publicDir, file)
  );
}

// Copy lstm-forecast-example.html as index.html so root URL works
fs.copyFileSync(
  path.join(__dirname, 'lstm-forecast-example.html'),
  path.join(publicDir, 'index.html')
);

console.log('Build complete: frontend files copied to public/');
