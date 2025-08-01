import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"
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

test("Accuracy - modern format", () => {
    const presetFile = files.find((file) => file.includes("timmons"))
    if (!presetFile) throw new Error("File not found: timmons.xml")

    const parser = new NeuralDSPParser(fs.readFileSync(presetFile))
    const preset = parser.parse()

    // |      Plugin Name: asato-X      |
    expect(preset.name).toBe("asato-X")

    /**
      ----------------------------------
      |         cabParameters          |
      ----------------------------------
      | !leftCab0ChosenIRFilePath | null  |
      | leftCab1MicType           | 0     |
      | rightCabMicLevel          | 0     |
      | sectionActive             | true  |
      | leftCab0MicType           | 0     |
      | leftCab2MicType           | 0     |
      | rightRoomMicType          | 0     |
      | leftCabPosition           | 0.5   |
      | leftCab1ChosenIRFilePath  | null  |
      | leftCab2ChosenIRFilePath  | null  |
     */
    const module = preset.modules.find((m) => m.name == "cabParameters")
    expect(module).toBeDefined()

    expect(module?.settings["!leftCab0ChosenIRFilePath"]).toBeNull()
    expect(module?.settings["sectionActive"]).toBe("true")
    expect(module?.settings["leftCabPosition"]).toBe("0.5")
    expect(module?.settings["leftCab2ChosenIRFilePath"]).toBeNull()
})

test("Accuracy - legacy format", () => {
    const presetFile = files.find((file) => file.includes("fortin"))
    if (!presetFile) throw new Error("File not found: fortin.xml")

    const parser = new NeuralDSPParser(fs.readFileSync(presetFile))
    const preset = parser.parse()

    // | Plugin Name: neural_dsp_fortin_cali_suite |
    expect(preset.name).toBe("neural_dsp_fortin_cali_suite")

    /**
     * Legacy format has one module
     *
     ----------------------------------
     |    LEGACY FORMAT: Settings     |
     ----------------------------------
     | ampType           | 0                   |
     | ampsActive        | 1                   |
     | cab1Active        | 1                   |
     | cab1Distance      | 0.33000001311302185 |

     | gate              | -70                 |
     | cabsims           | cabsim              |
     | filePath1         | null                |
     | filePath2         | null                |
     */
    const module = preset.modules[0]
    expect(module).toBeDefined()
    expect(module?.name).toBe("LEGACY FORMAT: Settings")

    expect(module?.settings["ampType"]).toBe("0")
    expect(module?.settings["cab1Distance"]).toBe("0.33000001311302185")
    expect(module?.settings["gate"]).toBe("-70")

    expect(module?.settings["filePath1"]).toBeNull()
    expect(module?.settings["filePath2"]).toBeNull()
})
