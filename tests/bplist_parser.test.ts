import fs from "fs"
import path from "path"
import { test, expect } from "bun:test"

import parseBuffer from "../lib/bplistParser"

const assetsDir = path.join(import.meta.dir, "assets")

test("Parsing and correctness", () => {
    const arenaReadyBinaryPath = path.join(
        assetsDir,
        "Arena Ready.patch",
        "data.plist"
    )
    console.log("Parsing:", arenaReadyBinaryPath)

    const buffer = fs.readFileSync(arenaReadyBinaryPath)
    const document = parseBuffer(buffer)

    expect(document).toBeArray()

    const root = document[0]

    expect(root).toHaveProperty("VersionPatches")
    expect(root.VersionPatches).toBe(40014)

    expect(root).toHaveProperty("channels")
    expect(root.channels).toBeArray()

    const rootChannel = root.channels![0]!

    expect(rootChannel.Channel_outputIsStereo).toBe(true)
    expect(rootChannel.Root).toBe(true)

    expect(rootChannel.Channel_sends).toBeArray()
    expect(rootChannel.Channel_sends.length).toBe(2)

    expect(rootChannel.Channel_sends[0].sendMode).toBe(1)
    expect(rootChannel.Channel_sends[0].sendVolume).toBe(0.37007874250411987)

    expect(rootChannel.UUID).toBe("BFC5995E-D1B1-4D04-BDBE-A13910249E53")
    expect(rootChannel.Channel_name).toBe("Arena Ready")
})
