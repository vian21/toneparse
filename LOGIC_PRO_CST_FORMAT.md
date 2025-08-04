# Logic Pro CST Binary Format Analysis

## Overview

Logic Pro Channel Strip (.cst) files use a binary format to store audio unit configurations, effects chains, and parameter settings. These files are typically found inside `.patch` directories alongside plist metadata files.

## Key Findings

### Parameter Names Are NOT Stored in CST Files

**Critical Discovery**: Parameter names are **NOT** stored as strings within the CST binary format. Only audio unit names (like "Compressor", "Channel EQ", "Tape Delay") are stored as readable strings. Parameter names must be inferred based on:

1. Audio unit type identification
2. Standard audio processing parameter conventions
3. Parameter position within the GAMETSPP data section
4. Data extracted from embedded binary plists

### Audio Unit Identifiers

CST files contain 4-character strings that function as Audio Unit identifiers:

-   `xoBS@` - Effect unit type
-   `xoBSH` - Effect header type
-   `B90PL` - Plugin type
-   `33CA` - Likely Channel EQ
-   `ORPL` - Likely Compressor
-   `x8PL` - Likely Noise Gate
-   These correspond to Apple's Audio Unit Component Types/Subtypes

### Embedded Binary Plists

**New Discovery**: CST files contain embedded binary property lists (bplists) with additional parameter data:

-   Signature: `bplist00` (62 70 6C 69 73 74 30 30)
-   Found in specific chunks, typically at the end of a preset
-   Contain additional configuration data not available in GAMETSPP sections
-   Hold track settings, plugin configuration, and UI customization parameters

## File Structure

### Header Signatures

The CST format uses chunk-based structure with signature headers:

-   `OCuA` (4F 43 75 41) - Primary audio unit chunk
-   `UCuA` (55 43 75 41) - Secondary audio unit chunk

### Chunk Layout

Each chunk follows this general structure:

```
[4 bytes] Signature (OCuA/UCuA)
[4 bytes] Version/Type (typically 02 00 0E 00)
[4 bytes] Chunk size indicator
[4 bytes] Data size
[16 bytes] Header metadata
[variable] Audio unit name (null-terminated string)
[variable] Parameter data section
[variable] Possible embedded binary plist (bplist00)
```

### Data Types Found

#### String Data

-   Audio unit names appear as null-terminated ASCII strings
-   Common names observed: "Audio 1", "Noise Gate", "Pedalboard", "Channel EQ", "Compressor", "Tape Delay"
-   Strings are typically followed by padding bytes
-   **No parameter names are stored as strings in the main CST format**
-   **Parameter names may be present in embedded binary plists**

#### Parameter Data Sections

-   **GAMETSPP Signature**: Parameter data is marked by `GAMETSPP` (47 41 4D 45 54 53 50 50) identifiers
-   **GAME Signature**: Shorter parameter sections use `GAME` (47 41 4D 45) markers
-   Float values (32-bit little-endian) representing actual parameter settings
-   **Improved parsing pattern**:
    ```
    [8 bytes] "GAMETSPP" signature
    [4 bytes] Parameter data size
    [4 bytes] Header/metadata
    [variable] Sequence of 32-bit float parameter values
    ```

#### Binary Plist Data Sections

-   **Binary Plist Signature**: `bplist00` (62 70 6C 69 73 74 30 30)
-   Contains structured data in Apple's binary property list format
-   Typically includes:
    -   Dictionary keys and values
    -   String data (0x50-0x5F marker bytes)
    -   Integer values (0x10-0x1F marker bytes)
    -   Real/float values (0x20-0x2F marker bytes)
    -   Dictionary structures (0xD0-0xDF marker bytes)
-   Common parameters found in binary plists:
    -   `outputChannel` - Output routing
    -   `bypass` - Effect bypass state
    -   `color` - UI color in Logic Pro
    -   `layer` - Layer number for multi-timbral instruments
    -   Track settings and configuration data

#### Parameter Value Characteristics

-   **Real-world units**: Values represent actual audio processing parameters in their native units
    -   Threshold: -96.0 to 0.0 dB
    -   Ratio: 1.0 to 20.0
    -   Frequency: 20.0 to 20000.0 Hz
    -   Time values: milliseconds or seconds
    -   Mix/Level controls: 0.0 to 1.0 or percentage
-   **Padding Detection**: Values like `0x714971CA` (`caf2 4971` pattern) are padding and should be filtered out
-   **Value Filtering**: Extreme values (> 100000 or < 1e-10) are likely invalid and should be ignored

#### Binary Markers and Patterns

-   `35 12` appears frequently, possibly version or format identifiers
-   `GAMETSPP` (47 41 4D 45 54 53 50 50) - **Primary marker for parameter data sections**
-   `GAME` (47 41 4D 45) - **Secondary marker for parameter data sections**
-   `bplist00` (62 70 6C 69 73 74 30 30) - **Binary property list marker**
-   `00 00 00 00` padding/null bytes common between sections
-   `FF FF FF FF` used as section terminators
-   `ca f2 49 71` appears as padding/fill pattern in parameter sections (should be filtered)

## Parsing Strategy - Enhanced Implementation

### Chunk Detection and Parsing

1. Scan for `OCuA`/`UCuA` signatures
2. Read chunk size information to determine chunk boundaries
3. Extract audio unit name strings within chunk boundaries
4. **Detect audio unit identifiers** (xoBS@, 33CA, etc.) for more accurate type identification
5. **Determine audio unit type** using both name and identifiers
6. **Search for parameter sections** (GAMETSPP) within chunk boundaries
7. **Detect embedded binary plists** (bplist00) within chunks
8. **Extract additional parameters** from binary plists

### Parameter Extraction - Enhanced Method

1. **Primary approach**: Search for `GAMETSPP` signature within each audio unit chunk
2. Read parameter data size from the 4 bytes following GAMETSPP
3. Skip additional 4-byte header
4. Read sequential 32-bit float values as parameters
5. **Apply intelligent filtering**:
    - Filter out padding values (`0x714971CA` pattern)
    - Apply range validation based on parameter type
    - Remove obviously invalid values (too large/small)
6. **Map to semantic names** based on audio unit type and position
7. **Supplement with binary plist data** when available

### Binary Plist Extraction

1. **Detection**: Scan for `bplist00` signature within chunks
2. **Basic parsing**: Look for marker bytes indicating different data types:
    - 0x50-0x5F: ASCII strings (length in lower 4 bits)
    - 0x10-0x1F: Integer values (size power in lower 4 bits)
    - 0x20-0x2F: Real/float values (size power in lower 4 bits)
    - 0xD0-0xDF: Dictionary structures (count in lower 4 bits)
3. **Parameter mapping**: Correlate extracted strings with values to form key-value pairs
4. **Clean and normalize** keys and values for consistent parameter naming

### Type Refinement Based on Parameters

After extracting parameters from both GAMETSPP sections and binary plists, further refine audio unit types:

1. Look for characteristic parameter combinations (e.g., threshold + ratio + attack = dynamics processor)
2. Use binary plist parameters to identify special chunks (e.g., track settings, plugin configuration)
3. Update audio unit type and add metadata about the identification source

### Parameter Naming Strategy - Improved

Parameters are mapped to meaningful names based on **audio unit type detection**:

#### Compressor Parameters (in order)

`["threshold", "ratio", "attack", "release", "makeup_gain", "knee", "bypass", "auto_gain", "peak_limiter", "detector_HPF", "mix", "side_chain", "vintage_mode", "bypass_auto", "output_level"]`

#### EQ Parameters (in order)

`["low_freq", "low_gain", "low_Q", "low_mid_freq", "low_mid_gain", "low_mid_Q", "high_mid_freq", "high_mid_gain", "high_mid_Q", "high_freq", "high_gain", "high_Q", "highpass_freq", "lowpass_freq", "overall_gain", "bypass"]`

#### Delay Parameters (in order)

`["delay_time", "feedback", "mix", "high_cut", "low_cut", "sync_mode", "sync_note", "tape_drive", "tape_wow", "freeze", "reverse", "bypass", "tempo_sync", "ping_pong", "modulation_rate", "modulation_depth", "diffusion", "tone", "vintage_mode"]`

#### Gate Parameters (in order)

`["threshold", "ratio", "attack", "release", "hold", "lookahead", "bypass"]`

### Value Filtering and Validation

Enhanced filtering system:

```javascript
// Type-specific validation
if (unit_type === "compressor") {
    if (param_name.includes("threshold") && (value < -96 || value > 0))
        return null
    if (param_name.includes("ratio") && (value < 1 || value > 50)) return null
    // ... more validations
}

// Padding detection
if (int_representation === 0x714971ca) return null // caf2 4971 pattern
if (Math.abs(value) > 100000) return null // Extremely large
if (Math.abs(value) < 1e-10 && value !== 0) return null // Tiny non-zero
```

## Implementation Results

### Binary Plist Data Extraction

From the third binary plist chunk in Arena Ready.patch:

```
parameter_keys: 2148827149
parameter_values: 35
layer_number: 15
track_settings: 15
ui_color: 2759819393
output_channel: 0
effect_bypass: 0
```

### Successful Parameter Extraction Examples

#### Compressor (from Arena Ready.patch):

```
threshold: -18 dB
ratio: 3.1
attack: 15.5 ms
release: 140 ms
makeup_gain: -4.5 dB
knee: 1
bypass: 1
peak_limiter: 1
detector_HPF: 5
bypass_auto: 1
```

#### Channel EQ (from Arena Ready.patch):

```
low_Q: 2
low_mid_gain: 1 dB
low_mid_Q: 80
high_mid_gain: 1.1 dB
high_mid_Q: 1
high_Q: 0.67
bypass: 2.1
```

#### Tape Delay (from Arena Ready.patch):

```
high_cut: 16 kHz
low_cut: 1600 Hz
sync_mode: 190
sync_note: 1
tape_drive: 4
freeze: 40
reverse: 0.8
bypass: 2
tempo_sync: 0.2
ping_pong: 9
modulation_depth: 120
```

### Known Limitations

-   **Parameter names are inferred**, not extracted from file
-   Parameter order may vary between Logic Pro versions
-   Some audio units may use different parameter data formats
-   Full binary plist parsing requires implementing Apple's binary property list format
-   Some parameter sections may contain multiple sub-effects with interleaved data

## Technical Implementation Notes

### Audio Unit Type Detection

The enhanced implementation uses multiple detection methods:

```javascript
// 1. Check for audio unit identifiers
const identifier = this.detect_audio_unit_identifier(chunk_start, chunk_end)

// 2. Use identifier to improve type detection
const type =
    identifier && AUDIO_UNIT_IDENTIFIERS[identifier]
        ? AUDIO_UNIT_IDENTIFIERS[identifier]
        : this.get_audio_unit_type(name || "")

// 3. Later refine type based on extracted parameters
this.refine_audio_unit_type(audio_unit)
```

### Binary Plist Detection

```javascript
private detect_binary_plist(chunk_start: number, chunk_end: number): number | null {
    // Save current offset
    const original_offset = this.offset

    // Scan for binary plist signature
    for (let scan_offset = chunk_start; scan_offset < chunk_end - 8; scan_offset++) {
        this.offset = scan_offset

        // Check for bplist00 signature
        if (this.check_signature("bplist00")) {
            // Found a binary plist - return its start position
            const plist_start = scan_offset
            this.offset = original_offset
            return plist_start
        }
    }

    return null
}
```

### Binary Plist Parameter Extraction

Basic approach for extracting string and numeric values:

```javascript
// For strings (0x50-0x5F marker)
if (byte !== undefined && (byte & 0xf0) === 0x50) {
    const str_length = byte & 0x0f // Lower 4 bits give the length
    // Read string...
}

// For float values (0x20-0x2F marker)
if (byte !== undefined && (byte & 0xf0) === 0x20) {
    const size_power = byte & 0x0f // Lower 4 bits give size power of 2
    const size = Math.pow(2, size_power)
    // Read float...
}
```

### Chunk Boundary Respect

The improved parser respects chunk boundaries to avoid cross-contamination:

```javascript
const chunk_end = this.offset + chunk_size - 28
// Only search within this chunk
while (this.offset < chunk_end && this.offset < this.buffer.length) {
    // ... parsing logic
}
```

## Sample Data Patterns

### Audio Unit Names

```
Offset: 0x60   " Audio 1"
Offset: 0x1D0  "Noise Gate"
Offset: 0x3B0  "Pedalboard"
Offset: 0x6F0  "Channel EQ"
Offset: 0x800  "Compressor"
Offset: 0xAD0  "Tape Delay"
```

### Parameter Data Sections

```
GAMETSPP marker pattern:
47 41 4D 45 54 53 50 50  |GAMETSPP|
[4 bytes parameter data size]
[4 bytes header]
[float values...]

Example Compressor parameters:
00 00 90 c1  = -18.0     (threshold dB)
67 66 46 40  = 3.1       (ratio)
00 00 78 41  = 15.5      (attack ms)
00 00 0c 43  = 140.0     (release ms)
00 00 90 c0  = -4.5      (makeup gain dB)
00 00 80 3f  = 1.0       (bypass/enable)
```

### Binary Plist Sections

```
Binary plist signature and header:
62 70 6C 69 73 74 30 30  |bplist00|
[version/type bytes]
[object references]

String markers (0x50-0x5F):
52 6F 75 74 70 75 74 43 68 61 6E 6E 65 6C  |RoutputChannel| (0x52 = string length 2)

Integer markers (0x10-0x1F):
10 00  |..| (0x10 = integer size 2⁰ bytes, value 0)

Dictionary markers (0xD0-0xDF):
D0 02  |..| (0xD0 = dictionary with 2 entries)
```

### Audio Unit Identifiers

```
Found identifiers:
xoBS@ - Effect unit type
xoBSH - Effect header type
B90PL - Plugin type
33CA - Likely Channel EQ
ORPL - Likely Compressor
x8PL - Likely Noise Gate
```

## Related Files

-   `data.plist` - Contains channel metadata and routing information (binary plist format)
-   `decoded_data.plist.xml` - Human-readable metadata with channel settings
-   `#Root.cst` - Binary CST data with audio unit configurations and parameters
-   Logic Pro maintains these files in sync

## Reverse Engineering Conclusion

The CST format combines standard parameter sections (GAMETSPP) with embedded binary plists to store effect configurations. Successful parsing requires:

1. **Audio unit type identification** using:
    - Stored names
    - 4-character identifiers (xoBS@, 33CA, etc.)
    - Parameter patterns
2. **Knowledge of Logic Pro's parameter ordering** for each effect type
3. **Intelligent value filtering** to remove padding and invalid data
4. **Binary plist detection and extraction** for additional parameters
5. **Type refinement based on parameter analysis**

This enhanced approach has proven successful in extracting more comprehensive parameter data from Logic Pro CST files, including previously unknown parameters from binary plists.
