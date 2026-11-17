// Menyusun src/index.html dari frontend/* (tanpa dependensi). Jalankan: node scripts/build.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = new URL('../frontend/', import.meta.url);
const read = (f) => readFileSync(new URL(f, dir), 'utf8');
const css = read('style.css') + read('extra.css');
const js = readdirSync(dir).filter((f) => /^\d.*\.js$/.test(f)).sort().map(read).join('\n');
if (js.includes('</script')) throw new Error('JS mengandung </script');
const html = read('shell.html').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
writeFileSync(new URL('../src/index.html', import.meta.url), html);
console.log('src/index.html', html.length, 'bytes');
