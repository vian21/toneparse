import fs from "fs"
import path from "path"
import { test, expect, describe } from "bun:test"

import { LogicProCSTParser } from "../lib/LogicProCSTParser"

const assetsDir = path.join(import.meta.dir, "assets")

describe("Logic Pro CST Parser Results", () => {
    test("Parser validation with Arena Ready preset", () => {
        const cstFilePath = path.join(
            assetsDir,
            "Arena Ready.patch",
            "#Root.cst"
        )

        const buffer = fs.readFileSync(cstFilePath)
        const parser = new LogicProCSTParser(buffer)
        const preset = parser.parse()

        // Basic structure checks
        expect(preset).toHaveProperty("name")
        expect(preset).toHaveProperty("audio_units")
        expect(Array.isArray(preset.audio_units)).toBe(true)

        // Check we're finding some plugins
        expect(preset.audio_units.length).toBeGreaterThan(3)

        // Check audio unit structure
        for (const unit of preset.audio_units) {
            expect(unit).toHaveProperty("name")
            expect(unit).toHaveProperty("parameters")
            expect(typeof unit.parameters).toBe("object")
        }

        // Check for parameters in units
        const hasParameterizedUnits = preset.audio_units.some(
            (unit) => Object.keys(unit.parameters).length > 0
        )
        expect(hasParameterizedUnits).toBe(true)

        console.log(`Coverage: ${parser.get_coverage()}%`)
    })
})
