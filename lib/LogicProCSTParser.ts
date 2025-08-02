import { BaseParser } from "./BaseParser"

export class LogicProCSTParser extends BaseParser {
    parse(): LogicProPreset {
        const preset: LogicProPreset = {
            name: "",
            audio_units: [],
            channel_name: "",
            filename: ""
        }

        this.offset = 0

        // Parse the binary format
        while (this.offset < this.buffer.length) {
            if (this.check_signature("OCuA") || this.check_signature("UCuA")) {
                this.skip_nbytes(4) // Skip signature
                const chunk = this.parse_chunk()
                if (chunk) {
                    preset.audio_units.push(chunk)
                }
            } else {
                this.offset++
            }
        }

        // Extract preset name from the first audio unit if available
        if (preset.audio_units.length > 0 && preset.audio_units[0]?.name) {
            preset.name = preset.audio_units[0].name
        }

        return preset
    }

    private check_signature(sig: string): boolean {
        if (this.offset + sig.length > this.buffer.length) return false
        return this.buffer.subarray(this.offset, this.offset + sig.length).toString() === sig
    }

    private parse_chunk(): LogicProAudioUnit | null {
        try {
            // Skip version and header info (next 24 bytes typically)
            this.skip_nbytes(24)
            
            // Read chunk size info
            const chunk_size = this.read_uint32_le()
            if (chunk_size === 0 || chunk_size > this.buffer.length) {
                return null
            }

            const chunk_end = this.offset + chunk_size - 28 // Account for already read bytes
            
            // Try to find the name string within this chunk
            const name = this.extract_audio_unit_name(chunk_end)
            
            const audio_unit: LogicProAudioUnit = {
                name: name || "Unknown",
                type: this.get_audio_unit_type(name || ""),
                parameters: {}
            }

            // Look for GAMETSPP parameter sections within this chunk
            this.extract_parameters_improved(audio_unit, chunk_end)

            // Move to end of chunk
            this.offset = Math.min(chunk_end, this.buffer.length)

            return audio_unit
        } catch (error) {
            return null
        }
    }

    private extract_audio_unit_name(chunk_end: number): string | null {
        const start_offset = this.offset
        
        // Look for printable ASCII strings of reasonable length within this chunk
        while (this.offset < chunk_end && this.offset < this.buffer.length) {
            const byte = this.buffer[this.offset]
            
            // If we find a printable ASCII character
            if (byte !== undefined && byte >= 32 && byte <= 126) {
                const str_start = this.offset
                let str_length = 0
                
                // Read until we hit a null byte or non-printable
                while (this.offset < chunk_end && this.offset < this.buffer.length) {
                    const current_byte = this.buffer[this.offset]
                    if (current_byte === undefined || 
                        current_byte < 32 || 
                        current_byte > 126 ||
                        str_length >= 100) {
                        break
                    }
                    str_length++
                    this.offset++
                }
                
                if (str_length > 3 && str_length < 50) { // Audio unit names are reasonable length
                    const str = this.buffer.subarray(str_start, str_start + str_length).toString().trim()
                    // Filter out known non-name strings
                    if (!str.includes("GAME") && !str.includes("OCuA") && !str.includes("UCuA") &&
                        !str.match(/^[A-F0-9]+$/) && str.length > 2) {
                        return str
                    }
                }
            }
            
            this.offset++
            
            // Don't search too far from start
            if (this.offset - start_offset > 200) {
                break
            }
        }
        
        return null
    }

    private get_audio_unit_type(name: string): string {
        const lower_name = name.toLowerCase()
        
        if (lower_name.includes("eq")) return "equalizer"
        if (lower_name.includes("compressor")) return "compressor"
        if (lower_name.includes("gate")) return "gate"
        if (lower_name.includes("delay")) return "delay"
        if (lower_name.includes("reverb")) return "reverb"
        if (lower_name.includes("distortion") || lower_name.includes("overdrive")) return "distortion"
        if (lower_name.includes("chorus") || lower_name.includes("flanger")) return "modulation"
        if (lower_name.includes("amp")) return "amplifier"
        if (lower_name.includes("pedalboard")) return "multi_effect"
        
        return "effect"
    }

    private extract_parameters_improved(audio_unit: LogicProAudioUnit, chunk_end: number): void {
        const start_offset = this.offset
        
        // Search for GAMETSPP marker within this chunk
        while (this.offset < chunk_end - 8 && this.offset < this.buffer.length) {
            if (this.check_signature("GAMETSPP")) {
                this.skip_nbytes(8) // Skip GAMETSPP signature
                
                // Read the parameter data size (next 4 bytes)
                const param_data_size = this.read_uint32_le()
                
                // Skip additional header bytes (4 more bytes typically)
                this.skip_nbytes(4)
                
                // Extract parameter values based on audio unit type
                this.extract_typed_parameters(audio_unit, param_data_size)
                return
            }
            this.offset++
        }
        
        // Fallback: look for GAME marker (shorter version)
        this.offset = start_offset
        while (this.offset < chunk_end - 4 && this.offset < this.buffer.length) {
            if (this.check_signature("GAME")) {
                this.skip_nbytes(4) // Skip GAME signature
                
                // Skip some header bytes
                this.skip_nbytes(8)
                
                // Try to extract a few basic parameters
                this.extract_basic_parameters(audio_unit, 8)
                return
            }
            this.offset++
        }
    }

    private extract_typed_parameters(audio_unit: LogicProAudioUnit, data_size: number): void {
        const param_names = this.get_parameter_names_by_type(audio_unit.name, audio_unit.type)
        const max_params = Math.min(param_names.length, Math.floor(data_size / 4), 20)
        
        for (let i = 0; i < max_params && this.offset + 4 <= this.buffer.length; i++) {
            const float_val = this.read_float32_le()
            
            // Filter out padding values and obviously invalid data
            if (!isNaN(float_val) && isFinite(float_val) && 
                !this.is_padding_value(float_val)) {
                
                const param_name = param_names[i] || `param_${i}`
                
                // Apply value filtering based on parameter type and range
                const filtered_value = this.filter_parameter_value(float_val, param_name, audio_unit.type)
                if (filtered_value !== null) {
                    audio_unit.parameters[param_name] = filtered_value
                }
            }
        }
    }

    private extract_basic_parameters(audio_unit: LogicProAudioUnit, max_count: number): void {
        const param_names = this.get_parameter_names_by_type(audio_unit.name, audio_unit.type)
        let param_count = 0
        
        for (let i = 0; i < max_count && this.offset + 4 <= this.buffer.length && param_count < param_names.length; i++) {
            const float_val = this.read_float32_le()
            
            if (!isNaN(float_val) && isFinite(float_val) && 
                !this.is_padding_value(float_val)) {
                
                const param_name = param_names[param_count] || `param_${param_count}`
                const filtered_value = this.filter_parameter_value(float_val, param_name, audio_unit.type)
                
                if (filtered_value !== null) {
                    audio_unit.parameters[param_name] = filtered_value
                    param_count++
                }
            }
        }
    }

    private is_padding_value(value: number): boolean {
        // Check if this looks like padding
        const int_representation = this.buffer.readUInt32LE(this.offset - 4)
        return int_representation === 0x714971CA || // caf2 4971 pattern
               (Math.abs(value) < 1e-30) || // Very close to zero
               (value > 1e30) // Extremely large values
    }

    private filter_parameter_value(value: number, param_name: string, unit_type: string): number | null {
        const lower_name = param_name.toLowerCase()
        
        // Type-specific filtering
        if (unit_type === "compressor") {
            if (lower_name.includes("threshold") && (value < -96 || value > 0)) return null
            if (lower_name.includes("ratio") && (value < 1 || value > 50)) return null
            if (lower_name.includes("attack") && (value < 0.1 || value > 1000)) return null
            if (lower_name.includes("release") && (value < 1 || value > 5000)) return null
        } else if (unit_type === "equalizer") {
            if (lower_name.includes("freq") && (value < 10 || value > 30000)) return null
            if (lower_name.includes("gain") && (value < -48 || value > 48)) return null
            if (lower_name.includes("q") && (value < 0.1 || value > 100)) return null
        } else if (unit_type === "delay") {
            if (lower_name.includes("time") && (value < 0 || value > 5000)) return null
            if (lower_name.includes("feedback") && (value < 0 || value > 1)) return null
        }
        
        // General range filtering
        if (Math.abs(value) > 100000) return null // Extremely large values
        if (Math.abs(value) < 1e-10 && Math.abs(value) > 0) return null // Tiny non-zero values
        
        // Round appropriately based on magnitude
        if (Math.abs(value) < 0.01) {
            return Math.round(value * 10000) / 10000
        } else if (Math.abs(value) < 1) {
            return Math.round(value * 1000) / 1000
        } else if (Math.abs(value) < 100) {
            return Math.round(value * 100) / 100
        } else {
            return Math.round(value * 10) / 10
        }
    }

    private get_parameter_names_by_type(unit_name: string, unit_type: string): string[] {
        const lower_name = unit_name.toLowerCase()
        
        // Use more specific parameter names based on actual Logic Pro audio units
        if (unit_type === "gate" || lower_name.includes("gate") || lower_name.includes("noise")) {
            return ["threshold", "ratio", "attack", "release", "hold", "lookahead", "bypass"]
        } else if (unit_type === "compressor" || lower_name.includes("comp")) {
            return ["threshold", "ratio", "attack", "release", "makeup_gain", "knee", "bypass", "auto_gain", "peak_limiter", "detector_HPF", "mix", "side_chain", "vintage_mode", "bypass_auto", "output_level"]
        } else if (unit_type === "equalizer" || lower_name.includes("eq")) {
            return ["low_freq", "low_gain", "low_Q", "low_mid_freq", "low_mid_gain", "low_mid_Q", 
                   "high_mid_freq", "high_mid_gain", "high_mid_Q", "high_freq", "high_gain", "high_Q",
                   "highpass_freq", "lowpass_freq", "overall_gain", "bypass"]
        } else if (unit_type === "delay" || lower_name.includes("delay") || lower_name.includes("echo")) {
            return ["delay_time", "feedback", "mix", "high_cut", "low_cut", "sync_mode", "sync_note", 
                   "tape_drive", "tape_wow", "freeze", "reverse", "bypass", "tempo_sync", "ping_pong", 
                   "modulation_rate", "modulation_depth", "diffusion", "tone", "vintage_mode"]
        } else if (unit_type === "reverb" || lower_name.includes("reverb") || lower_name.includes("hall")) {
            return ["room_size", "decay_time", "damping", "early_reflections", "mix", "pre_delay", 
                   "diffusion", "density", "high_cut", "low_cut", "modulation", "freeze", "bypass"]
        } else if (unit_type === "distortion" || lower_name.includes("distortion") || lower_name.includes("overdrive")) {
            return ["drive", "tone", "level", "bypass", "symmetry", "squeeze", "output_gain"]
        } else if (unit_type === "modulation" || lower_name.includes("chorus") || lower_name.includes("flanger")) {
            return ["rate", "depth", "feedback", "mix", "delay", "phase", "bypass", "sync_mode", "waveform"]
        } else if (lower_name.includes("filter")) {
            return ["cutoff", "resonance", "drive", "mix", "bypass", "filter_type", "slope", "key_follow"]
        } else if (unit_type === "amplifier" || lower_name.includes("amp")) {
            return ["gain", "bass", "mid", "treble", "presence", "volume", "bypass", "vintage_mode"]
        } else if (unit_type === "multi_effect" || lower_name.includes("pedalboard")) {
            return ["input_gain", "output_level", "mix", "bypass", "effect_1", "effect_2", "effect_3", "routing"]
        }
        
        // Default generic parameter names for unknown audio units
        return ["level", "mix", "rate", "depth", "feedback", "drive", "tone", "bypass",
               "attack", "release", "threshold", "ratio", "frequency", "gain", "q_factor"]
    }

    private read_uint32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0
        const value = this.buffer.readUInt32LE(this.offset)
        this.offset += 4
        return value
    }

    private read_float32_le(): number {
        if (this.offset + 4 > this.buffer.length) return 0
        const value = this.buffer.readFloatLE(this.offset)
        this.offset += 4
        return value
    }
}