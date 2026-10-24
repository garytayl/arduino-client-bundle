/*
  VL53L1X_TOF_BENCH_V1 - standalone distance diagnostic, UNO R4 WiFi only.
  Library: VL53L1X by Pololu, version 1.3.1. Serial: 115200 baud.
  Status: statically reviewed; UNCOMPILED and NOT physically tested here.

  The pictured CQRobot carrier strongly matches CQRWX00744US, but the SKU
  is not printed on the photo. Confirm the translated carrier before using
  5V. Its manual documents onboard translation and 3.3V/5V operation; that
  does NOT make a bare VL53L1X or INT/SHUT pins 5V tolerant.

  Power OFF before wiring. Isolate this ONE sensor. Disconnect the LED
  adapter, LED strip and all other modules. Use printed labels, not colors:
    carrier VCC -> UNO 5V; GND -> GND; SDA -> SDA; SCL -> SCL.
  Use the UNO main SDA/SCL headers (Wire), not the Qwiic/Wire1 connector.
  Leave INT and SHUT unconnected and insulated. Use USB-only bench power.
  Wiring is not confirmed, and this file does not upload itself. Uploading
  is Gary's choice and replaces the running board program; save it first.

  Reads only the expected 0x29 device. A complete model-ID read must match
  0xEACC before library init can run. Mismatch/error stops without retries.
  Normal library initialization, ranging configuration and measurement
  acknowledgement write volatile sensor registers. No address reassignment,
  calibration commands, LEDs, motors, Wi-Fi or unrelated output control.
*/

#include <Arduino.h>
#include <Wire.h>
#include <VL53L1X.h>

#if !defined(ARDUINO_UNOR4_WIFI)
#error "Select Arduino UNO R4 WiFi; this diagnostic targets its main Wire bus."
#endif

constexpr uint8_t SENSOR_ADDRESS = 0x29;
constexpr uint16_t EXPECTED_MODEL_ID = 0xEACC;
constexpr uint32_t POLL_INTERVAL_MS = 20;
constexpr uint32_t NO_DATA_TIMEOUT_MS = 1000;

VL53L1X sensor;
bool running = false;
const char * faultMessage = "NOT_INITIALIZED";
uint32_t lastPollMs = 0;
uint32_t lastMeasurementMs = 0;
uint32_t lastMessageMs = 0;

void identify() {
  Serial.println("# VL53L1X_TOF_BENCH_V1 | UNO_R4_WIFI | Pololu VL53L1X 1.3.1");
  Serial.println("# 115200 baud; main Wire; valid distances only; no actuators");
  Serial.println("ms,distance_mm,status");
}

void stopDiagnostic(const char * message) {
  // Do not issue further I2C commands to a missing, mismatched or faulted device.
  running = false;
  faultMessage = message;
  lastMessageMs = millis();
  Serial.print("# STOP: ");
  Serial.println(faultMessage);
  Serial.println("# Power off before checking labels/wiring. No automatic retry.");
}

bool readModelId(uint16_t & modelId) {
  const uint16_t reg = VL53L1X::IDENTIFICATION__MODEL_ID;
  Wire.beginTransmission(SENSOR_ADDRESS);
  Wire.write(static_cast<uint8_t>(reg >> 8));
  Wire.write(static_cast<uint8_t>(reg));
  if (Wire.endTransmission(false) != 0) { return false; }
  const size_t received = Wire.requestFrom(SENSOR_ADDRESS, static_cast<size_t>(2));
  if (received != 2 || Wire.available() < 2) { return false; }
  modelId = static_cast<uint16_t>(Wire.read()) << 8;
  modelId |= static_cast<uint8_t>(Wire.read());
  return true;
}

void setup() {
  Serial.begin(115200);
  identify();
  Wire.begin();
  Wire.setClock(100000);
  // Renesas Wire API: microseconds; separate from the library's ms timeout.
  Wire.setWireTimeout(25000);
  sensor.setBus(&Wire);
  sensor.setTimeout(500);

  uint16_t modelId = 0;
  if (!readModelId(modelId)) {
    stopDiagnostic("SENSOR_NOT_FOUND_OR_ID_READ_FAILED at 0x29");
    return;
  }
  Serial.print("# model_id=0x");
  Serial.println(modelId, HEX);
  if (modelId != EXPECTED_MODEL_ID) {
    stopDiagnostic("MODEL_MISMATCH: expected 0xEACC; do not force VL53L1X driver");
    return;
  }
  if (!sensor.init() || sensor.timeoutOccurred() || sensor.last_status != 0) {
    stopDiagnostic("INIT_FAILED_OR_TIMEOUT");
    return;
  }
  // Ordinary volatile ranging settings: long mode, 50ms budget, 100ms period.
  if (!sensor.setDistanceMode(VL53L1X::Long) ||
      !sensor.setMeasurementTimingBudget(50000) || sensor.last_status != 0) {
    stopDiagnostic("RANGING_CONFIGURATION_FAILED");
    return;
  }
  sensor.startContinuous(100);
  if (sensor.last_status != 0) {
    stopDiagnostic("START_FAILED");
    return;
  }
  running = true;
  lastMeasurementMs = millis();
  lastMessageMs = lastMeasurementMs;
  Serial.println("# READY: matched model ID; waiting for range samples");
}

void loop() {
  const uint32_t now = millis();
  if (!running) {
    if (static_cast<uint32_t>(now - lastMessageMs) >= 2000) {
      lastMessageMs = now;
      identify();
      Serial.print("# STOP: ");
      Serial.println(faultMessage);
    }
    return;
  }
  if (static_cast<uint32_t>(now - lastMessageMs) >= 5000) {
    lastMessageMs = now;
    identify();
  }
  if (static_cast<uint32_t>(now - lastPollMs) < POLL_INTERVAL_MS) { return; }
  lastPollMs = now;

  const bool available = sensor.dataReady();
  if (sensor.last_status != 0 || sensor.timeoutOccurred()) {
    stopDiagnostic("I2C_ERROR_OR_LIBRARY_TIMEOUT");
    return;
  }
  if (!available) {
    if (static_cast<uint32_t>(now - lastMeasurementMs) >= NO_DATA_TIMEOUT_MS) {
      stopDiagnostic("NO_DATA_TIMEOUT: no completed measurement for 1000ms");
    }
    return;
  }

  const uint16_t distanceMm = sensor.read(false);
  if (sensor.last_status != 0 || sensor.timeoutOccurred()) {
    stopDiagnostic("READ_ERROR_OR_LIBRARY_TIMEOUT");
    return;
  }
  lastMeasurementMs = now;
  Serial.print(now);
  Serial.print(',');
  if (sensor.ranging_data.range_status == VL53L1X::RangeValid) {
    Serial.print(distanceMm);
  } else {
    Serial.print("NA");
  }
  Serial.print(',');
  Serial.println(VL53L1X::rangeStatusToString(sensor.ranging_data.range_status));
}
