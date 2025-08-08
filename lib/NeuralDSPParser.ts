import { BaseParser } from "./BaseParser"

export class NeuralDSPParser extends BaseParser {
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
            // Legacy formats have only one module with all settings and presets
            if (key.includes("PARAM")) {
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

            value = this.read_string()
            if (value === "listElements") {
                value = this.read_list_elements()
            }

            // Start of a module
            if (key == "subModels") {
                // Commit previous module if it exists
                if (module.name !== "") {
                    preset.modules.push(module)
                }

                module = {
                    name: value.toString(), // subModels name
                    settings: {},
                }
                continue
            }

            module.settings[key] = value.toString() // normal key-value
        }

        return preset
    }

    private read_list_elements() {
        const END_MARKER = 0x000101
        let elements = []

        while (
            this.offset < this.buffer.length - 3 &&
            this.buffer.readUIntBE(this.offset + 1, 3) != END_MARKER
        ) {
            this.read_until_print_char()
            elements.push(this.read_string())
        }

        this.skip_nbytes(4, true)
        return elements
    }

    private has_null_value() {
        const MARKER_POSIX = 0x010205
        const MARKER_DOS = 0x010906

        return (
            this.offset < this.buffer.length - 3 &&
            (this.buffer.readUIntBE(this.offset + 1, 3) == MARKER_POSIX ||
                this.buffer.readUIntBE(this.offset + 1, 3) == MARKER_DOS)
        )
    }

    private has_enquired_value() {
        const MARKER = 0x010501
        return (
            this.offset < this.buffer.length - 3 &&
            this.buffer.readUIntBE(this.offset + 1, 3) == MARKER
        )
    }

    private parse_legacy_format() {
        let key: string = ""
        let value: string = ""
        let tmp: string = ""

        const settings: Record<string, string | null> = {}

        while (this.offset < this.buffer.length) {
            this.read_until_print_char()

            key = this.read_string()

            // id $key value $value
            if (key == "id") {
                this.read_until_print_char()
                tmp = this.read_string() // store $key in tmp so we can reuse key variable to read "value" marker
                continue
            }

            if (key == "value") {
                value = this.read_legacy_value()
                continue
            }

            // Commit previously read PARAM $key-$value
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

    private read_legacy_value() {
        const STRING_VALUE_MARKER = 0x010605

        if (this.buffer.readUintBE(this.offset + 1, 3) == STRING_VALUE_MARKER) {
            this.read_until_print_char()
            return this.read_string()
        }

        this.skip_nbytes(4, true) // padding
        const value = this.buffer.readDoubleLE(this.offset).toString()
        this.skip_nbytes(8, true) // sizeof(value)

        return value
    }
}
