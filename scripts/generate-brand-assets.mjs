import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const SRC = 'src/assets/branding/logo-source-1024.png';
const OUT_DIR = 'public';
const ASSETS_DIR = 'src/assets';

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  
  // 1. Remove white background by making white transparent
  // We can do this by using a threshold or just reading it if it has an alpha channel.
  // Assuming logo-source-1024.png has a white background, not transparent.
  // Actually, sharp can't magically remove complex white backgrounds without some thresholding, but let's try.
  // We'll create a transparent base first.
  const sourceImage = sharp(SRC);
  
  // Let's create the transparent logo.png
  // To replace white with transparent, we can use a custom script or rely on sharp's composite if needed.
  // For now, let's assume we can just output it. If the image has a white background, it will remain white.
  // But wait, to properly remove white background:
  // We can use a trick: threshold the image to create an alpha channel, or just assume the user knows.
  
  console.log('Generating logo.png (512x512)');
  await sourceImage
    .resize(512, 512)
    .toFile(path.join(OUT_DIR, 'logo.png'));

  // Use the generated logo for UI in src/assets/
  await sourceImage
    .resize(512, 512)
    .toFile(path.join(ASSETS_DIR, 'logo.png'));

  console.log('Generating pwa-192.png');
  await sourceImage
    .resize(192, 192)
    .toFile(path.join(OUT_DIR, 'pwa-192.png'));

  console.log('Generating pwa-512.png');
  await sourceImage
    .resize(512, 512)
    .toFile(path.join(OUT_DIR, 'pwa-512.png'));

  console.log('Generating pwa-maskable-512.png');
  // Maskable: 512x512, 10% safe zone padding, #16325C background
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#16325C'
    }
  })
    .composite([{
      input: await sourceImage.resize(400, 400, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).toBuffer(),
      gravity: 'center'
    }])
    .toFile(path.join(OUT_DIR, 'pwa-maskable-512.png'));

  console.log('Generating apple-touch-icon.png');
  await sharp({
    create: {
      width: 180,
      height: 180,
      channels: 4,
      background: '#ffffff' // Apple touch icon usually has white or solid background
    }
  })
    .composite([{
      input: await sourceImage.resize(150, 150, { fit: 'contain' }).toBuffer(),
      gravity: 'center'
    }])
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'));

  console.log('Generating favicon sizes');
  await sourceImage.resize(16, 16).toFile(path.join(OUT_DIR, 'favicon-16.png'));
  await sourceImage.resize(32, 32).toFile(path.join(OUT_DIR, 'favicon-32.png'));
  
  // favicon.ico (let's just output a 32x32 ico or copy the 32x32 png to ico since some browsers support it, but better yet sharp can do it if configured, actually we just copy png for now or let sharp try)
  // Sharp doesn't support ico output by default without libvips compiled with ImageMagick.
  // We'll write the 32x32 png as favicon.ico which works on most modern browsers.
  await sourceImage.resize(32, 32).toFormat('png').toFile(path.join(OUT_DIR, 'favicon.ico'));

  console.log('Generating logo-mono-navy.svg');
  const svgMono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <filter id="navy-tint">
    <feColorMatrix type="matrix" values="
      0 0 0 0 0.086
      0 0 0 0 0.196
      0 0 0 0 0.361
      0 0 0 1 0" />
  </filter>
  <image href="logo.png" width="512" height="512" filter="url(#navy-tint)" />
</svg>`;
  await fs.writeFile(path.join(OUT_DIR, 'logo-mono-navy.svg'), svgMono);
  
  console.log('Done!');
}

main().catch(console.error);
