#!/usr/bin/env node
/**
 * Builds the "READY TO GO" delivery folder from this repository:
 *   static-website/                 index.html + assets (works on any static host)
 *   wordpress-theme/frosty-foods/   the WordPress theme (index.php generated from index.html)
 *   frosty-foods-wordpress-theme.zip  upload in WordPress › Appearance › Themes › Add New › Upload
 *
 * Usage:  node tools/build-ready-to-go.js "<output folder>"
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(SRC, '..', 'READY TO GO'));
const THEME_SLUG = 'frosty-foods';
const VERSION = '1.0.0';

const rm = p => fs.rmSync(p, { recursive: true, force: true });
const mk = p => fs.mkdirSync(p, { recursive: true });
function copyDir(from, to) {
  mk(to);
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name), b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}
function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listFiles(p, base) : [path.relative(base, p).split(path.sep).join('/')];
  });
}

/* ---------------- static website ---------------- */
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
const STATIC = path.join(OUT, 'static-website');
rm(STATIC); mk(STATIC);
fs.writeFileSync(path.join(STATIC, 'index.html'), html);
copyDir(path.join(SRC, 'assets'), path.join(STATIC, 'assets'));

/* ---------------- WordPress theme ---------------- */
const THEME = path.join(OUT, 'wordpress-theme', THEME_SLUG);
rm(path.join(OUT, 'wordpress-theme')); mk(THEME);
copyDir(path.join(SRC, 'assets'), path.join(THEME, 'assets'));
fs.copyFileSync(path.join(SRC, 'wordpress', 'functions.php'), path.join(THEME, 'functions.php'));
fs.copyFileSync(path.join(SRC, 'wordpress', 'screenshot.png'), path.join(THEME, 'screenshot.png'));

fs.writeFileSync(path.join(THEME, 'style.css'), `/*
Theme Name: Frosty Foods
Theme URI: https://www.frosty-foods.com/
Author: Mohamed Tarek
Description: Bilingual (English / Arabic) B2B website for Frosty Foods — IQF fruits & vegetables — with a built-in dashboard: every text, image, colour, font, product, list, section and SEO field is editable from the site footer (Dashboard · لوحة التحكم, default code 2026).
Version: ${VERSION}
Requires at least: 5.8
Requires PHP: 7.4
License: Proprietary — for Frosty Foods
Text Domain: frosty-foods
Tags: one-column, rtl-language-support, translation-ready, custom-colors
*/

/* The site styles are inlined in index.php for a fast first paint; the dashboard styles live in assets/cms/cms.css. */
`);

if (html.includes('<?')) throw new Error('index.html contains "<?" which would break PHP');
const desc = (html.match(/<meta name="description" id="metaDesc" content="([^"]*)"/) || [])[1] || '';
const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1].replace(/&amp;/g, '&');
const phpStr = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

let php = html;
const need = (a) => { if (!php.includes(a)) throw new Error('marker not found: ' + a); };
need('<script>window.FROSTY_BASE=window.FROSTY_BASE||"";</script>');
php = php.replace('<script>window.FROSTY_BASE=window.FROSTY_BASE||"";</script>',
  `<script>window.FROSTY_BASE=<?php echo wp_json_encode( $frosty_base ); ?>;window.FROSTY_WP=<?php echo wp_json_encode( array( 'rest' => esc_url_raw( rest_url( 'frosty/v1/' ) ), 'content' => (object) $frosty_content ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?>;</script>`);
php = php.replace(/<title>[\s\S]*?<\/title>/, '<title><?php echo esc_html( $frosty_title ); ?></title>');
php = php.replace(/(<meta name="description" id="metaDesc" content=")[^"]*(")/, '$1<?php echo esc_attr( $frosty_desc ); ?>$2');
php = php.replace(/(\s(?:src|href|poster)=")assets\//g, '$1<?php echo $frosty_assets; ?>');
php = php.replace(/url\(assets\//g, 'url(<?php echo $frosty_assets; ?>');
need('</head>'); php = php.replace('</head>', '<?php wp_head(); ?>\n</head>');
need('<body>'); php = php.replace('<body>', "<body>\n<?php if ( function_exists( 'wp_body_open' ) ) { wp_body_open(); } ?>");
const lastBody = php.lastIndexOf('</body>');
php = php.slice(0, lastBody) + '<?php wp_footer(); ?>\n' + php.slice(lastBody);

php = `<?php
/**
 * Front template — the complete Frosty Foods website.
 * Content, design and SEO come from the built-in dashboard (option "frosty_content").
 *
 * @package Frosty_Foods
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
$frosty_content = frosty_get_content();
$frosty_seo     = ( isset( $frosty_content['seo'] ) && is_array( $frosty_content['seo'] ) ) ? $frosty_content['seo'] : array();
$frosty_title   = ! empty( $frosty_seo['titleEn'] ) ? $frosty_seo['titleEn'] : ${phpStr(title)};
$frosty_desc    = ! empty( $frosty_seo['descEn'] ) ? $frosty_seo['descEn'] : ${phpStr(desc)};
$frosty_base    = trailingslashit( get_template_directory_uri() );
$frosty_assets  = esc_url( $frosty_base . 'assets/' );
?>` + php;
fs.writeFileSync(path.join(THEME, 'index.php'), php);

fs.writeFileSync(path.join(THEME, 'readme.txt'), `=== Frosty Foods ===
Version: ${VERSION}

Bilingual B2B website for Frosty Foods with a built-in dashboard.

= Dashboard =
Open the website, scroll to the footer and click "Dashboard · لوحة التحكم" (or add #dashboard to the address).
Default access code: 2026 — change it from the dashboard (SEO & settings tab).
Forgot the code? WordPress admin › Appearance › Frosty Dashboard › Reset the code.

= Where content is stored =
wp_options › frosty_content (JSON). Uploaded images/videos go to the Media Library.
`);

/* ---------------- zip (forward-slash paths, works on every server) ---------------- */
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zipDir(dir, rootName, outFile) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const locals = [], centrals = []; let offset = 0;
  for (const rel of listFiles(dir)) {
    const name = Buffer.from(rootName + '/' + rel, 'utf8');
    const data = fs.readFileSync(path.join(dir, rel));
    const def = zlib.deflateRawSync(data, { level: 9 });
    const store = def.length >= data.length;
    const body = store ? data : def, method = store ? 0 : 8, crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
    lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(body.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    locals.push(lh, name, body);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(0x0314, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
    ch.writeUInt16LE(dosTime, 12); ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(body.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
    ch.writeUInt32LE((0o100644 << 16) >>> 0, 38); ch.writeUInt32LE(offset, 42);
    centrals.push(ch, name);
    offset += lh.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals), count = centrals.length / 2;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(outFile, Buffer.concat([...locals, cd, end]));
  return count;
}
const zipPath = path.join(OUT, 'frosty-foods-wordpress-theme.zip');
const n = zipDir(THEME, THEME_SLUG, zipPath);
console.log(`static-website: ${listFiles(STATIC).length} files`);
console.log(`wordpress theme: ${listFiles(THEME).length} files → ${path.basename(zipPath)} (${(fs.statSync(zipPath).size / 1048576).toFixed(1)} MB, ${n} entries)`);
