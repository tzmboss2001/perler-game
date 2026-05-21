const textEncoder = new TextEncoder();

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < table.length; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

const DOS_DATE_1980_01_01 = 0x0021;
const DOS_TIME_00_00_00 = 0x0000;

const uint16 = (value) => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
};

const uint32 = (value) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
};

const concatBytes = (parts) => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};

export function buildPaginatedZipFilename({ width, height, timestamp }) {
  return `perler-${width}x${height}-boards-${timestamp}.zip`;
}

export function calculateCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const buildLocalFileHeader = ({ nameBytes, crc32, size }) =>
  concatBytes([
    uint32(0x04034b50),
    uint16(20),
    uint16(0),
    uint16(0),
    uint16(DOS_TIME_00_00_00),
    uint16(DOS_DATE_1980_01_01),
    uint32(crc32),
    uint32(size),
    uint32(size),
    uint16(nameBytes.length),
    uint16(0),
    nameBytes,
  ]);

const buildCentralDirectoryHeader = ({ nameBytes, crc32, size, offset }) =>
  concatBytes([
    uint32(0x02014b50),
    uint16(20),
    uint16(20),
    uint16(0),
    uint16(0),
    uint16(DOS_TIME_00_00_00),
    uint16(DOS_DATE_1980_01_01),
    uint32(crc32),
    uint32(size),
    uint32(size),
    uint16(nameBytes.length),
    uint16(0),
    uint16(0),
    uint16(0),
    uint16(0),
    uint32(0),
    uint32(offset),
    nameBytes,
  ]);

const buildEndOfCentralDirectory = ({
  entryCount,
  centralDirectorySize,
  centralDirectoryOffset,
}) =>
  concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entryCount),
    uint16(entryCount),
    uint32(centralDirectorySize),
    uint32(centralDirectoryOffset),
    uint16(0),
  ]);

export async function createStoredZipBlob(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("导出失败：没有可打包的图纸文件");
  }

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    if (!file?.name || !file?.blob) {
      throw new Error("导出失败：图纸文件信息不完整");
    }

    const nameBytes = textEncoder.encode(file.name);
    const dataBytes = new Uint8Array(await file.blob.arrayBuffer());
    const crc32 = calculateCrc32(dataBytes);
    const size = dataBytes.length;
    const localHeader = buildLocalFileHeader({ nameBytes, crc32, size });
    const centralHeader = buildCentralDirectoryHeader({
      nameBytes,
      crc32,
      size,
      offset,
    });

    localParts.push(localHeader, dataBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = concatBytes(centralParts);
  const eocd = buildEndOfCentralDirectory({
    entryCount: files.length,
    centralDirectorySize: centralDirectory.length,
    centralDirectoryOffset,
  });

  return new Blob([...localParts, centralDirectory, eocd], {
    type: "application/zip",
  });
}
