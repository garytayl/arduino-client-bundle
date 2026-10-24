# Sensor-only bench diagnostic

`HW870_Sensor_Bench_v1/HW870_Sensor_Bench_v1.ino` is a standalone UNO R4 WiFi sketch. It samples D2 and A0 every 100 ms using unsigned `millis()` subtraction, reports raw values at 115200 baud, and repeats an identifying header every 5 seconds. Both pins are `INPUT`; no pull-up or DO polarity is assumed. `analogReadResolution(10)` selects 0–1023 relative ADC counts, not distance. No third-party libraries, LED data output, Wi-Fi, motors or secrets are included.

**Validation:** static checks only. Arduino CLI/IDE and an installed UNO R4 board core were not found in the inspected Windows toolchain locations. No actual UNO R4 compile, upload or physical sensor test is claimed. Intended FQBN: `arduino:renesas_uno:unor4wifi`. A real board compile remains for an available toolchain.

Use the public [bench page](https://stairs.layerlane.studio/#bench) for the staged power-off wiring checklist. Uploading this sketch replaces the running board program and is Gary's explicit choice, not an automatic step. Save the current sketch first. The original `Yvels_Staircase_v1` firmware is unchanged.

Photo inventory reported by Gary on 2026-10-24: UNO R4 WiFi; fourteen four-pin HW-870 close-range reflective IR modules (two connected), six separate three-pin LDR ambient-light threshold modules, WS2812E bag labelled 5V/5m/90W, YS-0510DC adapter labelled 5V/10A/50W, capacitor kit 1000uF/16V and loose 1000uF/10V capacitor. No private photos are included. Label values are not bench measurements or verification of connector polarity.

References: [UNO R4 WiFi](https://docs.arduino.cc/hardware/uno-r4-wifi/), [Arduino analogReadResolution](https://docs.arduino.cc/language-reference/en/functions/analog-io/analogReadResolution/), [Vishay TCRT5000 datasheet](https://www.vishay.com/docs/83760/tcrt5000.pdf). The Vishay part's peak reflectance distance is 2.5 mm under its test conditions; this is not a guarantee for a clone module or a cross-stair ranging specification.
