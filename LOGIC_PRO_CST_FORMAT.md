# Chunk Format Overview

This document summarizes the structure of a “UCuA” chunk, including the fixed header, the extended header fields (where `dataOffset` is a variable‐length ULEB128), and the exact start of the payload. Code samples (both C/C++ style definitions and a JavaScript parser snippet) illustrate how to read each section.

---

## 1. Chunk Layout

A chunk is laid out as three logical regions:

1. **Minimal Header** (bytes 0–35)
2. **Extended Header** (bytes 36–`dataOffset`–1)
3. **Payload** (bytes `dataOffset`…end)

```
+----------------------+-----------------------------+-------------+
| Minimal Header (36)  | Extended Header (var-len)   | Payload     |
+----------------------+-----------------------------+-------------+
| 0x00             0x23 | 0x24                   0x(dataOffset−1) | 0x(dataOffset) … |
```

> **Note**: The **Payload** region does _not_ include the `dataOffset`, `gridX`, `gridY`, or `patternID` fields (or any other extended-header fields). It begins immediately at the byte offset value decoded from the ULEB128 `dataOffset`.

---

## 2. C/C++‐Style Definitions

```c
// Minimal header (fixed 36 bytes)
struct ChunkMinimalHeader {
  uint32_t magic;          // 'UCuA' = 0x41754355
  uint16_t version;        // format version (e.g. 2)
  uint16_t headerLength;   // often 14
  uint16_t length1;        // reserved (0)
  uint16_t dataOffsetMin;  // 36 = size of minimal header
  uint32_t reserved0;      // always 0
  uint32_t reserved1;      // always 0
  uint32_t chunkFlags;     // flags or type bitmask
  uint32_t subChunkCount;  // number of sub-chunks
  uint16_t instanceLo;     // instance low word
  uint16_t instanceHi;     // instance high word
};

// Extended header (starts at byte 36)
// NOTE: dataOffset is stored as *unsigned LEB128*, not a fixed 32‐bit LE field.
struct ChunkExtendedHeader {
  // At offset 0x24 from chunk base:
  //   varint ULEB128 for payload start (absolute offset from chunk start)
  uint8_t  dataOffsetVarLen[];

  // Immediately following dataOffsetVarLen:
  uint16_t gridX;          // number of grid columns (LE)
  uint16_t gridY;          // number of grid rows (LE)
  uint32_t patternID;      // pattern/template identifier (LE)

  // …followed by reserved parameters (ints/floats)
  // …then null-terminated ASCII labels
};

// Payload begins exactly at byte offset = decoded dataOffset
```

---

## 3. Field‐by‐Field Breakdown

|                    Location |        Size | Field           | Description                                                  |
| --------------------------: | ----------: | --------------- | ------------------------------------------------------------ |
|                   0x00–0x03 |           4 | magic           | ASCII “UCuA”                                                 |
|                   0x04–0x05 |           2 | version         | format version                                               |
|                   0x06–0x07 |           2 | headerLength    | minimal header length                                        |
|                   0x08–0x09 |           2 | length1         | reserved (0)                                                 |
|                   0x0A–0x0B |           2 | dataOffsetMin   | 36 = size of minimal header                                  |
|                   0x0C–0x13 |           8 | reserved0/1     | always zero                                                  |
|                   0x14–0x17 |           4 | chunkFlags      | flags or type bitmask                                        |
|                   0x18–0x1B |           4 | subChunkCount   | number of contained sub-chunks                               |
|                   0x1C–0x1D |           2 | instanceLo      | instance ID low word                                         |
|                   0x1E–0x1F |           2 | instanceHi      | instance ID high word                                        |
|                   0x20–0x23 |           4 | _unused_        | reserved                                                     |
|                   **0x24…** | **var-len** | **dataOffset**  | **ULEB128 varint: absolute payload start (from chunk base)** |
| **…0x(dataOffsetVarLen+1)** |       **2** | **gridX**       | **grid columns (uint16 LE)**                                 |
|                     **…+2** |       **2** | **gridY**       | **grid rows (uint16 LE)**                                    |
|                     **…+4** |       **4** | **patternID**   | **pattern/template identifier (uint32 LE)**                  |
|                   following |         var | reserved+labels | floats/ints, then null-terminated ASCII labels               |
|         **0x(dataOffset)**… |         var | **Payload**     | **begins here; excludes all header fields above**            |

---

## 4. JavaScript Parsing Example

```js
/**
 * Read an unsigned LEB128 from `buffer` at `offset`.
 * Returns an object { value, length }, where `length` is
 * the number of bytes consumed by the varint.
 */
function readULEB128(buffer, offset) {
    let result = 0,
        shift = 0,
        pos = offset
    while (true) {
        const byte = buffer[pos++]
        result |= (byte & 0x7f) << shift
        if ((byte & 0x80) === 0) break
        shift += 7
    }
    return { value: result, length: pos - offset }
}

class ChunkReader {
    constructor(buffer, start) {
        this.buf = buffer
        this.start = start
    }

    parse() {
        // 1) Skip minimal header (36 bytes)
        const dataOffsetMin = 36

        // 2) Read ULEB128 dataOffset at offset 0x24
        const { value: dataOffset, length: lebLen } = readULEB128(
            this.buf,
            this.start + 0x24
        )

        // 3) Read grid & pattern immediately after the varint
        const metaBase = this.start + 0x24 + lebLen
        const gridX = this.buf.readUInt16LE(metaBase + 0)
        const gridY = this.buf.readUInt16LE(metaBase + 2)
        const patternID = this.buf.readUInt32LE(metaBase + 4)

        // 4) Slice out payload (excludes all header fields)
        const payload = this.buf.slice(this.start + dataOffset)

        return { dataOffset, gridX, gridY, patternID, payload }
    }
}

// Usage:
const reader = new ChunkReader(buffer, chunkStart)
const { dataOffset, gridX, gridY, patternID, payload } = reader.parse()
console.log({ dataOffset, gridX, gridY, patternID, payload })
```

---

## 5. Key Takeaways

-   **dataOffset** (at 0x24) is stored as a **ULEB128** varint, not a fixed 32-bit LE.
-   After decoding `dataOffset`, you immediately read **gridX**, **gridY**, and **patternID**.
-   **Payload** region begins exactly at `chunkStart + dataOffset` and excludes _all_ header fields.
-   Treat byte range `[0, dataOffset−1]` as metadata; slice at `dataOffset` to extract the real data.
