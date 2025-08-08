import ASCII from "./ascii"

export abstract class BaseParser {
    protected buffer: Buffer
    protected offset: number

    // pointer to point at start of every string
    protected str_pointer: number

    // Number of bytes that were skipped using skip_nbytes(). This will be used to calculate coverage
    protected skipped_bytes: number = 0

    constructor(buffer: Buffer) {
        this.buffer = buffer
        this.offset = 0
        this.str_pointer = 0
    }

    abstract parse(): Preset

    protected read_until(code: number) {
        for (
            ;
            this.offset < this.buffer.length &&
            this.buffer[this.offset] != code;
            this.offset++
        ) { }
    }

    protected read_until_print_char() {
        while (
            (this.offset < this.buffer.length &&
                this.buffer[this.offset]! < ASCII.PRINTABLE_CHAR_START) ||
            this.buffer[this.offset]! > ASCII.PRINTABLE_CHAR_END
        ) {
            this.offset++
        }

        this.str_pointer = this.offset
    }

    /**
     * Read Nul terminated string starting from current offset
     */
    protected read_string() {
        this.read_until(ASCII.NUL)
        return this.buffer.subarray(this.str_pointer, this.offset).toString()
    }

    protected skip_nbytes(n: number, known = false) {
        this.offset += n

        if (!known) this.skipped_bytes += n
    }

    public get_coverage() {
        return ((1 - this.skipped_bytes / this.buffer.length) * 100).toFixed(2)
    }

    protected print_offset() {
        console.log(this.offset.toString(16), this.buffer.length.toString(16))
    }
}
