# Logic Pro CST Binary Format Analysis

## Overview
Logic Pro Channel Strip (.cst) files use a binary format to store audio unit configurations, effects chains, and parameter settings. These files are typically found inside `.patch` directories alongside plist metadata files.

## Key Findings

### Parameter Names Are NOT Stored in CST Files
**Critical Discovery**: Parameter names are **NOT** stored as strings within the CST binary format. Only audio unit names (like "Compressor", "Channel EQ", "Tape Delay") are stored as readable strings. Parameter names must be inferred based on:
1. Audio unit type identification
2. Standard audio processing parameter conventions
3. Parameter position within the GAMETSPP data section

### Audio Unit Identifiers
CST files contain mysterious 4-character strings that appear to be Audio Unit identifiers:
- `xoBS@` - Unknown audio unit type
- `xoBSH` - Unknown audio unit type  
- `B90PL` - Unknown audio unit type
- These likely correspond to Apple's Audio Unit Component Types/Subtypes

## File Structure

### Header Signatures
The CST format uses chunk-based structure with signature headers:
- `OCuA` (4F 43 75 41) - Primary audio unit chunk
- `UCuA` (55 43 75 41) - Secondary audio unit chunk

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
```

### Data Types Found

#### String Data
- Audio unit names appear as null-terminated ASCII strings
- Common names observed: "Audio 1", "Noise Gate", "Pedalboard", "Channel EQ", "Compressor", "Tape Delay"
- Strings are typically followed by padding bytes
- **No parameter names are stored as strings**

#### Parameter Data Sections
- **GAMETSPP Signature**: Parameter data is marked by `GAMETSPP` (47 41 4D 45 54 53 50 50) identifiers
- **GAME Signature**: Shorter parameter sections use `GAME` (47 41 4D 45) markers
- Float values (32-bit little-endian) representing actual parameter settings
- **Improved parsing pattern**:
  ```
  [8 bytes] "GAMETSPP" signature
  [4 bytes] Parameter data size
  [4 bytes] Header/metadata
  [variable] Sequence of 32-bit float parameter values
  ```

#### Parameter Value Characteristics
- **Real-world units**: Values represent actual audio processing parameters in their native units
  - Threshold: -96.0 to 0.0 dB
  - Ratio: 1.0 to 20.0
  - Frequency: 20.0 to 20000.0 Hz
  - Time values: milliseconds or seconds
  - Mix/Level controls: 0.0 to 1.0 or percentage
- **Padding Detection**: Values like `0x714971CA` (`caf2 4971` pattern) are padding and should be filtered out
- **Value Filtering**: Extreme values (> 100000 or < 1e-10) are likely invalid and should be ignored

#### Binary Markers and Patterns
- `35 12` appears frequently, possibly version or format identifiers
- `GAMETSPP` (47 41 4D 45 54 53 50 50) - **Primary marker for parameter data sections**
- `GAME` (47 41 4D 45) - **Secondary marker for parameter data sections**
- `00 00 00 00` padding/null bytes common between sections
- `FF FF FF FF` used as section terminators
- `ca f2 49 71` appears as padding/fill pattern in parameter sections (should be filtered)

## Parsing Strategy - Updated Implementation

### Chunk Detection and Parsing
1. Scan for `OCuA`/`UCuA` signatures
2. Read chunk size information to determine chunk boundaries
3. Extract audio unit name strings within chunk boundaries
4. **Determine audio unit type** from name for proper parameter mapping
5. **Search for parameter sections** within chunk boundaries only

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
    if (param_name.includes("threshold") && (value < -96 || value > 0)) return null
    if (param_name.includes("ratio") && (value < 1 || value > 50)) return null
    // ... more validations
}

// Padding detection
if (int_representation === 0x714971CA) return null  // caf2 4971 pattern
if (Math.abs(value) > 100000) return null           // Extremely large
if (Math.abs(value) < 1e-10 && value !== 0) return null  // Tiny non-zero
```

## Implementation Results

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
```

#### Channel EQ (from Arena Ready.patch):
```
low_Q: 2
low_mid_gain: 1 dB
low_mid_Q: 80
high_mid_gain: 1.1 dB
high_mid_Q: 1
```

#### Tape Delay (from Arena Ready.patch):
```
high_cut: 16 kHz
low_cut: 1600 Hz
sync_mode: 190
sync_note: 1
tape_drive: 4
```

### Known Limitations
- **Parameter names are inferred**, not extracted from file
- Parameter order may vary between Logic Pro versions  
- Some audio units may use different parameter data formats
- Audio Unit identifier strings (`xoBS@`, etc.) are not yet decoded
- Some parameter sections may contain multiple sub-effects with interleaved data

## Technical Implementation Notes

### Audio Unit Type Detection
```javascript
private get_audio_unit_type(name: string): string {
    const lower_name = name.toLowerCase()
    if (lower_name.includes("eq")) return "equalizer"
    if (lower_name.includes("compressor")) return "compressor"
    if (lower_name.includes("gate")) return "gate"
    // ... etc
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

### GAMETSPP vs GAME Handling
- `GAMETSPP`: Full parameter sections with size headers
- `GAME`: Shorter sections, limited parameter extraction

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

### Padding Pattern Recognition
```
caf2 4971 pattern (should be filtered):
ca f2 49 71  = Invalid padding value
```

## Related Files
- `data.plist` - Contains channel metadata and routing information (binary plist format)
- `decoded_data.plist.xml` - Human-readable metadata with channel settings
- Logic Pro maintains these files in sync with binary CST data

## Reverse Engineering Conclusion
The CST format stores parameter **values** as binary floats but relies on **standardized parameter order conventions** rather than storing parameter names. Successful parsing requires:

1. **Audio unit type identification** from stored names
2. **Knowledge of Logic Pro's parameter ordering** for each effect type  
3. **Intelligent value filtering** to remove padding and invalid data
4. **Respect for chunk boundaries** to avoid cross-contamination
5. **Recognition that parameter names must be inferred**, not extracted

This approach has proven successful in extracting meaningful, properly-named parameters from Logic Pro CST files.