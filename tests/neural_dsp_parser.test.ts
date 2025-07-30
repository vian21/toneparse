import fs from "fs"
import path from "path"
import { test } from "bun:test"
import { NeuralDSPParser } from "../lib/NeuralDSPParser"

/*
 * This tests that each file can be parsed
 * Success: the parser halts gracefully
 * Error: the parser enters an infinite loop
 *
 */
const assetsDir = path.join(import.meta.dir, "assets")
const files = fs
    .readdirSync(assetsDir)
    .filter((file) => file.endsWith(".xml"))
    .map((file) => path.join(assetsDir, file))

test.each(files)("%s", (file) => {
    console.log("\n🔘 Testing:", path.basename(file))
    const parser = new NeuralDSPParser(fs.readFileSync(file))
    parser.parse()
})
