import { BaseParser } from "./BaseParser"
import ASCII from "./ascii"

export class NeuralDSPParser extends BaseParser {
    parse() {
        const preset: NeuralDSPPreset = { name: "", amps: [], pedals: [] }

        this.read_until(ASCII.NUL)
        preset.name = this.buffer.subarray(0, this.offset).toString()

        console.log("Preset name:", preset.name)
        this.skip_nbytes(1)

        this.skip_whitespace()

        // 2. Other params
        for (let i = this.offset; i < this.offset + 72; i++) {
            console.log(this.buffer[i], String.fromCharCode(this.buffer[i]))
        }

        return preset
    }
}
