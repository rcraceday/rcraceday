function u16(view, offset) {
  return view.getUint16(offset, true);
}
function u32(view, offset) {
  return view.getUint32(offset, true);
}
function i32(view, offset) {
  return view.getInt32(offset, true);
}

function decodeRk(value) {
  const isInt = value & 0x02;
  const div100 = value & 0x01;
  let num;
  if (isInt) {
    num = (value & 0xfffffffc) >> 2;
    if (num & 0x20000000) num -= 0x40000000;
  } else {
    const buf = new ArrayBuffer(8);
    const out = new DataView(buf);
    out.setUint32(4, value & 0xfffffffc, true);
    num = out.getFloat64(0, true);
  }
  if (div100) num /= 100;
  return num;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

function readFatStream(bytes, sat, start, size, sectorSize) {
  const chunks = [];
  let sid = start;
  let guard = 0;
  while (sid >= 0 && guard++ < 200000) {
    const offset = 512 + sid * sectorSize;
    chunks.push(bytes.subarray(offset, offset + sectorSize));
    sid = i32(sat, sid * 4);
  }
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let pos = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, pos);
    pos += chunk.length;
  });
  return size != null ? out.subarray(0, size) : out;
}

function decodeBiffString(bytes, offset, charCount, compressed) {
  if (compressed) {
    return new TextDecoder("latin1").decode(bytes.subarray(offset, offset + charCount));
  }
  return new TextDecoder("utf-16le").decode(bytes.subarray(offset, offset + charCount * 2));
}

function parseSst(payload) {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const unique = u32(view, 4);
  const strings = [];
  let pos = 8;
  while (pos < payload.length && strings.length < unique) {
    if (pos + 3 > payload.length) break;
    const nch = u16(view, pos);
    const flags = payload[pos + 2];
    pos += 3;
    let rich = 0;
    let asian = 0;
    if (flags & 0x08) {
      rich = u16(view, pos);
      pos += 2;
    }
    if (flags & 0x04) {
      asian = u32(view, pos);
      pos += 4;
    }
    const compressed = (flags & 1) === 0;
    const rawLen = compressed ? nch : nch * 2;
    const text = decodeBiffString(payload, pos, nch, compressed);
    pos += rawLen + rich * 4 + asian;
    strings.push(text);
  }
  return strings;
}

function iterRecords(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const records = [];
  let i = 0;
  while (i + 4 <= bytes.length) {
    const opcode = u16(view, i);
    const length = u16(view, i + 2);
    let payload = bytes.subarray(i + 4, i + 4 + length);
    i += 4 + length;
    while (i + 4 <= bytes.length && u16(view, i) === 0x003c) {
      const clen = u16(view, i + 2);
      const next = bytes.subarray(i + 4, i + 4 + clen);
      const merged = new Uint8Array(payload.length + next.length);
      merged.set(payload, 0);
      merged.set(next, payload.length);
      payload = merged;
      i += 4 + clen;
    }
    records.push({ opcode, payload });
  }
  return records;
}

export function readXlsGrid(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  if (u32(view, 0) !== 0xe011cfd0 || u32(view, 4) !== 0xe11ab1a1) {
    throw new Error("Not a LiveTime .xls workbook. Export Round Results as .xls.");
  }
  const sectorSize = 1 << u16(view, 30);
  const dirFirst = u32(view, 48);
  let msatFirst = i32(view, 68);
  const satIds = [];
  for (let i = 0; i < 109; i += 1) {
    const sid = i32(view, 76 + i * 4);
    if (sid >= 0) satIds.push(sid);
  }
  let hops = 0;
  while (msatFirst >= 0 && hops++ < 50) {
    const offset = 512 + msatFirst * sectorSize;
    const chunk = bytes.subarray(offset, offset + sectorSize);
    const chunkView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    for (let i = 0; i < sectorSize / 4 - 1; i += 1) {
      const sid = i32(chunkView, i * 4);
      if (sid >= 0) satIds.push(sid);
    }
    msatFirst = i32(chunkView, sectorSize - 4);
  }
  const sat = new Uint8Array(satIds.length * sectorSize);
  satIds.forEach((sid, index) => {
    sat.set(bytes.subarray(512 + sid * sectorSize, 512 + sid * sectorSize + sectorSize), index * sectorSize);
  });

  const dirRaw = readFatStream(bytes, new DataView(sat.buffer), dirFirst, null, sectorSize);
  const dirView = new DataView(dirRaw.buffer, dirRaw.byteOffset, dirRaw.byteLength);
  let wbStart = 0;
  let wbSize = dirRaw.length;
  for (let i = 0; i + 128 <= dirRaw.length; i += 128) {
    const nameLen = u16(dirView, i + 64);
    const name = new TextDecoder("utf-16le").decode(dirRaw.subarray(i, i + nameLen)).replace(/\0/g, "");
    if (name.toLowerCase() === "workbook" || name.toLowerCase() === "book") {
      wbStart = i32(dirView, i + 116);
      wbSize = u32(dirView, i + 120);
      break;
    }
  }
  const wb = readFatStream(bytes, new DataView(sat.buffer), wbStart, wbSize, sectorSize);
  const records = iterRecords(wb);
  let sst = [];
  const cells = new Map();
  let maxRow = 0;
  let maxCol = 0;

  const put = (row, col, value) => {
    cells.set(`${row}:${col}`, value);
    maxRow = Math.max(maxRow, row);
    maxCol = Math.max(maxCol, col);
  };

  records.forEach(({ opcode, payload }) => {
    const rec = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    if (opcode === 0x00fc) {
      sst = parseSst(payload);
    } else if (opcode === 0x00fd && payload.length >= 10) {
      const row = u16(rec, 0);
      const col = u16(rec, 2);
      const idx = u32(rec, 6);
      put(row, col, sst[idx] || "");
    } else if (opcode === 0x0204 && payload.length >= 8) {
      const row = u16(rec, 0);
      const col = u16(rec, 2);
      const nch = u16(rec, 6);
      let text = "";
      if (payload.length > 8 && (payload[8] === 0 || payload[8] === 1)) {
        text = decodeBiffString(payload, 9, nch, payload[8] === 0);
      } else {
        text = decodeBiffString(payload, 8, nch, true);
      }
      put(row, col, text);
    } else if (opcode === 0x0203 && payload.length >= 14) {
      const row = u16(rec, 0);
      const col = u16(rec, 2);
      put(row, col, formatNumber(rec.getFloat64(6, true)));
    } else if (opcode === 0x027e && payload.length >= 10) {
      const row = u16(rec, 0);
      const col = u16(rec, 2);
      put(row, col, formatNumber(decodeRk(u32(rec, 6))));
    }
  });

  const rows = [];
  for (let r = 0; r <= maxRow; r += 1) {
    const row = [];
    for (let c = 0; c <= maxCol; c += 1) {
      row.push(cells.get(`${r}:${c}`) || "");
    }
    rows.push(row);
  }
  return rows;
}

export async function readSpreadsheetGrid(file) {
  const name = (file?.name || "").toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith(".csv")) {
    const text = new TextDecoder("utf-8").decode(buffer);
    return text.split(/\r?\n/).map((line) => line.split(","));
  }
  return readXlsGrid(buffer);
}
