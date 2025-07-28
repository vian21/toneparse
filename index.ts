import fs from "fs"
import { NeuralDSPParser } from "./lib/NeuralDSPParser"

function show_help(): never {
    console.log("Toneparse - Parse Neural DSP and Logic Pro preset files")
    console.log(`Usage: ${process.argv[0]} PRESET_FILE.[xml|cst]`)
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
    console.log("Length: ", buffer.length)

    const parser = new NeuralDSPParser(buffer)
    return parser.parse()
}

function log_preset(preset: NeuralDSPPreset) {
    console.log(JSON.stringify(preset, null, 2))
}

function main() {
    // if (process.argv.length == 2) show_help()
    // if (!process.argv[2]) return

    // const buffer = read_file(process.argv[2])
    const buffer = read_file("tests/assets/timmons.xml")
    const preset = parseBuffer(buffer)
    // log_preset(preset)

    console.log("------ -----")

    const buffer2 = read_file("tests/assets/fortin.xml")
    // const preset2 = parseBuffer(buffer2)
    // log_preset(preset2)
}

main()
