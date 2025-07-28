import { BaseParser } from "./BaseParser"
import ASCII from "./ascii"

export class NeuralDSPParser extends BaseParser {
    pointer: number
    constructor(buffer: Buffer) {
        super(buffer)
        this.pointer = 0 // Initialize pointer to point at start of every string
    }
    parse() {
        const preset: NeuralDSPPreset = { name: "", modules: [] }

        preset.name = this.read_string()

        let key: string, value: string | string[]
        let module: NeuralDSPModule = {
            name: "",
            settings: {},
        }

        while (true) {
            this.read_until_print_char()
            key = this.read_string()

            if (this.has_null_value()) {
                module.settings[key] = null
                continue
            }

            this.read_until_print_char()
            if (this.offset === this.buffer.length) break

            value = this.read_string()
            if (value === "listElements") {
                value = this.read_list_elements()
            }

            // Start Module transaction
            if (key == "subModels") {
                //Commit previous module if it exists
                if (module.name !== "") {
                    preset.modules.push(module)
                }

                module = {
                    name: value.toString(),
                    settings: {},
                }
                continue
            }

            module.settings[key] = value.toString()
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
