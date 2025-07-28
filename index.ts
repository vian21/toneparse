import fs from "fs"
import { NeuralDSPParser } from "./lib/NeuralDSPParser"

const LoggingFormat = {
    JSON: 0,
    MARKDOWN: 2,
}

function show_help(): never {
    console.log("Toneparse - Parse Neural DSP and Logic Pro preset files")
    console.log(`Usage: ${process.argv[0]} PRESET_FILE.[xml|cst] -f=[md|json]`)
    console.log(
        "-f        logging format. Values: md=markdown(default) | json=JSON"
    )
    process.exit(0)
}

function read_file(file: string) {
    try {
        return fs.readFileSync(file)
    } catch (e) {
        console.error("Error reading file:", e)
        process.exit(1)
    }
}

function parseBuffer(buffer: Buffer): NeuralDSPPreset {
    const parser = new NeuralDSPParser(buffer)
    return parser.parse()
}

function log_preset(preset: NeuralDSPPreset, format = LoggingFormat.MARKDOWN) {
    switch (format) {
        case LoggingFormat.JSON:
            console.log(JSON.stringify(preset, null, 2))
            break
        case LoggingFormat.MARKDOWN:
            log_md(preset)
            break
    }
}

function log_md(preset: NeuralDSPPreset) {
    console.log("| ", preset.name, " |")
    for (const module of preset.modules) {
        console.log("-".repeat(10))
        console.log("| ", module.name, " |")
        console.log("-".repeat(10))

        for (const [k, v] of Object.entries(module.settings)) {
            console.log("| ", k, " |", v, "|")
        }
        console.log("-".repeat(10))
    }
}

function main() {
    // if (process.argv.length == 2) show_help()
    // if (!process.argv[2]) return

    // const buffer = read_file(process.argv[2])
    const buffer = read_file("tests/assets/timmons.xml")
    const preset = parseBuffer(buffer)
    log_preset(preset)

    console.log("------ -----")

    const buffer2 = read_file("tests/assets/fortin.xml")
    // const preset2 = parseBuffer(buffer2)
    // log_preset(preset2)
}

main()
