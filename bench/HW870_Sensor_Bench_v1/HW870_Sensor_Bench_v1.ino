/*
  HW870_SENSOR_BENCH_V1 - standalone sensor-only diagnostic
  Target: Arduino UNO R4 WiFi (arduino:renesas_uno:unor4wifi)
  Serial Monitor: 115200 baud. No third-party libraries.
  Status: statically reviewed; not board-compiled or hardware-tested here.

  This is a separate sketch, not a staircase firmware update.
  Uploading it is Gary's choice and replaces the program currently on the board.
  Preserve the current sketch first. Never rewire while powered.

  Power off and isolate ONE HW-870 module. Leave LEDs, external LED adapter,
  other sensors and capacitors disconnected. Use the PRINTED pin labels:
    module VCC -> UNO 5V; module GND -> UNO GND.
  Keep DO and AO disconnected until this sketch and its INPUT modes are ready.
  Then power OFF again before connecting:
    module DO -> UNO D2; module AO -> UNO A0.
  Power the sensor-only setup from the UNO USB connection.

  D2 and A0 are inputs without internal pull-ups. Observe DO=0/1 and AO raw;
  do not assume which direction means a target is present. Unconnected input
  readings are undefined. ADC is explicitly 10-bit: 0..1023 relative counts,
  NOT millimetres. This close-range reflective sensor is not a ToF ranger.
  Sampling is scheduled by millis(), with no delay() or serial wait loops.
  A repeated identification/header helps when Serial Monitor is opened late.
*/

#include <Arduino.h>

constexpr uint8_t DIGITAL_INPUT_PIN = 2;
constexpr uint8_t ANALOG_INPUT_PIN = A0;
constexpr uint32_t SAMPLE_INTERVAL_MS = 100;
constexpr uint32_t HEADER_INTERVAL_MS = 5000;

uint32_t lastSampleMs = 0;
uint32_t lastHeaderMs = 0;

void printIdentification() {
  Serial.println("# HW870_SENSOR_BENCH_V1 | UNO_R4_WIFI | INPUT D2/A0");
  Serial.println("# baud=115200; adc_bits=10; raw counts only; polarity unknown");
  Serial.println("ms,DO_raw,AO_raw_0_to_1023");
}

void setup() {
  pinMode(DIGITAL_INPUT_PIN, INPUT);
  pinMode(ANALOG_INPUT_PIN, INPUT);
  analogReadResolution(10);
  Serial.begin(115200);
  printIdentification();
}

void loop() {
  const uint32_t now = millis();

  if (static_cast<uint32_t>(now - lastHeaderMs) >= HEADER_INTERVAL_MS) {
    lastHeaderMs = now;
    printIdentification();
  }

  if (static_cast<uint32_t>(now - lastSampleMs) < SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSampleMs = now;

  const int digitalRaw = digitalRead(DIGITAL_INPUT_PIN);
  const int analogRaw = analogRead(ANALOG_INPUT_PIN);

  Serial.print(now);
  Serial.print(',');
  Serial.print(digitalRaw);
  Serial.print(',');
  Serial.println(analogRaw);
}
