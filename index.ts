import fs from "fs"
import { NeuralDSPParser } from "./lib/NeuralDSPParser"
import { log_preset, LoggingFormat } from "./lib/logging"

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

function parse_buffer(buffer: Buffer): NeuralDSPPreset {
    const parser = new NeuralDSPParser(buffer)
    return parser.parse()
}

function main() {
    if (process.argv.length == 2) show_help()
    if (!process.argv[2]) return

    let format = LoggingFormat.MARKDOWN
    if (process.argv[3] && process.argv[3].includes("json")) {
        format = LoggingFormat.JSON
    }

    const buffer = read_file(process.argv[2])
    const preset = parse_buffer(buffer)

    log_preset(preset, format)
}

main()
