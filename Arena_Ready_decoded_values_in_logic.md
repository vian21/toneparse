# Arena Ready.patch Plugin Decoder Context

This document provides textual context for the "Arena Ready.patch" plugin setup, intended to assist an agent in writing the code for a plugin decoder. Below is a detailed list of the plugins included in the patch, along with their parameters, presets (if applicable), mic selections, and cabinet settings, as derived from the provided image attachment descriptions.

---

## 1. List of Plugins in the Patch

The "Arena Ready.patch" includes the following plugins in its signal chain:

1. **Noise Gate**
2. **Pedals**:
   - Hi-Drive Treble Boost
   - Phase Tripper
3. **Amp Designer** (includes amp and cabinet simulation)
4. **Channel EQ**
5. **Compressor**
6. **Tape Delay**

---

## 2. Parameters for Each Plugin

Below are the detailed parameters for each plugin in the "Arena Ready.patch." Where applicable, the name of the preset loaded, mic selected, and cabinet settings are included.

### Noise Gate

- **Plugin Name**: Noise Gate
- **Preset Loaded**: Custom
- **Parameters**:
  - **Threshold**: -65 dB
  - **Reduction**: -35 dB
  - **Attack**: 18 ms
  - **Hold**: 140 ms
  - **Release**: 192.1 ms
  - **Hysteresis**: -3.0 dB
  - **Lookahead**: 0.0 ms
  - **Characteristics**: Bandpass
  - **High Cutoff**: 20000 Hz
  - **Low Cutoff**: 20 Hz
  - **Monitor**: Off
  - **Mode (Gate | Ducker )**: Gate
  - **Side Chain**: None

### Pedals

The "Pedals" section includes two individual effects pedals:

#### Hi-Drive Treble Boost

- **Plugin Name**: Hi-Drive Treble Boost
- **Status**: On
- **Parameters**:
  - **Level**: set around 3PM(\~75%)
  - **Treble/Full Switch**: Treble

#### Phase Tripper

- **Plugin Name**: Phase Tripper
- **Status**: off
- **Parameters**:
  - **Rate**: around 12pm (\~50%)
  - **Depth**: around 12pm
  - **Feedback**: around 12pm
  - **Sync**: on

### Amp Designer

- **Plugin Name**: Amp Designer
- **Preset Loaded**: Arena Ready
- **Amp Model**: Vintage British Head
- **Cabinet**: Vintage British 4x12
- **Mic Selected**: Dynamic 57
- **Parameters**:
  - **Gain**: around 7.5
  - **Bass**: around 6
  - **Mid**: around 5
  - **Treble**: around 4
  - **Reverb**: Off
  - **Reverb Level**: around 2
  - **Effects**: Off
  - **Effects state** set on sync (other option if free)
  - **Speed**: around 6
  - **Effect**: TREM (binary choice. other option is VIB) 
  -  **Depth**: around 6
  - **Presence**: around 4
  - **Master**: around 9

### Channel EQ

- **Plugin Name**: Channel EQ
- **Preset Loaded**: Custom
- **Parameters**:
  - **Band 1** (High-pass filter): 69.0 Hz, +12.0 dB/octave, Q = 0.93
  - **Band 2**: 80.0 Hz, 0.0 dB, Q = 1.10 (Q-Couple enabled)
  - **Band 3**: 150 Hz, 0.0 dB, Q = 0.67
  - **Band 4**: 500 Hz, 0.0 dB, Q = 2.10
  - **Band 5**: 860 Hz, +2.5 dB, Q = 1.20
  - **Band 6**: 4800 Hz, +1.0 dB, Q = 0.71 (HQ mode enabled)
  - **Band 7**: 2460 Hz, +1.0 dB, Q = 1.10
  - **Band 8** (Low-pass filter): 17000 Hz, 12 dB/octave, Q = 0.71
  - **Overall Gain**: 0.0 dB

### Compressor

- **Plugin Name**: Compressor
- **Preset Loaded**: Vintage FET
- **Parameters**:
  - **Input Gain**: 0 dB
  - **Threshold**: around -20 dB
  - **Knee**: around 1.0
  - **Ratio**: 3
  - **Attack**: around 15 ms
  - **Release**: around 100 ms
  - **Make Up**: -5 dB
  - **Auto Gain**: Off
  - **Limiter**: Off
  - **Limiter Threshold**: -3 dB
  - **Distortion**: Soft
  - **Mix**: 1:1
  - **Output Gain**: 0 dB

### Tape Delay

- **Plugin Name**: Tape Delay
- **Preset Loaded**: Brit and Clean
- **Parameters**:
  - **Tempo Sync**: Enabled
  - **Delay Time**: 200.0 ms (1/8 note)
  - **Deviation**: -34.0%
  - **Smoothing**: 40 ms
  - **Clip Threshold**: +20.0 dB
  - **Spread**: 0
  - **Tape Head Mode**: Clean
  - **Low Cut**: 200 Hz
  - **High Cut**: 1700 Hz
  - **Feedback**: 16%
  - **Freeze**: Off
  - **LFO Rate**: 0.20 Hz
  - **LFO Intensity**: 100%
  - **Flutter Rate**: 0.4 Hz
  - **Flutter Intensity**: 100%
  - **Dry**: 80%
  - **Wet**: 21%