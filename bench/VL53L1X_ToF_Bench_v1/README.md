# Separate CQRobot / VL53L1X ToF bench

Public guide: `https://stairs.layerlane.studio/#tof`. Download: `https://stairs.layerlane.studio/downloads/VL53L1X_ToF_Bench_v1.ino`.

Identification: the front/back photos show CQRobot branding, a generic VL53LX back and white six-pin connector, strongly matching the documented CQRWX00744US VL53L1X carrier. Exact SKU is not printed on the photo, so this is a visual match, not infallible chip identification. Wiring is not confirmed by the user. No private photos are included.

## Install and validation

In Arduino IDE Library Manager install **VL53L1X by Pololu, 1.3.1** (not VL53L0X). Select **Arduino UNO R4 WiFi** in the Arduino UNO R4 Boards package. Open the `.ino` in its matching `VL53L1X_ToF_Bench_v1` folder and verify before choosing to upload. No upload is automatic; preserve the current sketch first because an upload replaces the board program.

Compatibility review: Pololu 1.3.1 declares `architectures=*` and uses standard `TwoWire` calls; those calls, plus `setWireTimeout(unsigned int)`, were checked against ArduinoCore-renesas `Wire.h`. The sketch guards `ARDUINO_UNOR4_WIFI`. This is source/API compatibility checking, not a completed board compile or a manufacturer certification of this combination. No Arduino CLI/IDE backend or installed UNO R4 core was found in the inspected Windows toolchain locations. **Uncompiled, not flashed and not physically tested.**

The diagnostic uses 115200 baud, main `Wire` at 100kHz, a 25ms Wire transaction timeout and 500ms library timeout. It reads the two-byte model ID at the default address 0x29, requires exactly two bytes and 0xEACC, then invokes library init. It does not scan other addresses or force a mismatched part. Failed ID reads/mismatches stop before init. It uses ordinary volatile sensor initialization, long mode, 50ms timing budget, 100ms continuous ranging and readiness polling every 20ms. Missing completed data for 1 second, I2C errors and library timeouts halt further bus operations; status repeats over serial without automatic retries. Only RangeValid gets a numeric distance; other statuses show NA and the library status string. This is a diagnostic, not a safety controller. Normal sensor init/ranging/acknowledgement involves register writes; there are no address reassignment or custom calibration commands, LED/motor/Wi-Fi controls or secrets.

## Four-wire setup

Power OFF first. Disconnect the external LED adapter and LED strip; isolate one sensor and use USB-only bench power. For the **confirmed translated carrier**, follow printed labels: VCC to UNO 5V, GND to GND, SDA to main SDA, SCL to main SCL. Do not use the UNO Qwiic/Wire1 connector for this sketch. Leave INT and SHUT disconnected and insulated. Do not infer pin order or polarity from cable colors. The carrier manual documents 3.3V/5V and onboard translation; the bare sensor chip is not a 5V carrier, and the manual does not establish 5V tolerance for INT/SHUT.

## Primary references inspected

- [CQRobot manufacturer page](https://cqrobot.com/article/issue/info?articleId=113)
- [Carrier manual, CQRWX00744US](https://m.media-amazon.com/images/I/8179E86d0RL.pdf)
- [Pololu 1.3.1 library metadata](https://github.com/pololu/vl53l1x-arduino/blob/1.3.1/library.properties)
- [Pololu API and model-ID gate](https://github.com/pololu/vl53l1x-arduino/blob/1.3.1/VL53L1X.cpp)
- [Arduino Renesas Wire declarations](https://github.com/arduino/ArduinoCore-renesas/blob/main/libraries/Wire/Wire.h)
