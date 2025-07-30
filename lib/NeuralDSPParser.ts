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

        while (this.offset < this.buffer.length) {
            this.read_until_print_char()

            key = this.read_string()

            // Handle legacy formats
            // Legacy formats have only one module with all different params together
            if (key.includes("PARAM") && module.name == "") {
                module.name = "LEGACY FORMAT: Settings"
                // delegate remaining parsing work to legacy parser and break
                module.settings = this.parse_legacy_format()
                preset.modules.push(module)
                break
            }

            if (this.has_null_value()) {
                module.settings[key] = null
                continue
            }

            if (this.has_enquired_value()) {
                module.settings[key] = "EDITOR_VALUE"
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
                // Commit previous module if it exists
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

    print_offset() {
        console.log(this.offset.toString(16), this.buffer.length.toString(16))
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
        while (
            this.offset < this.buffer.length - 3 &&
            this.buffer.readUIntBE(this.offset + 1, 3) != END_MARKER
        ) {
            this.read_until_print_char()
            elements.push(this.read_string())
        }

        this.offset += 4
        return elements
    }

    has_null_value() {
        const MARKER_POSIX = 0x010205
        const MARKER_DOS = 0x10906

        return (
            this.offset < this.buffer.length - 3 &&
            (this.buffer.readUIntBE(this.offset + 1, 3) == MARKER_POSIX ||
                this.buffer.readUIntBE(this.offset + 1, 3) == MARKER_DOS)
        )
    }

    has_enquired_value() {
        const MARKER = 0x010501
        return (
            this.offset < this.buffer.length - 3 &&
            this.buffer.readUIntBE(this.offset + 1, 3) == MARKER
        )
    }

    parse_legacy_format() {
        let key: string = ""
        let value: string = ""
        let tmp: string = ""

        const settings: Record<string, string | null> = {}

        while (this.offset < this.buffer.length) {
            this.read_until_print_char()
            // if (this.offset === this.buffer.length) break

            key = this.read_string()
            if (key == "id") {
                this.read_until_print_char()
                tmp = this.read_string()
                continue
            }

            if (key == "value") {
                value = this.read_legacy_value()

                continue
            }

            if (key == "PARAM") {
                settings[tmp] = value
                tmp = ""
                continue
            }

            if (tmp !== "") {
                //dump tmp and backtrack offset to include this key that was parsed (definitely after the last PARAM)
                settings[tmp] = value

                // backtrack pointer
                this.offset -= key.length + 1

                tmp = ""
            } else {
                if (this.has_null_value()) {
                    settings[key] = null
                    continue
                }

                this.read_until_print_char()
                if (this.offset === this.buffer.length) break

                value = this.read_string()
                settings[key] = value
            }
        }

        return settings
    }

    read_legacy_value() {
        const STRING_VALUE_MARKER = 0x010605

        if (this.buffer.readUintBE(this.offset + 1, 3) == STRING_VALUE_MARKER) {
            this.read_until_print_char()
            return this.read_string()
        }

        this.offset += 4
        const value = this.buffer.readDoubleLE(this.offset).toString()
        this.offset += 8
        return value
    }
}
