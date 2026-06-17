import { readdir, mkdir } from 'node:fs/promises';
import { join, parse } from 'node:path';
import sharp from 'sharp';

// Optimiza imagenes pesadas a webp redimensionado.
// Uso: node scripts/optimize-images.mjs --in=<dir> --out=<dir> [--width=256] [--match=texto] [--quality=80]

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? true];
  }),
);

const inDir = args.in;
const outDir = args.out;
const width = Number(args.width ?? 256);
const match = typeof args.match === 'string' ? args.match : '';
const quality = Number(args.quality ?? 80);

if (!inDir || !outDir) {
  console.error(
    'Uso: node scripts/optimize-images.mjs --in=<dir> --out=<dir> [--width=256] [--match=texto] [--quality=80]',
  );
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

const files = (await readdir(inDir)).filter(
  (file) => /\.(png|jpe?g|webp)$/i.test(file) && file.includes(match),
);

for (const file of files) {
  const { name } = parse(file);
  const outPath = join(outDir, `${name}.webp`);
  await sharp(join(inDir, file))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(outPath);
  console.log(`optimizado: ${file} -> ${outPath}`);
}

console.log(`Listo: ${files.length} imagenes optimizadas.`);
