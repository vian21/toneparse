# Toneparse - Neural DSP preset parser

This project was made to parse Neural DSP proprietary binary format used in their `.xml` presets. The end goal is to be able to reproduce sounds without Neural DSP hardware or plugins.

```sh
bun run index.ts FILE.[xml | patch | cst]
```

### NeuralDSP Format

-   File always starts with preset name
-   Every string is `Nul Terminated`
-   The format is a `Key-value` pair `String:String`
-   If field has a string value. That value will also be Nul terminated and the next follows directly
-   NULL fields are demarked by `0x010205` ( `0x10906` for windows?). But they seem to be both used
-   `listElements` are demarked by `0x000101`
-   `submodels` are used to group similar setting together e.g Delay, Reverb1
-   Legacy format are made of single module - All settings are just listed/dumped without grouping(like `submodels`) - Starts with `PARAM` has `id`:`string` and `value`:`doubleLE(64bit) | string` - `value` has a `tab` after it and 8 bits to represent the value

```hex
PARAM 00 01 02 id 00 01 06 05 gate 00 value 00   01 09 04 00 00 00 00 00 80 51 C0 00
                                            NUL [           double(64bit)           ]
```

### Logic Pro patch format

-   A `.path` arhive contains 2 files:

1. `data.plist`
    - The file starts off with an 8-byte header containing the magic “bplist”
    - Contains metadata about the patch. E.g: `Channel_name` (preset name) and where the main cst file is located (`Filename`)

```sh
# macOs
plutil -convert xml1 data.plist

# Linux
plistutil -i data.plist -f xml -o decoded_data.plist.xml
```

2. `#Root.cst`
    - This is the main file with the settings
    - Little endian
    - Strings are null-terminated
    - some strings are inverted(keys)
    - `OCuA` -> AuCO`. File always start with this and has it at the end with some number 4.5
    - Data chuncks start wity UCua
    - ` Audio 1` always at offset 0x61

### References

-   ASCII Table: https://www.ascii-code.com/
-   DataView: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/DataView
-   SpeedScope Binary parser: https://github.com/jlfwong/speedscope/blob/9edd5ce7ed6aaf9290d57e85f125c648a3b66d1f/import/instruments.ts#L772
-   NeuralDSP presets database: https://presetjunkie.com/

-   Reverse engineering LogicPro synth files (blog + code): https://robertheaton.com/2017/07/17/reverse-engineering-logic-pro-synth-files/
-   Apple Binary format decoder (`.c`): https://github.com/opensource-apple/CF/blob/master/CFBinaryPList.c
-   bplist decoder (imhex::Pattern Lang): https://github.com/WerWolv/ImHex-Patterns/blob/master/patterns/bplist.hexpat
-   `CST`: channel strip setting
-   Logic pro project data decoding (2022): https://gitlab.com/fastfourier666/cigol
