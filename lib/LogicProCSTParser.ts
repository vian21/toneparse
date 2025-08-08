import { BaseParser } from "./BaseParser"
import parseBuffer from "bplist-universal"
import * as fs from "fs"
import * as path from "path"

interface CSTChunk {
    start: number
    end: number
}

interface ChunkMetadata {
    dataOffset: number
    gridX: number
    gridY: number
    patternID: number
    reserved_params: number[]
    labels: string[]
}

type ParamDef = { index: number; name: string }

export class LogicProCSTParser extends BaseParser {
    // pluginName -> sorted array of {index, name}
    private static PARAM_NAME_MAP: Record<string, ParamDef[]> | null = null
    // cache of known plugin names from plugin_settings folder names
    private static KNOWN_PLUGIN_NAMES: string[] | null = null

    private static load_param_name_map(): Record<string, ParamDef[]> {
        if (this.PARAM_NAME_MAP && this.KNOWN_PLUGIN_NAMES)
            return this.PARAM_NAME_MAP!

        const baseDir = path.resolve(
            __dirname,
            "..",
            "tests",
            "assets",
            "plugin_settings"
        )

        const map: Record<string, ParamDef[]> = {}
        const known: string[] = []

        if (fs.existsSync(baseDir)) {
            const plugins = fs.readdirSync(baseDir, { withFileTypes: true })
            for (const dirent of plugins) {
                if (!dirent.isDirectory()) continue
                const pluginName = dirent.name
                known.push(pluginName)

                const xmlPath = path.join(
                    baseDir,
                    pluginName,
                    "CSParameterOrder.plist.xml"
                )
                if (!fs.existsSync(xmlPath)) continue

                try {
                    const xml = fs.readFileSync(xmlPath, "utf8")
                    const defs: ParamDef[] = []

                    // Only consider ControlSurfaceParameterOrder section
                    const arrayStart = xml.indexOf(
                        "<key>ControlSurfaceParameterOrder</key>"
                    )
                    if (arrayStart >= 0) {
                        const arrOpen = xml.indexOf("<array>", arrayStart)
                        const arrClose = xml.indexOf("</array>", arrOpen)
                        if (arrOpen >= 0 && arrClose > arrOpen) {
                            const arrContent = xml.substring(arrOpen, arrClose)
                            const regex = /<string>(.*?)<\/string>/g
                            let m: RegExpExecArray | null
                            while ((m = regex.exec(arrContent)) !== null) {
                                const entry = m[1]!.trim()
                                // Expect patterns like "7 Note" or "0 Mix"
                                const mi = entry.match(/^(\d+)\s+(.+?)\s*$/)
                                if (mi) {
                                    const idx = parseInt(mi[1]!, 10)
                                    const nm = mi[2]!.trim()
                                    defs.push({ index: idx, name: nm })
                                } else if (
                                    entry &&
                                    !entry.includes("$BYPASS")
                                ) {
                                    // Fallback: keep an entry with inferred sequential index
                                    defs.push({
                                        index: defs.length,
                                        name: entry,
                                    })
                                }
                            }
                        }
                    }

                    if (defs.length) {
                        defs.sort((a, b) => a.index - b.index)
                        map[pluginName] = defs
                    }
                } catch (e) {
                    throw new Error("Couldn't parse plugin settings: " + e)
                }
            }
        }

        this.PARAM_NAME_MAP = map
        this.KNOWN_PLUGIN_NAMES = known
        return map
    }

    private static get_known_plugin_names(): string[] {
        if (!this.KNOWN_PLUGIN_NAMES) this.load_param_name_map()
        return this.KNOWN_PLUGIN_NAMES || []
    }

    parse(): LogicProPreset {
        const preset: LogicProPreset = {
            name: "",
            audio_units: [],
            channel_name: "",
        }

        // Iterate through all identifiable chunks
        for (const chunk of this.find_chunks(this.buffer)) {
            const unit = this.parse_chunk(chunk)
            if (unit) preset.audio_units.push(unit)
        }

        return preset
    }

    private parse_chunk(chunk: CSTChunk): LogicProAudioUnit | null {
        const audio_unit: LogicProAudioUnit = {
            name: "",
            parameters: {},
        }

        this.offset = chunk.start

        // Parse extended header at 0x24 (ULEB128) + gridX/gridY/patternID
        this.offset = chunk.start + 0x24
        const data_offset = this.read_LEB128()

        const gridX = this.read_uint16_le()
        const gridY = this.read_uint16_le()
        const patternID = this.read_uint32_le()

        // Parse reserved parameters (numeric) before labels
        const reserved_params: number[] = []
        const labels: string[] = []

        while (this.offset < chunk.start + data_offset) {
            const b = this.buffer[this.offset]
            if (b !== undefined && b >= 32 && b <= 126) {
                break // looks like start of ASCII label strings
            }

            if (this.offset + 4 <= chunk.start + data_offset) {
                const float_val = this.read_float32_le()
                reserved_params.push(float_val)
            } else {
                this.offset = chunk.start + data_offset
                break
            }
        }

        // Parse null-terminated ASCII labels section before payload
        while (this.offset < chunk.start + data_offset) {
            if (this.buffer[this.offset] === 0) {
                this.offset++
                continue
            }

            this.str_pointer = this.offset
            this.read_until(0)
            if (this.str_pointer < this.offset) {
                const label = this.buffer
                    .subarray(this.str_pointer, this.offset)
                    .toString()
                if (label.length > 0) labels.push(label)
            }
            this.offset++ // skip NUL
        }

        const meta: ChunkMetadata = {
            dataOffset: data_offset,
            gridX,
            gridY,
            patternID,
            reserved_params,
            labels,
        }

        // Move to payload start
        this.offset = chunk.start + data_offset
        this.str_pointer = this.offset

        // Try to extract plugin name and collect candidate parameter starts
        let values: number[] = []
        let inferred_name: string | null = null
        const candidateParamStarts: number[] = []

        const knownPlugins = LogicProCSTParser.get_known_plugin_names()

        while (this.offset < chunk.end) {
            // Try bplist block
            if (
                this.offset + 6 <= chunk.end &&
                this.buffer
                    .subarray(this.offset, this.offset + 6)
                    .toString() === "bplist"
            ) {
                try {
                    const payload = parseBuffer(
                        this.buffer.subarray(this.offset, chunk.end)
                    )
                    const root = payload[0]
                    if (root && typeof root === "object") {
                        const nameKeys = [
                            "name",
                            "fullName",
                            "displayName",
                            "pluginName",
                            "AudioUnitName",
                        ]

                        for (const k of nameKeys) {
                            if ((root as any)[k]) {
                                const s = String((root as any)[k])
                                if (s) inferred_name = s
                                break
                            }
                        }
                    }
                    break
                } catch {
                    // ignore and continue
                }
            }

            // Parse strings to infer plugin name and detect parameter area keywords
            const b = this.buffer[this.offset]
            if (b !== undefined && b >= 32 && b <= 126) {
                // Read printable string
                this.str_pointer = this.offset
                this.read_until(0)
                const s = this.buffer
                    .subarray(this.str_pointer, this.offset)
                    .toString()

                // Infer plugin name by matching known plugin names appearing in strings
                if (!inferred_name && s) {
                    const match = knownPlugins.find((p) =>
                        s.toLowerCase().includes(p.toLowerCase())
                    )
                    if (match) inferred_name = match
                }

                // Parameter section markers: record the probable start just after NUL terminator
                if (s === "GAME" || s === "GAMETSPP") {
                    const probableStart = this.offset + 1
                    if (probableStart < chunk.end)
                        candidateParamStarts.push(probableStart)
                }

                // Skip the NUL terminator
                this.offset++
            } else {
                this.offset++
            }
        }

        // Resolve final plugin name (only keep known names; otherwise empty)
        audio_unit.name = this.resolve_plugin_name(inferred_name, meta.labels)

        // If we have a known plugin, try to parse exactly its parameter count using alignment heuristics
        const defsMap = LogicProCSTParser.load_param_name_map()
        let pluginKey = Object.keys(defsMap).find(
            (k) =>
                audio_unit.name.toLowerCase().includes(k.toLowerCase()) ||
                k.toLowerCase().includes(audio_unit.name.toLowerCase())
        )
        if (!pluginKey && audio_unit.name === "Amp") pluginKey = "Amp Designer"

        if (
            pluginKey &&
            defsMap[pluginKey] &&
            defsMap[pluginKey]!.length > 0 &&
            candidateParamStarts.length > 0
        ) {
            const expectedCount = Math.min(256, defsMap[pluginKey]!.length)
            // Try each candidate with alignments 0,4,8,12 and choose the best
            let bestScore = -1
            let bestValues: number[] | null = null
            for (const start of candidateParamStarts) {
                // Try a wider range of alignments (0..31 bytes)
                for (let align = 0; align < 32; align++) {
                    const vals = this.try_read_float_block(
                        start + align,
                        chunk.end,
                        expectedCount
                    )
                    const score = this.score_float_block(vals)
                    if (score > bestScore) {
                        bestScore = score
                        bestValues = vals
                    }
                }
            }
            if (bestValues && bestScore >= 0.7) {
                values = bestValues
            }
        }

        // Map values to friendly names using plugin settings
        audio_unit.parameters = this.map_parameters(audio_unit.name, values)

        const nonEmpty =
            audio_unit.name || Object.keys(audio_unit.parameters).length > 0
        return nonEmpty ? audio_unit : null
    }

    private resolve_plugin_name(
        inferred: string | null,
        labels: string[]
    ): string {
        const known = LogicProCSTParser.get_known_plugin_names()

        // Only accept names that include a known plugin token; otherwise, fall back to labels or empty string
        if (inferred) {
            const match = known.find((k) =>
                inferred.toLowerCase().includes(k.toLowerCase())
            )
            if (match) return match
        }

        for (const lab of labels) {
            const m = known.find((k) =>
                lab.toLowerCase().includes(k.toLowerCase())
            )
            if (m) return m
        }

        const aliases: Record<string, string> = {
            Amp: "Amp Designer",
        }
        if (inferred && aliases[inferred]) return aliases[inferred]

        // Otherwise, return empty to avoid bogus names like ")"
        return ""
    }

    // Parse a sequence of 4-byte values stopping at the first likely ASCII region or end.
    // For each dword, decode as float32; if it's NaN/Inf/absurd, use uint32.
    private parse_parameter_values_until_ascii_or_end(
        end_offset: number
    ): number[] {
        const vals: number[] = []
        const MAX_PARAMS = 256
        let count = 0

        while (this.offset + 4 <= end_offset) {
            // Detect if upcoming bytes look like the start of a printable ASCII string
            const b0 = this.buffer[this.offset]
            const b1 = this.buffer[this.offset + 1]
            const b2 = this.buffer[this.offset + 2]

            const looksAscii =
                b0 !== undefined &&
                b1 !== undefined &&
                b2 !== undefined &&
                b0 >= 32 &&
                b0 <= 126 &&
                b1 >= 32 &&
                b1 <= 126 &&
                b2 >= 32 &&
                b2 <= 126
            if (looksAscii) break

            const f = this.buffer.readFloatLE(this.offset)
            const u = this.buffer.readUInt32LE(this.offset)

            let chosen: number
            if (Number.isFinite(f) && Math.abs(f) < 1e6) {
                chosen = f
            } else {
                chosen = u
            }

            vals.push(chosen)
            this.offset += 4
            count++
            if (count >= MAX_PARAMS) break
        }

        return vals
    }

    // Try to read exactly expectedCount float32 parameters starting at start, stopping early on ASCII detection.
    private try_read_float_block(
        start: number,
        end_offset: number,
        expectedCount: number
    ): number[] {
        const vals: number[] = []
        let off = start
        for (let i = 0; i < expectedCount; i++) {
            if (off + 4 > end_offset) break
            const b0 = this.buffer[off]
            const b1 = this.buffer[off + 1]
            const b2 = this.buffer[off + 2]
            // Stop if likely ASCII
            if (
                b0 !== undefined &&
                b1 !== undefined &&
                b2 !== undefined &&
                b0 >= 32 &&
                b0 <= 126 &&
                b1 >= 32 &&
                b1 <= 126 &&
                b2 >= 32 &&
                b2 <= 126
            )
                break

            const f = this.buffer.readFloatLE(off)
            // Prefer float even if tiny; this avoids huge bogus uints like 4294967295
            const chosen = Number.isFinite(f)
                ? f
                : this.buffer.readUInt32LE(off)
            vals.push(chosen)
            off += 4
        }
        return vals
    }

    // Score a float block: fraction of values that look sensible in [~ -1000, 1000] or [0..1] ranges
    private score_float_block(vals: number[]): number {
        if (vals.length === 0) return 0
        let ok = 0
        for (const v of vals) {
            if (!Number.isFinite(v)) continue
            const av = Math.abs(v)
            if (av <= 1.0 + 1e-6)
                ok++ // normalized params
            else if (av <= 1000) ok++ // typical gain/Hz offsets in stored form
        }
        return ok / vals.length
    }

    private find_chunks(buffer: Buffer) {
        const magics = [Buffer.from("OCuA"), Buffer.from("UCuA")]
        const chunk_starts: Set<number> = new Set()

        for (const magic of magics) {
            let idx = 0
            while ((idx = buffer.indexOf(magic, idx)) !== -1) {
                chunk_starts.add(idx)
                idx += 1
            }
        }

        const offsets = Array.from(chunk_starts).sort((a, b) => a - b)
        const chunks: CSTChunk[] = []
        for (let i = 0; i < offsets.length; i++) {
            const start = offsets[i]!
            const end = i + 1 < offsets.length ? offsets[i + 1]! : buffer.length
            chunks.push({ start, end })
        }

        return chunks
    }

    private map_parameters(
        unit_name: string,
        values: number[]
    ): Record<string, number | string> {
        const result: Record<string, number | string> = {}
        const map = LogicProCSTParser.load_param_name_map()

        let pluginKey = Object.keys(map).find(
            (k) =>
                unit_name.toLowerCase().includes(k.toLowerCase()) ||
                k.toLowerCase().includes(unit_name.toLowerCase())
        )

        if (!pluginKey && unit_name === "Amp") pluginKey = "Amp Designer"

        if (!pluginKey || !map[pluginKey] || map[pluginKey]!.length === 0) {
            for (let i = 0; i < values.length; i++) {
                result[`param_${i}`] = Number(values[i]!)
            }
            return result
        }

        const defs = map[pluginKey]!.slice().sort((a, b) => a.index - b.index)

        const n = Math.min(defs.length, values.length)
        for (let i = 0; i < n; i++) {
            const name = defs[i]!.name
            const val = values[i]!
            result[name] = Number(val)
        }

        for (let i = n; i < values.length; i++) {
            result[`param_${i}`] = Number(values[i]!)
        }

        return result
    }

    private read_uint16_le(): number {
        if (this.offset + 2 > this.buffer.length) return 0

        const value = this.buffer.readUInt16LE(this.offset)
        this.skip_nbytes(2, true)

        return value
    }

    private read_uint32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0

        const value = this.buffer.readUInt32LE(this.offset)
        this.skip_nbytes(4, true)

        return value
    }

    private read_LEB128() {
        let result = 0
        let shift = 0
        let byte: number

        do {
            byte = this.buffer[this.offset++]!
            result |= (byte & 0x7f) << shift
            shift += 7
        } while (byte & 0x80 && this.offset < this.buffer.length)

        return result
    }

    private read_float32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0

        const value = this.buffer.readFloatLE(this.offset)
        this.skip_nbytes(4, true)

        return value
    }
}
