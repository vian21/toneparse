import { BaseParser } from "./BaseParser"
import parseBuffer from "bplist-universal"

// Audio Unit Type Identifiers mapping
const AUDIO_UNIT_IDENTIFIERS: Record<string, string> = {
    "xoBS@": "effect_unit", // Unknown effect unit
    xoBSH: "effect_header", // Unknown effect header
    B90PL: "plugin", // Plugin effect
    "33CA": "equalizer", // Likely Channel EQ
    ORPL: "compressor", // Likely Compressor
    x8PL: "gate", // Likely Noise Gate
}

export class LogicProCSTParser extends BaseParser {
    // Track parsing statistics
    private parsedBytes = 0
    private totalBytes = 0
    private bplistCount = 0

    parse(): LogicProPreset {
        this.totalBytes = this.buffer.length

        const preset: LogicProPreset = {
            name: "",
            audio_units: [],
            channel_name: "",
            parsing_stats: {
                total_bytes: this.totalBytes,
                parsed_bytes: 0,
                parsed_percentage: 0,
                bplist_count: 0,
            },
        }

        // Parse the binary format
        while (this.offset < this.buffer.length) {
            if (this.check_signature("OCuA") || this.check_signature("UCuA")) {
                this.skip_nbytes(4) // Skip signature
                const chunk = this.parse_chunk()
                if (chunk) {
                    preset.audio_units.push(chunk)
                }
            } else if (this.check_signature("bplist")) {
                // Try to parse standalone bplists outside of audio unit chunks
                const start = this.offset

                // Find a reasonable end for this bplist (looking for 32-byte trailer)
                let end = Math.min(start + 10000, this.buffer.length)

                // Try to parse this standalone bplist
                try {
                    const plistData = this.buffer.subarray(start, end)
                    const parsedPlist = parseBuffer(plistData)

                    if (parsedPlist && parsedPlist.length > 0) {
                        // Create a new audio unit for this standalone bplist
                        const plistUnit: LogicProAudioUnit = {
                            name: "Standalone Binary Plist",
                            type: "metadata",
                            parameters: {},
                            metadata: {
                                standalone_plist: true,
                                plist_data: parsedPlist[0],
                            },
                        }

                        // Extract some key data from the plist if available
                        const data = parsedPlist[0]
                        if (data) {
                            if (data.name && typeof data.name === "string") {
                                plistUnit.name = data.name
                            }

                            // Convert simple properties to parameters
                            Object.entries(data).forEach(([key, value]) => {
                                if (
                                    typeof value === "number" ||
                                    typeof value === "boolean"
                                ) {
                                    plistUnit.parameters[key] =
                                        typeof value === "boolean"
                                            ? value
                                                ? 1
                                                : 0
                                            : value
                                }
                            })
                        }

                        preset.audio_units.push(plistUnit)
                        this.bplistCount++
                        this.parsedBytes += end - start
                    }

                    // Skip past this bplist
                    this.offset = end
                } catch (error) {
                    // If parsing fails, just move forward
                    this.offset += 8 // Skip signature at minimum
                }
            } else {
                this.offset++
            }
        }

        // Extract preset name from the first audio unit if available
        if (preset.audio_units.length > 0 && preset.audio_units[0]?.name) {
            preset.name = preset.audio_units[0].name
        }

        // Find channel name from metadata if available
        for (const unit of preset.audio_units) {
            if (unit.metadata?.plist_data?.Channel_name) {
                preset.channel_name = unit.metadata.plist_data.Channel_name
                break
            }
        }

        // Update parsing statistics
        preset.parsing_stats = {
            total_bytes: this.totalBytes,
            parsed_bytes: this.parsedBytes,
            parsed_percentage: Math.round(
                (this.parsedBytes / this.totalBytes) * 100
            ),
            bplist_count: this.bplistCount,
        }

        return preset
    }

    private check_signature(sig: string): boolean {
        if (this.offset + sig.length > this.buffer.length) return false
        return (
            this.buffer
                .subarray(this.offset, this.offset + sig.length)
                .toString() === sig
        )
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

            const chunk_start = this.offset
            const chunk_end = this.offset + chunk_size - 28 // Account for already read bytes

            // Try to find the name string within this chunk
            const name = this.extract_audio_unit_name(chunk_end)

            // Try to detect an audio unit identifier within this chunk
            const identifier = this.detect_audio_unit_identifier(
                chunk_start,
                chunk_end
            )

            // Use identifier to improve type detection
            const type =
                identifier && AUDIO_UNIT_IDENTIFIERS[identifier]
                    ? AUDIO_UNIT_IDENTIFIERS[identifier]
                    : this.get_audio_unit_type(name || "")

            const audio_unit: LogicProAudioUnit = {
                name: name || "Unknown",
                type: type,
                parameters: {},
                metadata: {}, // Add metadata field for additional context
            }

            // Look for GAMETSPP parameter sections within this chunk
            this.extract_parameters_improved(audio_unit, chunk_end)

            // Try to extract binary plist parameters
            const plistInfo = this.detect_binary_plist(chunk_start, chunk_end)
            if (plistInfo !== null) {
                this.extract_binary_plist_parameters(
                    audio_unit,
                    chunk_start,
                    chunk_end
                )
                // Track successful bplist parsing
                this.bplistCount++
                this.parsedBytes += plistInfo.end - plistInfo.start
            }

            // Add identifier metadata if found
            if (identifier) {
                audio_unit.metadata = {
                    ...audio_unit.metadata,
                    audio_unit_identifier: identifier,
                }
            }

            // Refine type based on extracted parameters
            this.refine_audio_unit_type(audio_unit)

            // Track parsing progress for this chunk
            this.parsedBytes += chunk_size

            // Move to end of chunk
            this.offset = Math.min(chunk_end, this.buffer.length)

            return audio_unit
        } catch (error) {
            return null
        }
    }

    private refine_audio_unit_type(audio_unit: LogicProAudioUnit): void {
        // Use parameters extracted from binary plists to refine the audio unit type

        // Check for specific parameters that indicate certain unit types
        if (audio_unit.metadata?.plist_parsed) {
            // Track Settings typically have these parameters
            if (
                audio_unit.parameters["outputChannel"] !== undefined &&
                audio_unit.parameters["bypass"] !== undefined &&
                audio_unit.parameters["color"] !== undefined
            ) {
                audio_unit.type = "track_settings"
                audio_unit.metadata = {
                    ...audio_unit.metadata,
                    source: "binary_plist",
                    description:
                        "Track configuration settings from binary plist",
                }
            }

            // Check for other specific binary plist patterns
            // For example, plugin settings often have certain parameter patterns
            if (audio_unit.name.includes("bplist")) {
                if (
                    audio_unit.parameters["keys"] !== undefined &&
                    audio_unit.parameters["objects"] !== undefined
                ) {
                    audio_unit.type = "plugin_settings"
                    audio_unit.metadata = {
                        ...audio_unit.metadata,
                        source: "binary_plist",
                        description:
                            "Plugin configuration data from binary plist",
                    }
                }
            }
        }

        // If we have unknown or generic effect types with specific parameters, try to refine them
        if (audio_unit.type === "effect" || audio_unit.type === "effect_unit") {
            // Look for characteristic parameters to determine effect type
            const params = Object.keys(audio_unit.parameters)

            if (
                params.includes("threshold") &&
                params.includes("ratio") &&
                params.includes("attack")
            ) {
                if (params.includes("hold") && params.includes("lookahead")) {
                    audio_unit.type = "gate"
                } else {
                    audio_unit.type = "dynamics"
                }
            } else if (
                params.includes("delay_time") ||
                params.includes("feedback") ||
                params.includes("ping_pong")
            ) {
                audio_unit.type = "delay"
            } else if (
                params.includes("low_Q") ||
                params.includes("high_Q") ||
                params.includes("mid_gain")
            ) {
                audio_unit.type = "equalizer"
            } else if (params.includes("drive") && params.includes("tone")) {
                audio_unit.type = "distortion"
            } else if (
                params.includes("rate") &&
                params.includes("depth") &&
                params.includes("mix")
            ) {
                audio_unit.type = "modulation"
            }
        }

        // Add refinement source to metadata if type was refined
        if (audio_unit.metadata && !audio_unit.metadata.type_source) {
            audio_unit.metadata.type_source = "parameter_analysis"
        }
    }

    private detect_audio_unit_identifier(
        chunk_start: number,
        chunk_end: number
    ): string | null {
        // Save current offset
        const original_offset = this.offset

        // Scan for common audio unit identifiers
        for (
            let scan_offset = chunk_start;
            scan_offset < chunk_end - 4;
            scan_offset++
        ) {
            this.offset = scan_offset

            // Check for any of our known identifiers
            for (const identifier of Object.keys(AUDIO_UNIT_IDENTIFIERS)) {
                if (this.check_signature(identifier)) {
                    // Restore original offset before returning
                    this.offset = original_offset
                    return identifier
                }
            }
        }

        // Restore original offset if nothing found
        this.offset = original_offset
        return null
    }

    private detect_binary_plist(
        chunk_start: number,
        chunk_end: number
    ): { start: number; end: number } | null {
        // Save current offset
        const original_offset = this.offset

        // Scan for binary plist signature
        for (
            let scan_offset = chunk_start;
            scan_offset < chunk_end - 8;
            scan_offset++
        ) {
            this.offset = scan_offset

            // Check for bplist00 signature
            if (this.check_signature("bplist")) {
                // Found a binary plist - return its start position
                const plist_start = scan_offset

                // Calculate the end of the plist using trailer information
                // Binary plist has a 32-byte trailer at the end with structure info
                // We need to check if we have enough bytes left to read the trailer
                if (chunk_end - plist_start > 32) {
                    // First, check that we have at least 8 bytes for the signature
                    // and then find the trailer at the end of the plist
                    const trailer_offset = chunk_end - 32
                    this.offset = trailer_offset

                    // Restore original offset before returning
                    this.offset = original_offset
                    return {
                        start: plist_start,
                        end: chunk_end,
                    }
                }

                this.offset = original_offset
                return {
                    start: plist_start,
                    end: chunk_end,
                }
            }
        }

        // Restore original offset if nothing found
        this.offset = original_offset
        return null
    }

    private extract_binary_plist_parameters(
        audio_unit: LogicProAudioUnit,
        chunk_start: number,
        chunk_end: number
    ): void {
        // Detect if there's a binary plist in this chunk
        const plistInfo = this.detect_binary_plist(chunk_start, chunk_end)

        if (plistInfo !== null) {
            try {
                // Store original offset
                const original_offset = this.offset

                // Extract the plist data section
                const plistData = this.buffer.subarray(
                    plistInfo.start,
                    plistInfo.end
                )

                // Use the bplist-universal package to parse the binary plist
                const parsedPlist = parseBuffer(plistData)

                // Extract parameters from parsed plist
                if (parsedPlist && parsedPlist.length > 0) {
                    const plistRoot = parsedPlist[0]

                    // Store the parsed plist in metadata for inspection
                    audio_unit.metadata = {
                        ...audio_unit.metadata,
                        plist_parsed: true,
                        plist_parser: "bplist-universal",
                    }

                    // Process the parsed plist data
                    this.processParsedPlist(audio_unit, plistRoot)
                } else {
                    // Fallback to original parsing if bplist-universal fails
                    this.fallbackParsePlist(
                        audio_unit,
                        plistInfo.start,
                        plistInfo.end
                    )
                }

                // Restore original offset
                this.offset = original_offset
            } catch (error) {
                // If bplist-universal parsing fails, try with our original method
                try {
                    this.fallbackParsePlist(
                        audio_unit,
                        plistInfo.start,
                        plistInfo.end
                    )
                } catch (fallbackError) {
                    // If anything goes wrong, just add to metadata
                    audio_unit.metadata = {
                        ...audio_unit.metadata,
                        plist_parse_error: true,
                    }
                }
            }
        }
    }

    private processParsedPlist(
        audio_unit: LogicProAudioUnit,
        plistData: any
    ): void {
        // Check if plistData is an object
        if (plistData && typeof plistData === "object") {
            // Extract parameters based on the structure of the plist

            // First check if it's a plugin or audio unit configuration
            if (plistData.data && typeof plistData.data === "object") {
                // Extract plugin parameters if available
                this.extractPluginParameters(audio_unit, plistData.data)
            } else {
                // Extract parameters directly from root object
                this.extractGeneralParameters(audio_unit, plistData)
            }

            // Keep names as-is, don't remap keys
            if (plistData.bypass !== undefined) {
                audio_unit.parameters["bypass"] = Number(plistData.bypass)
            }

            if (plistData.outputChannel !== undefined) {
                audio_unit.parameters["outputChannel"] = Number(
                    plistData.outputChannel
                )
            }

            if (plistData.color !== undefined) {
                audio_unit.parameters["color"] = Number(plistData.color)
            }

            // If we find a name, update the audio unit name
            if (
                plistData.name &&
                typeof plistData.name === "string" &&
                plistData.name.length > 0
            ) {
                if (
                    audio_unit.name === "Unknown" ||
                    audio_unit.name.includes("bplist")
                ) {
                    audio_unit.name = plistData.name
                }
            }

            // Try to determine audio unit type from plist data
            this.determinePlistAudioUnitType(audio_unit, plistData)
        }
    }

    private extractPluginParameters(
        audio_unit: LogicProAudioUnit,
        data: any
    ): void {
        // Look for common parameter structures in Logic Pro plugin data

        // Check for parameter arrays (common in AU plugins)
        if (Array.isArray(data.parameters)) {
            data.parameters.forEach((param: any) => {
                if (param.name && param.value !== undefined) {
                    // Keep original parameter name
                    audio_unit.parameters[param.name] = this.normalizeValue(
                        param.value,
                        param.name
                    )
                }
            })
        }

        // Check for key-value parameter objects (common in some plugins)
        if (data.parameterValues && typeof data.parameterValues === "object") {
            Object.entries(data.parameterValues).forEach(([key, value]) => {
                // Keep original parameter name without cleaning
                if (key) {
                    // @ts-ignore
                    audio_unit.parameters[key] = this.normalizeValue(value, key)
                }
            })
        }
    }

    private extractGeneralParameters(
        audio_unit: LogicProAudioUnit,
        data: any
    ): void {
        // Extract general parameters from any object type
        Object.entries(data).forEach(([key, value]) => {
            // Skip complex objects and arrays
            if (
                typeof value === "number" ||
                typeof value === "boolean" ||
                typeof value === "string"
            ) {
                const paramName = this.cleanBinaryPlistKey(key)
                if (paramName) {
                    const mappedKey = this.mapBinaryPlistKey(
                        paramName,
                        audio_unit.type
                    )
                    let paramValue: number | string

                    // Convert to appropriate type
                    if (typeof value === "boolean") {
                        paramValue = value ? 1 : 0
                    } else if (
                        typeof value === "string" &&
                        !isNaN(Number(value))
                    ) {
                        paramValue = Number(value)
                    } else if (typeof value === "number") {
                        paramValue = value
                    } else {
                        // Keep strings as-is for descriptive parameters
                        // @ts-ignore - we'll allow string values for certain parameters
                        paramValue = value
                    }

                    audio_unit.parameters[mappedKey] =
                        typeof paramValue === "number"
                            ? this.normalizeValue(paramValue, mappedKey)
                            : paramValue
                }
            }
        })
    }

    private determinePlistAudioUnitType(
        audio_unit: LogicProAudioUnit,
        plistData: any
    ): void {
        // Try to determine audio unit type from plist data

        // Check for manufacturer info
        if (plistData.manufacturer) {
            audio_unit.metadata = {
                ...audio_unit.metadata,
                manufacturer: plistData.manufacturer,
            }
        }

        // Check for plugin type identifiers
        if (plistData.subtype && plistData.type) {
            audio_unit.metadata = {
                ...audio_unit.metadata,
                plugin_type: plistData.type,
                plugin_subtype: plistData.subtype,
            }

            // Determine plugin type from the type and subtype
            if (
                plistData.subtype === "eq  " ||
                plistData.subtype === "eq\u0000\u0000"
            ) {
                audio_unit.type = "equalizer"
            } else if (
                plistData.subtype === "comp" ||
                plistData.subtype === "cmpr"
            ) {
                audio_unit.type = "compressor"
            } else if (
                plistData.subtype === "gate" ||
                plistData.subtype === "ngt\u0000"
            ) {
                audio_unit.type = "gate"
            } else if (plistData.subtype === "dely") {
                audio_unit.type = "delay"
            } else if (
                plistData.subtype === "rvb\u0000" ||
                plistData.subtype === "verb"
            ) {
                audio_unit.type = "reverb"
            } else if (plistData.subtype === "dist") {
                audio_unit.type = "distortion"
            }
        }

        // Check for characteristic parameters to improve type detection
        const params = Object.keys(audio_unit.parameters)

        if (
            params.includes("threshold") &&
            params.includes("ratio") &&
            params.includes("attack")
        ) {
            if (params.includes("hold") && params.includes("lookahead")) {
                audio_unit.type = "gate"
            } else {
                audio_unit.type = "compressor"
            }
        } else if (
            params.includes("room_size") ||
            params.includes("decay_time")
        ) {
            audio_unit.type = "reverb"
        } else if (
            params.includes("delay_time") ||
            params.includes("feedback")
        ) {
            audio_unit.type = "delay"
        }
    }

    private fallbackParsePlist(
        audio_unit: LogicProAudioUnit,
        start: number,
        end: number
    ): void {
        // Store original offset
        const original_offset = this.offset

        // Jump to the plist start
        this.offset = start

        // Skip "bplist" signature
        this.skip_nbytes(8)

        // Get some info from the trailer (typically at end of plist)
        // We'll go to near the end of the chunk to find the trailer
        const trailer_offset = Math.max(end - 32, start + 32)
        this.offset = trailer_offset

        // Try to find any parameters in the binary plist
        // Common types we're looking for:
        // - 0x50-0x5F: ASCII strings (0101 nnnn)
        // - 0x20-0x2F: Real numbers (0010 nnnn)
        // - 0x10-0x1F: Integer values (0001 nnnn)
        // - 0xD0-0xDF: Dictionary (1101 nnnn)

        // For now, let's try to extract some basic parameters
        // Search for ASCII strings that might be parameter names
        this.offset = start + 8 // Skip signature
        const strings = this.extract_strings_from_plist(end)

        // Look for numeric values following strings
        const values = this.extract_values_from_plist(end)

        // Map some of the found strings to parameters
        const paramMap: Record<string, number> = {}

        // First pass: collect key-value pairs
        for (let i = 0; i < Math.min(strings.length, values.length); i++) {
            const key = strings[i]
            const value = values[i]

            if (key && value !== undefined) {
                // Filter out common non-parameter strings and invalid values
                if (
                    !key.includes("$") &&
                    !key.includes("version") &&
                    !key.includes("archive") &&
                    key.length > 2 &&
                    key.length < 30 &&
                    isFinite(value) &&
                    !isNaN(value)
                ) {
                    // Don't clean up the key name, keep original
                    paramMap[key] = value
                }
            }
        }

        // Second pass: keep original parameter names
        for (const [key, value] of Object.entries(paramMap)) {
            audio_unit.parameters[key] = this.normalizeValue(value, key)
        }
        // Don't add any special indicators, just pass through the parameters
        // Note that we used fallback parsing
        audio_unit.metadata = {
            ...audio_unit.metadata,
            plist_parsed: true,
            plist_parser: "fallback",
        }

        // Restore original offset
        this.offset = original_offset
    }

    private cleanBinaryPlistKey(key: string): string | null {
        // Remove any non-printable characters
        let cleanKey = key.replace(/[^\x20-\x7E]/g, "")

        // Remove common prefixes
        cleanKey = cleanKey.replace(/^(NS\.|plist_)/, "")

        // Remove any remaining spaces or special characters
        cleanKey = cleanKey.trim()

        if (cleanKey.length < 2) return null

        return cleanKey
    }

    private mapBinaryPlistKey(key: string): string {
        // No mapping, keep original key names
        return key
    }

    private normalizeValue(value: number, key: string): number {
        // Convert values to more meaningful ranges based on the key
        if (key.includes("bypass")) {
            // Bypass is usually 0 or 1
            return value === 0 ? 0 : 1
        }

        if (key.includes("color")) {
            // Color values are often large integers
            return value
        }

        // For other numeric values, round to reasonable precision
        if (Math.abs(value) < 0.01) {
            return Math.round(value * 10000) / 10000
        } else if (Math.abs(value) < 1) {
            return Math.round(value * 1000) / 1000
        } else if (Math.abs(value) < 100) {
            return Math.round(value * 100) / 100
        } else {
            return Math.round(value)
        }
    }

    private extract_strings_from_plist(chunk_end: number): string[] {
        const strings: string[] = []
        const start_offset = this.offset

        // Limit search scope for performance
        const search_end = Math.min(start_offset + 500, chunk_end)

        while (this.offset < search_end) {
            const byte = this.buffer[this.offset]

            // Check for ASCII string marker (0x50-0x5F)
            if (byte !== undefined && (byte & 0xf0) === 0x50) {
                const str_length = byte & 0x0f // Lower 4 bits give the length

                // Only process if string length is reasonable
                if (str_length > 0 && str_length < 30) {
                    this.offset++ // Move past the marker byte

                    // Try to read the string
                    try {
                        const str = this.buffer
                            .subarray(this.offset, this.offset + str_length)
                            .toString()
                        strings.push(str)
                        this.offset += str_length
                        continue // Skip the increment at the end of the loop
                    } catch (error) {
                        // If error, just continue the search
                    }
                }
            }

            this.offset++
        }

        return strings
    }

    private extract_values_from_plist(chunk_end: number): number[] {
        const values: number[] = []
        const start_offset = this.offset

        // Limit search scope for performance
        const search_end = Math.min(start_offset + 500, chunk_end)

        while (this.offset < search_end) {
            const byte = this.buffer[this.offset]

            // Check for Real number marker (0x20-0x2F)
            if (byte !== undefined && (byte & 0xf0) === 0x20) {
                const size_power = byte & 0x0f // Lower 4 bits give size power of 2
                const size = Math.pow(2, size_power)

                // Only process 4-byte (float) or 8-byte (double) values
                if (size === 4 || size === 8) {
                    this.offset++ // Move past the marker byte

                    // Try to read the float/double
                    try {
                        let value = 0
                        if (size === 4 && this.offset + 4 <= chunk_end) {
                            value = this.buffer.readFloatBE(this.offset) // Binary plists use big endian
                            this.offset += 4
                        } else if (size === 8 && this.offset + 8 <= chunk_end) {
                            value = this.buffer.readDoubleBE(this.offset) // Binary plists use big endian
                            this.offset += 8
                        }

                        if (!isNaN(value) && isFinite(value)) {
                            values.push(value)
                            continue // Skip the increment at the end of the loop
                        }
                    } catch (error) {
                        // If error, just continue the search
                    }
                }
            }

            // Also check for integer marker (0x10-0x1F)
            if (byte !== undefined && (byte & 0xf0) === 0x10) {
                const size_power = byte & 0x0f // Lower 4 bits give size power of 2
                const size = Math.pow(2, size_power)

                // Only process 1, 2, 4, or 8 byte integers
                if (size === 1 || size === 2 || size === 4 || size === 8) {
                    this.offset++ // Move past the marker byte

                    // Try to read the integer
                    try {
                        let value = 0
                        if (size === 1 && this.offset + 1 <= chunk_end) {
                            value = this.buffer.readUInt8(this.offset)
                            this.offset += 1
                        } else if (size === 2 && this.offset + 2 <= chunk_end) {
                            value = this.buffer.readUInt16BE(this.offset) // Binary plists use big endian
                            this.offset += 2
                        } else if (size === 4 && this.offset + 4 <= chunk_end) {
                            value = this.buffer.readUInt32BE(this.offset) // Binary plists use big endian
                            this.offset += 4
                        } else if (size === 8 && this.offset + 8 <= chunk_end) {
                            // JavaScript can't handle 64-bit integers directly, so we'll read just the first 32 bits
                            value = this.buffer.readUInt32BE(this.offset)
                            this.offset += 8
                        }

                        values.push(value)
                        continue // Skip the increment at the end of the loop
                    } catch (error) {
                        // If error, just continue the search
                    }
                }
            }

            this.offset++
        }

        return values
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
                while (
                    this.offset < chunk_end &&
                    this.offset < this.buffer.length
                ) {
                    const current_byte = this.buffer[this.offset]
                    if (
                        current_byte === undefined ||
                        current_byte < 32 ||
                        current_byte > 126 ||
                        str_length >= 100
                    ) {
                        break
                    }
                    str_length++
                    this.offset++
                }

                if (str_length > 3 && str_length < 50) {
                    // Audio unit names are reasonable length
                    const str = this.buffer
                        .subarray(str_start, str_start + str_length)
                        .toString()
                        .trim()
                    // Filter out known non-name strings
                    if (
                        !str.includes("GAME") &&
                        !str.includes("OCuA") &&
                        !str.includes("UCuA") &&
                        !str.match(/^[A-F0-9]+$/) &&
                        str.length > 2
                    ) {
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
        if (
            lower_name.includes("distortion") ||
            lower_name.includes("overdrive")
        )
            return "distortion"
        if (lower_name.includes("chorus") || lower_name.includes("flanger"))
            return "modulation"
        if (lower_name.includes("amp")) return "amplifier"
        if (lower_name.includes("pedalboard")) return "multi_effect"

        return "effect"
    }

    private extract_parameters_improved(
        audio_unit: LogicProAudioUnit,
        chunk_end: number
    ): void {
        const start_offset = this.offset

        // Search for GAMETSPP marker within this chunk
        while (
            this.offset < chunk_end - 8 &&
            this.offset < this.buffer.length
        ) {
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
        while (
            this.offset < chunk_end - 4 &&
            this.offset < this.buffer.length
        ) {
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

    private extract_typed_parameters(
        audio_unit: LogicProAudioUnit,
        data_size: number
    ): void {
        const param_names = this.get_parameter_names_by_type(
            audio_unit.name,
            audio_unit.type
        )
        const max_params = Math.min(
            param_names.length,
            Math.floor(data_size / 4),
            20
        )

        for (
            let i = 0;
            i < max_params && this.offset + 4 <= this.buffer.length;
            i++
        ) {
            const float_val = this.read_float32_le()

            // Filter out padding values and obviously invalid data
            if (
                !isNaN(float_val) &&
                isFinite(float_val) &&
                !this.is_padding_value(float_val)
            ) {
                const param_name = param_names[i] || `param_${i}`

                // Apply value filtering based on parameter type and range
                const filtered_value = this.filter_parameter_value(
                    float_val,
                    param_name,
                    audio_unit.type
                )
                if (filtered_value !== null) {
                    audio_unit.parameters[param_name] = filtered_value
                }
            }
        }
    }

    private extract_basic_parameters(
        audio_unit: LogicProAudioUnit,
        max_count: number
    ): void {
        const param_names = this.get_parameter_names_by_type(
            audio_unit.name,
            audio_unit.type
        )
        let param_count = 0

        for (
            let i = 0;
            i < max_count &&
            this.offset + 4 <= this.buffer.length &&
            param_count < param_names.length;
            i++
        ) {
            const float_val = this.read_float32_le()

            if (
                !isNaN(float_val) &&
                isFinite(float_val) &&
                !this.is_padding_value(float_val)
            ) {
                const param_name =
                    param_names[param_count] || `param_${param_count}`
                const filtered_value = this.filter_parameter_value(
                    float_val,
                    param_name,
                    audio_unit.type
                )

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
        return (
            int_representation === 0x714971ca || // caf2 4971 pattern
            Math.abs(value) < 1e-30 || // Very close to zero
            value > 1e30
        ) // Extremely large values
    }

    private filter_parameter_value(
        value: number,
        param_name: string,
        unit_type: string
    ): number | null {
        const lower_name = param_name.toLowerCase()

        // Type-specific filtering
        if (unit_type === "compressor") {
            if (lower_name.includes("threshold") && (value < -96 || value > 0))
                return null
            if (lower_name.includes("ratio") && (value < 1 || value > 50))
                return null
            if (lower_name.includes("attack") && (value < 0.1 || value > 1000))
                return null
            if (lower_name.includes("release") && (value < 1 || value > 5000))
                return null
        } else if (unit_type === "equalizer") {
            if (lower_name.includes("freq") && (value < 10 || value > 30000))
                return null
            if (lower_name.includes("gain") && (value < -48 || value > 48))
                return null
            if (lower_name.includes("q") && (value < 0.1 || value > 100))
                return null
        } else if (unit_type === "delay") {
            if (lower_name.includes("time") && (value < 0 || value > 5000))
                return null
            if (lower_name.includes("feedback") && (value < 0 || value > 1))
                return null
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

    private get_parameter_names_by_type(
        unit_name: string,
        unit_type: string
    ): string[] {
        const lower_name = unit_name.toLowerCase()

        // Use more specific parameter names based on actual Logic Pro audio units
        if (
            unit_type === "gate" ||
            lower_name.includes("gate") ||
            lower_name.includes("noise")
        ) {
            return [
                "threshold",
                "ratio",
                "attack",
                "release",
                "hold",
                "lookahead",
                "bypass",
            ]
        } else if (unit_type === "compressor" || lower_name.includes("comp")) {
            return [
                "threshold",
                "ratio",
                "attack",
                "release",
                "makeup_gain",
                "knee",
                "bypass",
                "auto_gain",
                "peak_limiter",
                "detector_HPF",
                "mix",
                "side_chain",
                "vintage_mode",
                "bypass_auto",
                "output_level",
            ]
        } else if (unit_type === "equalizer" || lower_name.includes("eq")) {
            return [
                "low_freq",
                "low_gain",
                "low_Q",
                "low_mid_freq",
                "low_mid_gain",
                "low_mid_Q",
                "high_mid_freq",
                "high_mid_gain",
                "high_mid_Q",
                "high_freq",
                "high_gain",
                "high_Q",
                "highpass_freq",
                "lowpass_freq",
                "overall_gain",
                "bypass",
            ]
        } else if (
            unit_type === "delay" ||
            lower_name.includes("delay") ||
            lower_name.includes("echo")
        ) {
            return [
                "delay_time",
                "feedback",
                "mix",
                "high_cut",
                "low_cut",
                "sync_mode",
                "sync_note",
                "tape_drive",
                "tape_wow",
                "freeze",
                "reverse",
                "bypass",
                "tempo_sync",
                "ping_pong",
                "modulation_rate",
                "modulation_depth",
                "diffusion",
                "tone",
                "vintage_mode",
            ]
        } else if (
            unit_type === "reverb" ||
            lower_name.includes("reverb") ||
            lower_name.includes("hall")
        ) {
            return [
                "room_size",
                "decay_time",
                "damping",
                "early_reflections",
                "mix",
                "pre_delay",
                "diffusion",
                "density",
                "high_cut",
                "low_cut",
                "modulation",
                "freeze",
                "bypass",
            ]
        } else if (
            unit_type === "distortion" ||
            lower_name.includes("distortion") ||
            lower_name.includes("overdrive")
        ) {
            return [
                "drive",
                "tone",
                "level",
                "bypass",
                "symmetry",
                "squeeze",
                "output_gain",
            ]
        } else if (
            unit_type === "modulation" ||
            lower_name.includes("chorus") ||
            lower_name.includes("flanger")
        ) {
            return [
                "rate",
                "depth",
                "feedback",
                "mix",
                "delay",
                "phase",
                "bypass",
                "sync_mode",
                "waveform",
            ]
        } else if (lower_name.includes("filter")) {
            return [
                "cutoff",
                "resonance",
                "drive",
                "mix",
                "bypass",
                "filter_type",
                "slope",
                "key_follow",
            ]
        } else if (unit_type === "amplifier" || lower_name.includes("amp")) {
            return [
                "gain",
                "bass",
                "mid",
                "treble",
                "presence",
                "volume",
                "bypass",
                "vintage_mode",
            ]
        } else if (
            unit_type === "multi_effect" ||
            lower_name.includes("pedalboard")
        ) {
            return [
                "input_gain",
                "output_level",
                "mix",
                "bypass",
                "effect_1",
                "effect_2",
                "effect_3",
                "routing",
            ]
        }

        // Default generic parameter names for unknown audio units
        return [
            "level",
            "mix",
            "rate",
            "depth",
            "feedback",
            "drive",
            "tone",
            "bypass",
            "attack",
            "release",
            "threshold",
            "ratio",
            "frequency",
            "gain",
            "q_factor",
        ]
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
