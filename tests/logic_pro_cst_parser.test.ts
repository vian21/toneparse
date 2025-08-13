import fs from "fs"
import path from "path"
import { test, expect, describe } from "bun:test"

import { LogicProCSTParser } from "../lib/LogicProCSTParser"

const assetsDir = path.join(process.cwd(), "assets")

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

    test("Pedalboard and stompbox sub-units in Echo Stack", () => {
        const cstFilePath = path.join(
            assetsDir,
            "Echo Stack.patch",
            "#Root.cst"
        )
        const buffer = fs.readFileSync(cstFilePath)
        const parser = new LogicProCSTParser(buffer)
        const preset = parser.parse()

        // Expect Pedalboard unit present
        const names = preset.audio_units.map((u) => u.name)
        const hasPedalboard = names.some((n) => /pedalboard/i.test(n))
        expect(hasPedalboard).toBe(true)

        // Expect at least two known stompboxes
        const knownStomps = [
            "The Vibe",
            "Blue Echo",
            "Tube Burner",
            "Robo Flanger",
            "Stereo Delay",
            "Chorus",
        ]
        const foundStomps = names.filter((n) => knownStomps.includes(n))
        expect(foundStomps.length).toBeGreaterThanOrEqual(2)

        // Their parameters should not be empty
        for (const unit of preset.audio_units) {
            if (knownStomps.includes(unit.name)) {
                expect(Object.keys(unit.parameters).length).toBeGreaterThan(0)
            }
        }
    })

    test("Pedalboard and stompbox sub-units in Brit and Clean", () => {
        const cstFilePath = path.join(
            assetsDir,
            "Brit and Clean.patch",
            "#Root.cst"
        )
        const buffer = fs.readFileSync(cstFilePath)
        const parser = new LogicProCSTParser(buffer)
        const preset = parser.parse()

        const names = preset.audio_units.map((u) => u.name)
        const hasPedalboard = names.some((n) => /pedalboard/i.test(n))
        expect(hasPedalboard).toBe(true)

        const knownStomps = [
            "The Vibe",
            "Blue Echo",
            "Tube Burner",
            "Robo Flanger",
            "Stereo Delay",
            "Chorus",
        ]
        const foundStomps = names.filter((n) => knownStomps.includes(n))
        expect(foundStomps.length).toBeGreaterThanOrEqual(2)

        for (const unit of preset.audio_units) {
            if (knownStomps.includes(unit.name)) {
                expect(Object.keys(unit.parameters).length).toBeGreaterThan(0)
            }
        }
    })
})
