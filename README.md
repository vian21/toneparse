# Toneparse

```sh
bun run index.ts FILE.[xm;|cts]
```

### Format

-   starts with preset name
-   `0| NUL` - separator
-   Preset always ends with `2 NUL`
-   Every string is `Nul Terminated`
-   if field has a string value. That value will also be Nul terminated and the next follows directly
-   The format is a `Key-value` pair `String:String`

```

### References
- ASCII Table: https://www.ascii-code.com/
- DataView: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/DataView
- SpeedScope Binary parser: https://github.com/jlfwong/speedscope/blob/9edd5ce7ed6aaf9290d57e85f125c648a3b66d1f/import/instruments.ts#L772
- https://presetjunkie.com/
```
