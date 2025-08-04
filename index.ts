import fs from "fs"
import path from "path"
import { NeuralDSPParser } from "./lib/NeuralDSPParser"
import { LogicProCSTParser } from "./lib/LogicProCSTParser"
import { log_preset, LoggingFormat } from "./lib/logging"
import parseBuffer from "bplist-universal"

function show_help(): never {
    console.log(
        "Toneparse - Parse Neural DSP, Logic Pro preset, and binary plist files"
    )
    console.log(
        "Usage: toneparse PRESET_FILE.[xml|patch|cst|plist] -f=[md|json]"
    )
    console.log(
        "-f        logging format. Values: md=markdown(default) | json=JSON"
    )
    process.exit(0)
}

function read_file(file: string) {
    try {
        const stats = fs.statSync(file)

        // .patch is a directory, find the .cst file inside
        if (stats.isDirectory() && path.extname(file) === ".patch") {
            const cstFile = path.join(file, "#Root.cst")
            return fs.readFileSync(cstFile)
        }
        return fs.readFileSync(file)
    } catch (e) {
        console.error("Error reading file:", e)
        process.exit(1)
    }
}

function parse_file(filename: string): Preset {
    const ext = path.extname(filename).toLowerCase()
    const buffer = read_file(filename)

    switch (ext) {
        case ".xml":
            const neuralParser = new NeuralDSPParser(buffer)
            return neuralParser.parse()
        case ".cst":
        case ".patch":
            const logicParser = new LogicProCSTParser(buffer)
            return logicParser.parse()
        case ".plist":
            // Check if this is a binary plist file
            if (buffer.toString("ascii", 0, 6) != "bplist")
                throw new Error("Invalid Binary Plist file provide")
            try {
                const parsedPlist = parseBuffer(buffer)
                const result = parsedPlist[0]

                log_preset(result, LoggingFormat.JSON)
                process.exit(0)
            } catch (error) {
                throw new Error("Error parsing binary plist:" + error)
            }
        default:
            throw new Error(`Unsupported file extension: ${ext}`)
    }
}

function main() {
    if (!process.argv[2] || process.argv[2].includes("-h")) show_help()

    let format = LoggingFormat.MARKDOWN
    if (process.argv[3] && process.argv[3].includes("json")) {
        format = LoggingFormat.JSON
    }

    const preset = parse_file(process.argv[2])

    log_preset(preset, format)
}

main()
