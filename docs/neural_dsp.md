# Neural DSP Format Documentation

This document outlines the structure and encoding of Neural DSP preset files (`.xml`) as implemented in the NeuralDSPParser.

## File Format Overview

Neural DSP preset files follow a binary key-value pair structure with the following characteristics:

-   **File Header**: Always starts with the preset name (null-terminated string)
-   **String Encoding**: All strings are null-terminated
-   **Data Structure**: Key-value pairs in `String:String` format
-   **Format Variants**: Two distinct formats exist - modern (with subModels) and legacy

## Key Format Characteristics

-   **String Values**: Null-terminated, with the next field starting immediately after
-   **NULL Values**: Marked by special byte sequences:
    -   `0x010205` (POSIX systems)
    -   `0x010906` (Windows systems)
-   **List Elements**: Marked by `0x000101` sequence
-   **Enquired Values**: Marked by `0x010501` sequence, representing "EDITOR_VALUE"
-   **SubModels**: Used to group similar settings together (e.g., Delay, Reverb1)

## Legacy Format

The legacy format differs from the modern format:

-   Comprised of a single module with all settings listed without grouping
-   Fields start with `PARAM` marker
-   Each parameter has an `id` (string) and `value` (double LE 64-bit or string)
-   String values in legacy format are marked by `0x010605`
-   Numeric values are stored as 64-bit Little Endian double values

Legacy format example:

```
PARAM 00 01 02 id 00 01 06 05 gate 00 value 00   01 09 04 00 00 00 00 00 80 51 C0 00
                                            NUL [           double(64bit)           ]
```

## Parsing Process

The parser follows these steps:

1. Extract the preset name from the file start
2. Determine if the file is legacy or modern format
3. For modern format:
    - Parse key-value pairs
    - Detect subModels as section headers
    - Group settings under their respective modules
4. For legacy format:
    - Parse all `PARAM id value` triplets
    - Extract and convert values based on their encoding

## Special Values

-   **listElements**: Sequences that contain multiple string values
-   **subModels**: Module names that group related settings
-   **Null Values**: Represented as `null` in the parsed output
-   **EDITOR_VALUE**: Special placeholder for values determined at runtime

## Output Structure

The parsed preset has the following structure:

```typescript
interface NeuralDSPPreset {
    name: string
    modules: NeuralDSPModule[]
}

interface NeuralDSPModule {
    name: string
    settings: Record<string, string | null>
}
```

Each module contains a name and a collection of settings as key-value pairs.
