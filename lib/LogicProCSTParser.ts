import { BaseParser } from "./BaseParser"
import parseBuffer from "bplist-universal"

interface CSTChunk {
    start: number
    end: number
}

export class LogicProCSTParser extends BaseParser {
    parse(): LogicProPreset {
        const preset: LogicProPreset = {
            name: "",
            audio_units: [],
            channel_name: "",
        }

        for (const chunk of this.find_chunks(this.buffer)) {
            preset.audio_units.push(this.parse_chunk(chunk))
        }

        console.log("done")
        return preset
    }

    private parse_chunk(chunk: CSTChunk): LogicProAudioUnit {
        const audio_unit: LogicProAudioUnit = {
            name: "",
            parameters: {},
        }

        this.offset = chunk.start

        // chunk data offset at 0x24==36
        this.skip_nbytes(36, true)
        const data_offset = this.read_LEB128()

        // start parsing payload
        console.log("offset", data_offset)
        this.offset = chunk.start + data_offset
        this.str_pointer = this.offset

        this.read_until_print_char()
        const value = this.read_string()
        console.log("value", value)

        if (value.includes("bplist")) {
            console.log("bplist found at", this.offset)
            //backtrack pointer
            this.offset -= value.length
            const payload = parseBuffer(
                this.buffer.subarray(this.offset, chunk.end)
            )
            audio_unit.parameters["bplist"] = payload[0]
        } else {

        }

        console.log(audio_unit)
        return audio_unit
    }

    private find_chunks(buffer: Buffer) {
        const magics = [Buffer.from("OCuA"), Buffer.from("UCuA")]
        const chunk_starts: Set<number> = new Set()

        // collect every offset where one of the magics appears
        for (const magic of magics) {
            let idx = 0
            while ((idx = buffer.indexOf(magic, idx)) !== -1) {
                chunk_starts.add(idx)
                idx += 1 // move past this match
            }
        }

        // sort our chunk offsets
        const offsets = Array.from(chunk_starts).sort((a, b) => a - b)

        // build start/end list
        const chunks = []
        for (let i = 0; i < offsets.length; i++) {
            const start = offsets[i]!
            const end = i + 1 < offsets.length ? offsets[i + 1]! : buffer.length
            chunks.push({ start, end })
        }

        return chunks
    }

    private read_uint32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0

        const value = this.buffer.readUInt32LE(this.offset)
        this.skip_nbytes(4, true) // sizeof(value)

        return value
    }

    private read_LEB128() {
        let result = 0;
        let shift = 0;
        let byte: number;

        do {
            // read next byte
            byte = this.buffer[this.offset++]!;
            // append lower 7 bits
            result |= (byte & 0x7F) << shift;
            // prepare next shift
            shift += 7;
        } while (byte & 0x80 && this.offset < this.buffer.length);  // continue if high bit is set

        return result;
    }

    private read_float32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0

        const value = this.buffer.readFloatLE(this.offset)
        this.skip_nbytes(4, true) // sizeof(value)

        return value
    }
}
