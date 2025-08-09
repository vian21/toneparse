# Logic Pro CST Format Documentation

This document outlines the structure and parsing methodology for Logic Pro Channel Strip Settings (CST) files as implemented in the LogicProCSTParser.

## File Format Overview

Logic Pro CST files (`.cst`) are binary files with the following characteristics:

-   **Magic Numbers**: Files typically contain chunks that start with `OCuA` or `UCuA` markers
-   **Endianness**: Little endian encoding for most values
-   **String Encoding**: Strings are null-terminated
-   **Special Case**: Some strings are inverted (keys)

## Chunk Structure

Each chunk in a CST file has a three-part structure:

1. **Minimal Header** (bytes 0-35)
    - Contains magic number, version, flags, and basic metadata
2. **Extended Header** (bytes 36-dataOffset-1)
    - Contains ULEB128-encoded dataOffset (variable length)
    - Includes gridX, gridY, and patternID values
    - May contain reserved parameters and label strings
3. **Payload** (bytes dataOffset to end)
    - Contains the actual parameter data

### Minimal Header Fields

| Location  | Size | Field         | Description                    |
| --------- | ---- | ------------- | ------------------------------ |
| 0x00-0x03 | 4    | magic         | ASCII "UCuA" or "OCuA"         |
| 0x04-0x05 | 2    | version       | Format version                 |
| 0x06-0x07 | 2    | headerLength  | Minimal header length          |
| 0x08-0x09 | 2    | length1       | Reserved (0)                   |
| 0x0A-0x0B | 2    | dataOffsetMin | 36 = size of minimal header    |
| 0x0C-0x13 | 8    | reserved0/1   | Always zero                    |
| 0x14-0x17 | 4    | chunkFlags    | Flags or type bitmask          |
| 0x18-0x1B | 4    | subChunkCount | Number of contained sub-chunks |
| 0x1C-0x1D | 2    | instanceLo    | Instance ID low word           |
| 0x1E-0x1F | 2    | instanceHi    | Instance ID high word          |

### Extended Header Fields

| Location     | Size    | Field           | Description                                    |
| ------------ | ------- | --------------- | ---------------------------------------------- |
| 0x24...      | var-len | dataOffset      | ULEB128 varint: absolute payload start         |
| ...following | 2       | gridX           | Grid columns (uint16 LE)                       |
| ...+2        | 2       | gridY           | Grid rows (uint16 LE)                          |
| ...+4        | 4       | patternID       | Pattern/template identifier (uint32 LE)        |
| following    | var     | reserved+labels | Floats/ints, then null-terminated ASCII labels |

## Parameter Encoding

Plugin parameters are stored in a binary format with these characteristics:

1. Parameters appear to be stored as 4-byte values
2. The parser employs heuristics to determine the most likely encoding:
    - Some values are interpreted as float32
    - Some may be raw bytes (0-255) needing scaling to engineering units
    - Some are encoded as special patterns with primary byte extraction

## Plugin Parameter Mapping

The parser uses a sophisticated approach to map raw values to meaningful parameters:

1. **Plugin Detection**: Infers plugin type from strings and known patterns
2. **Parameter Definition Lookup**: Uses CSParameterOrder.plist.xml files to map indexes to parameter names
3. **Value Scaling**: Applies appropriate scaling factors based on parameter type:
    - Frequency values using logarithmic scaling (20Hz-20kHz)
    - dB values with appropriate ranges for thresholds, gains
    - Time values (ms) for delay, attack, release
    - Percentages for mix, depth, intensity

## ULEB128 Encoding

ULEB128 (Unsigned Little Endian Base 128) is used for the dataOffset field:

```javascript
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
```

## Output Structure

The parsed preset has the following structure:

```typescript
interface LogicProPreset {
    name: string
    channel_name: string
    audio_units: LogicProAudioUnit[]
}

interface LogicProAudioUnit {
    name: string
    parameters: Record<string, number | string>
}
```

Each audio unit contains a name and parameters with meaningful human-readable values.
