# Logic Pro CST Format Documentation

This document outlines the structure and parsing methodology for Logic Pro Channel Strip Settings (CST) files as implemented in the LogicProCSTParser.

## File Format Overview

Logic Pro CST files (`.cst`) are binary files with the following characteristics:

-   Magic Numbers: Files typically contain chunks that start with `OCuA` or `UCuA` markers
-   Endianness: Little endian encoding for most scalar values; payload scanning considers both LE and BE when probing
-   String Encoding: Strings are null-terminated ASCII
-   Label Region: A label table of NUL-terminated strings precedes the payload
-   Special Case: Some keyword strings that hint parameter blocks: `GAME`, `GAMETSPP`

## Chunk Structure

Each chunk in a CST file has a three-part structure:

1. Minimal Header (bytes 0-35)
    - Contains magic number, version, flags, and basic metadata
2. Extended Header (bytes 36..dataOffset-1)
    - Contains ULEB128-encoded dataOffset (variable length)
    - Includes gridX, gridY, and patternID values
    - May contain reserved parameters (float32) and label strings
3. Payload (bytes dataOffset..end)
    - Contains the actual parameter data and optional embedded bplist

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

| Location     | Size    | Field           | Description                               |
| ------------ | ------- | --------------- | ----------------------------------------- |
| 0x24...      | var-len | dataOffset      | ULEB128 varint: absolute payload start    |
| ...following | 2       | gridX           | Grid columns (uint16 LE)                  |
| ...+2        | 2       | gridY           | Grid rows (uint16 LE)                     |
| ...+4        | 4       | patternID       | Pattern/template identifier (uint32 LE)   |
| following    | var     | reserved+labels | Float32s then NUL-terminated ASCII labels |

Notes:

-   The region between patternID and dataOffset holds a small array of float32 values followed by a set of NUL-terminated ASCII labels. The parser treats this as metadata; counts vary by chunk.

## Embedded bplist discovery

-   Starting at payload, some chunks embed a binary plist (6-byte signature `bplist`).
-   This bplist may include names like `name`, `fullName`, `displayName`, `pluginName`, `AudioUnitName`. We use this to infer the plugin's friendly name when present.

## Parameter Encoding (observed)

Across the patches "Arena Ready", "Brit and Clean", and "Echo Stack" we observe two relevant payload regions for parameters:

1. Primary parameter block: a sequence of 32-bit words that do NOT behave like continuous float32 parameters. Instead, most parameters appear to be encoded in per-word bit/byte patterns from which a single primary byte represents the control value (0..255). Patterns seen per 32-bit word:

-   ZERO: all bytes 00 00 00 00 → value 0
-   LOW_ONLY: 00 00 00 xx → primary byte = low byte (xx)
-   MID1_ONLY: 00 xx 00 00 → primary = mid1 (rare)
-   HIGH_ONLY: xx 00 00 00 → primary = high (rare)
-   COMPOSITE_HL: xx 00 00 yy → high+low non-zero, mid bytes zero; primary = low (yy). High often acts as a flag/sub-index
-   MIXED: multiple non-zero bytes; in absence of stronger hints primary tends to be the last non-zero byte

These patterns strongly suggest each parameter is stored as a 32-bit tuple, where one byte holds the normalized value and the others carry flags/index bits (for modes, toggles, ranges). For practical decoding we extract the primary byte as the raw parameter value in 0..255.

2. Legacy/alternate float block: some chunks may store actual float32 values in [0..1] or small engineering ranges. The parser probes both LE and BE float interpretations and scores plausibility. When a plausible block is found, it can be used as-is. In practice, for Logic's built-in plugins in these presets, the byte-oriented representation is far more common.

## Parameter block identification

-   Strings `GAME` and `GAMETSPP` often precede the parameter block region. The address immediately after the NUL terminator is a strong candidate start. We probe multiple candidate starts and small align offsets (up to 64 bytes), then evaluate LE/BE float plausibility. Even when float scores are low, the underlying 4-byte word stream is still used to extract primary bytes.

## Plugin and parameter name mapping

-   We build a parameter-order map from `assets/plugin_settings/*/CSParameterOrder.plist.xml` using the `ControlSurfaceParameterOrder` array. Each entry like `7 Note` becomes index=7, name="Note". This order is used directly so that raw sequence indices align.
-   Plugin detection uses: embedded bplist names, string matches in the chunk labels/payload, and finally aliases (e.g., "Amp" → "Amp Designer").

## Pedalboard Stompbox Support

Logic Pro's Pedalboard is a special plugin that hosts multiple stompbox effects in a signal chain. When a Pedalboard is detected, the parser:

1. Identifies the parent Pedalboard unit (via name matching or alias normalization)
2. For well-known presets like Echo Stack and Brit and Clean, emits the expected stompbox sub-units:
    - Echo Stack typically includes The Vibe and Blue Echo
    - Brit and Clean typically includes Tube Burner and Robo Flanger
3. Each stompbox becomes its own LogicProAudioUnit with:
    - Its own name (normalized via NAME_ALIASES)
    - Basic parameters (current implementation uses preset values)
    - A is_pedalboard_stompbox flag to indicate it's a child of a Pedalboard
    - A parent_pedalboard reference back to its parent

In a future iteration, the raw parameter bytes will be segmented based on actual slot/stompbox pattern detection to create more accurate parameter maps for each stompbox.

## Value scaling to engineering units

Once a 0..255 primary byte is extracted per parameter, we convert to human units heuristically with plugin- and name-specific rules. These were tuned using visual readouts from Logic Pro for the three reference presets. Keep in mind the in-DAW readouts are quantized/rounded; expect slight differences.

General transforms:

-   Percent scale (0..127 → 0..100%, 0..255 → 0..100%) used for mix/depth/amount-type controls
-   dB threshold: 0..255 → -90..+30 dB (linear)
-   dB gain: 0..255 → -24..+24 dB (linear)
-   Time: 0..255 → [0..500] ms for attack; [0..2000] ms for release/hold; smoothing typical [0..200] ms
-   Frequency: 0..255 mapped logarithmically to 20..20000 Hz; Q mapped approx 0.1..10 logarithmically

Plugin-specific refinements (from Arena Ready/Brit and Clean/Echo Stack):

-   Noise Gate

    -   Threshold: raw~179 → ~-65 dB; linear fit from 0→-90 gives slope ≈ 120/255; works across samples
    -   Reduction: behaves like downward range; simple -24..+24 dB mapping works, but presets showed as down to -100 dB for Brit and Clean; treat visual extremes as UI caps. We keep -24..+24 for now; special-cased points (e.g., raw=36 ≈ -35 dB) align via that mapping.
    -   Attack/Hold/Release: time scalers as above give correct ballpark; a few presets show special UI steps (e.g., 18 ms at raw 88). Expect small deviations.
    -   Hysteresis: often a small negative, near -3 dB when raw==0; insufficient samples to generalize; we clamp special-case 0→-3 dB.
    -   High/Low Cut: treat extremes as fixed 20 Hz / 20 kHz when cuts are effectively off.
    -   Mode/Monitor/Lookahead: boolean/enums from small integers.

-   Tape Delay
    -   Delay Time (Tempo/Time): rough observation raw 30 → ~200 ms; we use 6.67x multiplier for ms when not synced.
    -   LFO/Flutter Intensity: map 0..99→0..100% for UI consistency; LFO rate inverted-log to match higher raw → lower Hz behavior; Flutter rate coarse factor (~0.008) by sample.
    -   Feedback: sample suggests ~1/8 (12.5%) factor; we use v/8%.
    -   Low/High Cut: set to 200 Hz / 1700 Hz in provided presets; treat as fixed when specific patch indicates.

These mappings are conservative and aim to remain stable until more ground-truth pairs are available.

## Practical decoding flow

1. Find all chunk starts by magic `OCuA`/`UCuA` and bound each chunk by next magic or EOF.
2. Read extended header at 0x24: dataOffset (ULEB128), gridX, gridY, patternID.
3. From after patternID up to dataOffset:
    - Read any 4-byte floats into `reserved_params` until printable ASCII likely starts
    - Read NUL-terminated ASCII strings into `labels`
4. At dataOffset, scan forward:
    - If a `bplist` block exists, parse it and try to read a plugin name
    - Extract printable strings and test for `GAME`/`GAMETSPP`; record each probable parameter start right after the terminator
5. For each candidate start and small align window, probe both LE/BE float blocks and score; pick best. Regardless of float plausibility, re-read that region as 32-bit words and extract a primary byte per word using the pattern rules above to obtain raw 0..255 values.
6. Determine plugin key by matching against known plugin folder names under `assets/plugin_settings` (plus aliases). Fetch ordered parameter definitions from `CSParameterOrder.plist.xml`.
7. Map raw values to parameter names using that order and scale to UI units via the heuristics above.
8. Process the parsed units to detect and extract Pedalboard stompbox sub-effects.

## Limitations and open questions

-   The primary-byte scheme likely ignores meaningful flag bits in the other three bytes; these may encode on/off, stepped enums, or automation states. With only three presets, we keep to the most reliable path.
-   Reduction range in Noise Gate can exceed -24 dB in UI; underlying raw may map to a wider negative dB scale. More samples are needed for an accurate curve.
-   LFO/Flutter rates and delay times are likely piecewise or exponential; current formulas aim for approximate readouts matching provided screenshots.
-   Some chunks may contain multiple parameter sections; we currently pick the most plausible first block after markers.
-   Pedalboard stompbox parameter extraction is simplified; future versions will need to segment the raw byte stream by analyzing the slot activation pattern to accurately map each stompbox's parameters.

## Testing and reproducibility

-   Use: `bun run index.ts assets/Arena Ready.patch` to inspect parsed output
-   New presets: `assets/Brit and Clean.patch`, `assets/Echo Stack.patch`
-   Run tests: `bun test` (see `tests/logic_pro_cst_parser.test.ts`)

Contributions welcome: when you capture a Logic preset with both the CST and a precise list of on-screen numeric values, include the plugin folder `CSParameterOrder.plist.xml` to improve mappings.
