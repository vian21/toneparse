# Brit and Clean Preset Plugin Decoder Context

This document provides textual context for the "Brit and Clean" preset plugin setup, intended to assist an agent in writing the code for a plugin decoder. Below is a detailed list of the plugins included in the preset, along with their parameters, presets (if applicable), mic selections, and cabinet settings, as derived from the provided image attachments.

---

## 1. List of Plugins in the Preset

The "Brit and Clean" preset includes the following plugins in its signal chain:

1. **Noise Gate**
2. **Pedals**:
    - Hi-Drive Treble Boost
    - Squash Compressor
3. **Amp Designer** (includes amp and cabinet simulation)
4. **Channel EQ**
5. **Compressor**
6. **Tape Delay**

---

## 2. Parameters for Each Plugin

Below are the detailed parameters for each plugin in the "Brit and Clean" preset. Where applicable, the name of the preset loaded, mic selected, and cabinet settings are included.

### Noise Gate

-   **Plugin Name**: Noise Gate
-   **Preset Loaded**: Brit and Clean (dropdown shows Custom)
-   **Parameters**:
    -   **Threshold**: -65 dB
    -   **Reduction**: -100 dB
    -   **Attack**: 18 ms
    -   **Hold**: 30 ms
    -   **Release**: 112.5 ms
    -   **Hysteresis**: -3.0 dB
    -   **Lookahead**: 0.0 ms
    -   **Characteristics**: Bandpass
    -   **High Cutoff**: 20000 Hz
    -   **Low Cutoff**: 20 Hz
    -   **Monitor**: Off
    -   **Mode (Gate | Ducker)**: Gate
    -   **Side Chain**: None

### Pedalboard

The "Pedals" section includes two individual effects pedals:

-   Most of the values have been given out of 10 or in Percentages

#### Hi-Drive Treble Boost

-   **Plugin Name**: Hi-Drive Treble Boost
-   **Status**: Off
-   **Parameters**:
    -   **Level**: around 45% (11 o'clock position)
    -   **Treble/Full Switch**: Treble

#### Squash Compressor

-   **Plugin Name**: Squash Compressor
-   **Status**: Off
-   **Parameters**:
    -   **Sustain**: around 40% (10 o'clock position)
    -   **Level**: around 70% (2 o'clock position)
    -   **Attack** (Fast | Slow): Fast

### Amp Designer

-   **Plugin Name**: Amp Designer
-   **Model**: British Combo
-   **Amp Model**: British Amp
-   **Cabinet**: British 2x12
-   **Mic Selected**: Ribbon 121
-   **Parameters**:
    -   **Gain**: around 6-7
    -   **Bass**: around 6-7
    -   **Mids**: around 6-7
    -   **Treble**: around 8
    -   **Reverb**: On
    -   **Reverb Level**: around 2
    -   **Effects**: Off
    -   **Effects State**: Sync
    -   **Trem/Vib**: Trem
    -   **Depth**: around 8
    -   **Speed**: around 4-4.5
    -   **Presence**: around 8
    -   **Master**: around 8
    -   **Output**: 50% (middle of slider)

### Channel EQ

-   **Plugin Name**: Channel EQ
-   **Preset Loaded**: Brit and Clean (dropdown shows Custom)
-   **Parameters**:
    -   **Analyzer**: Post
    -   **Q-Couple**: Enabled
    -   **HQ**: Enabled
    -   **Processing**: Stereo
    -   **Band 1 (High-Pass Filter)**: 88.0 Hz, 0.71 Oct, Q = 1.10
    -   **Band 2**: 80.0 Hz, 0.0 dB, Q = 1.10
    -   **Band 3**: 174 Hz, -2.0 dB, Q = 1.50
    -   **Band 4**: 416 Hz, +2.0 dB, Q = 1.20
    -   **Band 5**: 1200 Hz, 0.0 dB, Q = 1.40
    -   **Band 6**: 3500 Hz, 0.0 dB, Q = 0.71
    -   **Band 7**: 2000 Hz, +1.5 dB, Q = 0.63
    -   **Band 8 (Low-Pass Filter)**: 17000 Hz, 12 dB/oct, Q = 0.71
    -   **Overall Gain**: 0.0 dB

### Compressor

-   **Plugin Name**: Compressor
-   **Type**: Vintage Opto
-   **Parameters**:
    -   **Input Gain**: 0 dB
    -   **Threshold**: -27.5 dB
    -   **Knee**: 0.8
    -   **Ratio**: 4.1
    -   **Attack**: 19 ms
    -   **Release**: 49 ms
    -   **Make Up**: around -8 dB
    -   **Auto Gain**: Off
    -   **Limiter**: Off
    -   **Limiter Threshold**: 0 dB
    -   **Distortion**: Soft
    -   **Mix**: 1:1
    -   **Output Gain**: 0 dB

### Tape Delay

-   **Plugin Name**: Tape Delay
-   **Parameters**:
    -   **Tempo Sync**: Enabled
    -   **Delay Time**: 200.0 ms
    -   **Note**: 1/8
    -   **Deviation**: -34.00%
    -   **Smoothing**: 40 ms
    -   **Clip Threshold**: +20.0 dB
    -   **Spread**: 0
    -   **Tape Head Mode** (Clean/Diffuse): Clean
    -   **Low Cut**: 200 Hz
    -   **High Cut**: 1700 Hz
    -   **Feedback**: 16%
    -   **Freeze**: Off
    -   **LFO Rate**: 0.20 Hz
    -   **LFO Intensity**: 100%
    -   **Flutter Rate**: 0.4 Hz
    -   **Flutter Intensity**: 100%
    -   **Dry**: 80%
    -   **Wet**: 21%
