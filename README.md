# Toneparse - Neural DSP preset parser

This project was made to parse Neural DSP proprietary binary format used in their `.xml` presets. The end goal is to be able to reproduce sounds without Neural DSP hardware or plugins.

```sh
bun run index.ts FILE.[xml|cts]
```

### Format

-   File always starts with preset name
-   Every string is `Nul Terminated`
-   The format is a `Key-value` pair `String:String`
-   If field has a string value. That value will also be Nul terminated and the next follows directly
-   NULL fields are demarked by `0x010205` ( `0x10906` for windows?). But they seem to be both used
-   `listElements` are demarked by `0x000101`
-   `submodels` are used to group similar setting together e.g Delay, Reverb1
-   Legacy format are made of single module - All settings are just listed/dumped without grouping(like `submodels`) - Starts with `PARAM` has `id`:`string` and `value`:`doubleLE(64bit) | string` - `value` has a `tab` after it and 8 bits to represent the value
    `hex
PARAM 00 01 02 id 00 01 06 05 gate 00 value 00   01 09 04 00 00 00 00 00 80 51 C0 00
                                            NUL [           double(64bit)          ]
    `

### References

-   ASCII Table: https://www.ascii-code.com/
-   DataView: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/DataView
-   SpeedScope Binary parser: https://github.com/jlfwong/speedscope/blob/9edd5ce7ed6aaf9290d57e85f125c648a3b66d1f/import/instruments.ts#L772
-   https://presetjunkie.com/
