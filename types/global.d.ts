interface Preset {
    name: string
}

interface NeuralDSPPreset extends Preset {
    modules: NeuralDSPModule[]
}

interface NeuralDSPModule {
    name: string
    settings: Record<string, string | null>
}

interface LogicProPreset extends Preset {
    audio_units: LogicProAudioUnit[]
    channel_name: string
}

interface LogicProAudioUnit {
    name: string
    parameters: Record<string, number | string>
    raw_data?: {
        bytes: number[]
        parameter_names: string[]
        labels?: string[]
    }
    is_pedalboard_stompbox?: boolean
    parent_pedalboard?: string
}
