// Packages the built game (dist/) as a SCORM 1.2 zip ready to upload to an LMS such as TalentLMS.
// Run with `npm run package` (which builds first). Output: release/hc-plant-tour-scorm-<version>.zip
//
// The zip has imsmanifest.xml at its root next to index.html and assets/, as SCORM requires.
// No zip dependency: a minimal writer using Node's built-in zlib.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const COURSE_ID = 'hc-plant-tour';
const COURSE_TITLE = 'ქარხნის ტური — უსაფრთხოების ტრენინგი';

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found. Run `npm run build` first (or use `npm run package`).');
  process.exit(1);
}

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(relative(dist, full).split(sep).join('/'));
  }
  return out;
}

const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- manifest ---------------------------------------------------------------
const gameFiles = listFiles(dist).filter((f) => f !== 'imsmanifest.xml');
const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${COURSE_ID}-${pkg.version}" version="${pkg.version}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>${xml(COURSE_TITLE)}</title>
      <item identifier="item" identifierref="game" isvisible="true">
        <title>${xml(COURSE_TITLE)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="game" type="webcontent" adlcp:scormtype="sco" href="index.html">
${gameFiles.map((f) => `      <file href="${xml(f)}"/>`).join('\n')}
    </resource>
  </resources>
</manifest>
`;
writeFileSync(join(dist, 'imsmanifest.xml'), manifest);

// ---- zip ----------------------------------------------------------------------
function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function zip(entries) {
  const { time, date } = dosDateTime(new Date());
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const body = useDeflate ? deflated : data;
    const crc = crc32(data);
    const method = useDeflate ? 8 : 0;
    const flags = 0x0800; // UTF-8 file names

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, body);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

const files = ['imsmanifest.xml', ...gameFiles];
const out = join(root, 'release', `${COURSE_ID}-scorm-${pkg.version}.zip`);
mkdirSync(join(root, 'release'), { recursive: true });
const buf = zip(files.map((name) => ({ name, data: readFileSync(join(dist, name)) })));
writeFileSync(out, buf);
console.log(`SCORM 1.2 package: ${relative(root, out)} (${files.length} files, ${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
