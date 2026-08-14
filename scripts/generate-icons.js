/**
 * Simple Icon Generator Script
 * 
 * This script will help you generate PWA icons.
 * 
 * OPTION 1 - Use Online Tool (Recommended):
 * 1. Go to: https://realfavicongenerator.net/
 * 2. Upload: public/icons/icon.svg
 * 3. Download generated icons
 * 4. Extract to: public/icons/
 * 
 * OPTION 2 - Use this script with sharp library:
 * 1. Install: npm install sharp --save-dev
 * 2. Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('\n❌ Error: sharp is not installed\n');
  console.log('To use this script, install sharp:');
  console.log('  npm install sharp --save-dev\n');
  console.log('Or use an online tool instead:');
  console.log('  https://realfavicongenerator.net/\n');
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ Error: icon.svg not found at', svgPath);
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate each size
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('\nGenerated icons in: public/icons/');
  console.log('\nNext steps:');
  console.log('1. Restart your dev server');
  console.log('2. Build for production: npm run build && npm start');
  console.log('3. Test PWA installation\n');
}

generateIcons().catch((error) => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});
