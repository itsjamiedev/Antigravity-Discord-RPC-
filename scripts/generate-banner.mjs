import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) | 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowStride);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const ny = y / height;
      let r = 8 + Math.floor(ny * 6);
      let g = 8 + Math.floor(ny * 6);
      let b = 12 + Math.floor(ny * 8);

      const distLime = Math.hypot(x - 260, y - 160);
      if (distLime < 380) {
        const factor = Math.cos((distLime / 380) * (Math.PI / 2));
        r += Math.floor(232 * factor * 0.18);
        g += Math.floor(255 * factor * 0.18);
        b += Math.floor(31 * factor * 0.18);
      }

      const distBlurple = Math.hypot(x - 940, y - 180);
      if (distBlurple < 420) {
        const factor = Math.cos((distBlurple / 420) * (Math.PI / 2));
        r += Math.floor(88 * factor * 0.22);
        g += Math.floor(101 * factor * 0.22);
        b += Math.floor(242 * factor * 0.22);
      }

      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        r = Math.min(255, r + 40);
        g = Math.min(255, g + 40);
        b = Math.min(255, b + 50);
      }

      rawData[pxOffset] = Math.min(255, r);
      rawData[pxOffset + 1] = Math.min(255, g);
      rawData[pxOffset + 2] = Math.min(255, b);
      rawData[pxOffset + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const dirGithub = path.join(process.cwd(), '.github', 'assets');
const dirResources = path.join(process.cwd(), 'resources');
fs.mkdirSync(dirGithub, { recursive: true });
fs.mkdirSync(dirResources, { recursive: true });

const pngBuffer = createPng(1200, 380);
fs.writeFileSync(path.join(dirGithub, 'banner.png'), pngBuffer);
fs.writeFileSync(path.join(dirResources, 'banner.png'), pngBuffer);
console.log('Successfully generated banner.png (1200x380) in .github/assets and resources!');
