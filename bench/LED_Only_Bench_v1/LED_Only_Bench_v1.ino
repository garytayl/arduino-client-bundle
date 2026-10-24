/*
  LED_ONLY_BENCH_V1 - separate UNO R4 WiFi / D6 test.
  Install FastLED 3.10.3. Uncompiled, not flashed or physically tested here.
  Uses WS2812B/GRB 800kHz as a compatibility TEST for the reported WS2812E
  strip; timing, color order and wiring are not independently verified.
  Gary reports the DIN label is confirmed at the connected strip end.

  Reported count is ABOUT 35. This addresses/clears only 35 pixels.
  With USB and adapter OFF, confirm the strip's DIN/arrow and labeled 5V/GND
  polarity, the D6 series resistor connection, and common signal ground.
  Strip power goes directly from its own 5V adapter, not through UNO or a
  breadboard. UNO stays USB powered. Do not join adapter +5V to UNO +5V.
  Wire colors alone do not prove polarity. No safety approval is implied.
  Save the running sketch; uploading this separate file is Gary's choice.

  Behavior: initial clear, 1-second dark pause, ONE pixel every 200ms.
  One complete red pass, then green, then blue, repeat. Brightness 16/255.
  No white, no tail, no sensor, Wi-Fi or motor control. millis scheduling
  avoids delay(); FastLED.show() still briefly transmits each LED frame.
*/
#include <Arduino.h>
#include <FastLED.h>

#if !defined(ARDUINO_UNOR4_WIFI)
#error "Select Arduino UNO R4 WiFi."
#endif

constexpr uint8_t LED_PIN = 6;
constexpr uint16_t NUM_LEDS = 35;
constexpr uint8_t BRIGHTNESS = 16;
constexpr uint32_t STEP_MS = 200;
constexpr uint32_t DARK_START_MS = 1000;
CRGB leds[NUM_LEDS];
uint16_t pixel = 0;
uint8_t colorPass = 0;
uint32_t startMs = 0;
uint32_t lastStepMs = 0;

void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setDither(0);
  FastLED.clear(true);
  startMs = millis();
  lastStepMs = startMs;
  Serial.println("# LED_ONLY_BENCH_V1 | D6 | 35 pixels | brightness 16/255");
  Serial.println("# Initial clear, 1s dark, one pixel/200ms; red, green, blue passes");
}

void loop() {
  const uint32_t now = millis();
  if (static_cast<uint32_t>(now - startMs) < DARK_START_MS) { return; }
  if (static_cast<uint32_t>(now - lastStepMs) < STEP_MS) { return; }
  lastStepMs = now;
  fill_solid(leds, NUM_LEDS, CRGB::Black);
  if (colorPass == 0) { leds[pixel] = CRGB(255, 0, 0); }
  else if (colorPass == 1) { leds[pixel] = CRGB(0, 255, 0); }
  else { leds[pixel] = CRGB(0, 0, 255); }
  FastLED.show();
  Serial.print("pixel="); Serial.print(pixel);
  Serial.print(" color_pass="); Serial.println(colorPass);
  pixel++;
  if (pixel >= NUM_LEDS) { pixel = 0; colorPass = (colorPass + 1) % 3; }
}
