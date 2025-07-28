interface Preset {
    name: string
}

interface NeuralDSPPreset extends Preset {
    amps: Amp[]
    pedals: Pedal[]
}

interface Amp {
    name: string
    settings: {
        name: string
        value: number
    }
}

interface Pedal {
    name: string
    settings: {
        name: string
        value: number
    }
}
