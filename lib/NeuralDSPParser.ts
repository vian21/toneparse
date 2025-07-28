import { BaseParser } from "./BaseParser"
import ASCII from "./ascii"

export class NeuralDSPParser extends BaseParser {
    pointer: number
    constructor(buffer: Buffer) {
        super(buffer)
        this.pointer = 0 // Initialize pointer to point at start of every string
    }
    parse() {
        const preset: NeuralDSPPreset = { name: "", amps: [], pedals: [] }

        preset.name = this.read_string()
        console.log("Preset name:", preset.name)

        let key: string, value: string | string[]
        while (true) {
            this.read_until_print_char()
            key = this.read_string()
            if (this.has_null_value()) {
                preset[key] = null
                console.log(key, null)
                continue
            }

            this.read_until_print_char()
            if (this.offset === this.buffer.length) {
                preset[key] = ""
                console.log(key, "")
                break
            }
            value = this.read_string()
            if (value === "listElements") {
                value = this.read_list_elements()
            }

            preset[key] = value
            console.log(key, value)
        }

        return preset
    }

    read_until_print_char() {
        while (
            this.offset < this.buffer.length &&
            this.buffer[this.offset] < ASCII.PRINTABLE_CHAR_START
        ) {
            this.offset++
        }

        this.pointer = this.offset
    }

    read_string() {
        this.read_until(ASCII.NUL)
        return this.buffer.subarray(this.pointer, this.offset).toString()
    }

    read_list_elements() {
        const END_MARKER = 0x000101
        let elements = []
        while (this.buffer.readUIntBE(this.offset + 1, 3) != END_MARKER) {
            this.read_until_print_char()
            elements.push(this.read_string())
        }

        this.offset += 4
        return elements
    }

    has_null_value() {
        const MARKER = 0x010205
        return (
            this.offset < this.buffer.length - 3 &&
            this.buffer.readUIntBE(this.offset + 1, 3) == MARKER
        )
    }
}
