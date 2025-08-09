# Toneparse - Guitar Tone Preset Parser

Toneparse is a tool for parsing and analyzing guitar tone presets from various formats. Currently, it supports Neural DSP preset files (`.xml`) and Logic Pro channel strip settings (`.patch`/`.cst`)`[experimental]`.

## Installation & Setup

```sh
# Clone the repository
git clone https://github.com/vian21/toneparse.git
cd toneparse

# Install dependencies with Bun
bun install
```

## Usage

Run the parser on any supported preset file:

```sh
# Parse a Neural DSP preset (.xml)
bun run index.ts path/to/preset.xml

# Parse a Logic Pro patch folder (.patch)
bun run index.ts path/to/preset.patch

# Parse a Logic Pro CST file directly
bun run index.ts path/to/preset.cst
```

### Development Mode

For continuous development with automatic reloading:

```sh
bun run dev
```

## Supported Formats

### Neural DSP Format (`.xml`)

Neural DSP presets use a proprietary binary format. For detailed format information, see [neural_dsp.md](docs/neural_dsp.md).

### Logic Pro Patch Format (`.patch`/`.cst`)

Logic Pro patches are stored as folders (`.patch`) containing:

1. `data.plist` - Metadata about the patch
2. `#Root.cst` - The main settings file

For detailed format information, see [logic_pro_cst.md](docs/logic_pro_cst.md).

## Testing

```sh
# Run all tests
bun test

# Run a specific test file
bun test tests/neural_dsp_parser.test.ts

# Run a specific test
bun test --test-name-pattern="Accuracy - legacy format"
```

### Running with Node.js/Browser

If you prefer to use Node.js instead of Bun:

```sh
# Install dependencies with npm
npm install

# Compile TypeScript
npm run build

# Run the compiled code
node dist/index.js path/to/preset.xml
```

## References

-   [ASCII Table](https://www.ascii-code.com/)
-   [NeuralDSP presets database](https://presetjunkie.com/)
-   [Reverse engineering Logic Pro synth files](https://robertheaton.com/2017/07/17/reverse-engineering-logic-pro-synth-files/)
-   [Apple Binary format decoder](https://github.com/opensource-apple/CF/blob/master/CFBinaryPList.c)
-   [Logic Pro project data decoding](https://gitlab.com/fastfourier666/cigol)
