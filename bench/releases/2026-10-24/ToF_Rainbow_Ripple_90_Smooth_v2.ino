/* ToF_Rainbow_Ripple_90 — separate visual variant, compile-tested only.
   UNO R4 WiFi; D6 WS2812B GRB; 90 requested pixels, physical count approximate.
   Brightness 16/255. Main Wire VL53L1X using existing sensor supply wiring.
   Continuous smooth rainbow, 32-second color cycle. Confirmed presence launches a central disruption,
   paired sparkling fronts spread symmetrically to both ends, blending back.
   No simulated triggers. One sensor detects presence, not travel direction.
   Clear >950mm for >=400ms/5 valid samples rearms; near <800mm for
   >=200ms/3 valid samples triggers. Invalid samples never imply near or clear.
   Stale >1s disarms; confirmed clear required after recovery. Presence retained.
   Ranging read(false), timed polling and ~60fps rendering; no delay in loop.
   Sensor failure leaves rainbow baseline running with detection disabled and
   an honest error message. Readable logs; optional distance debug disabled.
   This file is separate from known-good recovery and the manual count edit.
*/
#include <Arduino.h>
#include <Wire.h>
#include <FastLED.h>
#include <VL53L1X.h>
#include <math.h>
#if !defined(ARDUINO_UNOR4_WIFI)
#error "Select Arduino UNO R4 WiFi."
#endif

// BEGIN_PORTABLE_GATE
struct PresenceGate {
  static constexpr uint16_t ENTER_MM = 800, EXIT_MM = 950;
  static constexpr uint32_t STALE_MS = 1000;
  bool armed = false, present = false, fresh = false, haveValid = false;
  uint32_t lastValid = 0, candidateSince = 0;
  uint8_t candidate = 0, samples = 0; // 1=near, 2=clear
  void resetCandidate() { candidate = 0; samples = 0; }
  void tick(uint32_t now) {
    if (haveValid && uint32_t(now - lastValid) > 180) resetCandidate();
    if (!haveValid || uint32_t(now - lastValid) > STALE_MS) {
      fresh = false;
      armed = false;
      resetCandidate();
    }
  }
  bool update(uint32_t now, bool valid, uint16_t mm) {
    tick(now);
    if (!valid || mm == 0) { resetCandidate(); return false; }
    haveValid = true; fresh = true; lastValid = now;
    const uint8_t zone = mm < ENTER_MM ? 1 : (mm > EXIT_MM ? 2 : 0);
    if (!zone) { resetCandidate(); return false; }
    if (zone != candidate) { candidate = zone; candidateSince = now; samples = 0; }
    if (samples < 255) ++samples;
    const uint32_t elapsed = uint32_t(now - candidateSince);
    if (zone == 2 && samples >= 5 && elapsed >= 400) {
      present = false; armed = true;
    }
    if (zone == 1 && samples >= 3 && elapsed >= 200 && armed && !present) {
      present = true; armed = false; resetCandidate(); return true;
    }
    return false;
  }
};
// END_PORTABLE_GATE

constexpr uint8_t LED_PIN = 6, BRIGHTNESS = 16;
constexpr uint16_t NUM_LEDS = 90; // approximate physical count, not verified
constexpr uint32_t POLL_MS = 10, FRAME_MS = 16, REPORT_MS = 5000;
CRGB leds[NUM_LEDS];
VL53L1X sensor;
PresenceGate gate;
bool sensorOK = false, animating = false, lastSampleValid = false;
uint16_t lastMm = 0;
uint8_t lastRangeStatus = 255;
uint32_t lastPoll = 0, lastReport = 0, animationStart = 0;
uint32_t lastFrame = 0, sensorStart = 0;
constexpr bool DEBUG_DISTANCE = false; // optional distance line every five seconds
bool previouslyArmed = false;
uint8_t i2cError = 0;

// BEGIN_PORTABLE_LOG_GATE
struct SensorLogGate {
  enum Event { None, Invalid, Communication, Stale, Recovered };
  uint32_t badSince = 0, goodSince = 0, lastWarning = 0;
  bool bad = false, good = false, reportedFault = false, warnedEver = false;
  Event update(uint32_t now, uint8_t problem) {
    if (problem == 0) {
      bad = false;
      if (!good) { good = true; goodSince = now; }
      if (reportedFault && uint32_t(now - goodSince) >= 200) {
        reportedFault = false; return Recovered;
      }
      return None;
    }
    good = false;
    if (!bad) { bad = true; badSince = now; }
    const bool due = !warnedEver || uint32_t(now - lastWarning) >= 5000;
    if (due && (problem == 3 || uint32_t(now - badSince) >= 300)) {
      warnedEver = true; reportedFault = true; lastWarning = now;
      return problem == 3 ? Stale : (problem == 2 ? Communication : Invalid);
    }
    return None;
  }
};
// END_PORTABLE_LOG_GATE
SensorLogGate sensorLog;
void logSensorState(uint32_t now) {
  if (!sensorOK) return; // startup failure already reported once
  const bool stale = !gate.fresh && uint32_t(now - sensorStart) > PresenceGate::STALE_MS;
  const uint8_t problem = stale ? 3 : (i2cError ? 2 : (lastSampleValid ? 0 : 1));
  switch (sensorLog.update(now, problem)) {
    case SensorLogGate::Stale:
      Serial.println("WARNING: No valid distance for over 1 second. Detection paused; waiting for a clear view."); break;
    case SensorLogGate::Communication:
      Serial.print("WARNING: Sensor communication interrupted (I2C code ");
      Serial.print(i2cError); Serial.println("). Check the sensor connections. Readings ignored."); break;
    case SensorLogGate::Invalid:
      Serial.print("WARNING: Sensor cannot measure reliably (range status ");
      Serial.print(lastRangeStatus); Serial.println("). Reading ignored; presence unchanged."); break;
    case SensorLogGate::Recovered:
      Serial.println("RECOVERED: Valid sensor readings have resumed.");
      if (!gate.armed) Serial.println("WAITING: Keep the sensor view clear beyond 950 mm to rearm.");
      break;
    default: break;
  }
  if (gate.armed && !previouslyArmed)
    Serial.println("ARMED: View is clear. Approach within 800 mm to launch a ripple.");
  previouslyArmed = gate.armed;
  if (DEBUG_DISTANCE && gate.fresh && lastSampleValid && uint32_t(now - lastReport) >= REPORT_MS) {
    lastReport = now;
    Serial.print("DISTANCE: "); Serial.print(lastMm); Serial.print(" mm (");
    Serial.print(lastMm / 10.0f, 1); Serial.println(" cm)");
  }
}

// BEGIN_PORTABLE_RIPPLE
struct RippleSample { float wave, sparkle; };
RippleSample rippleSample(uint16_t pixel, uint16_t count, uint32_t elapsed);
float clamp01(float v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
float softPulse(float distance, float width) {
  float x = clamp01(1.0f - fabsf(distance) / width);
  return x * x * (3.0f - 2.0f * x);
}
RippleSample rippleSample(uint16_t pixel, uint16_t count, uint32_t elapsed) {
  if (count < 2 || elapsed >= 3400) return {0, 0};
  const int32_t pairDistance = abs(int32_t(2) * pixel - int32_t(count - 1));
  const float distance = pairDistance * 0.5f;
  const float center = (count - 1) * 0.5f;
  const float radius = float(elapsed) / 2400.0f * (center + 3.0f);
  const float front = softPulse(distance - radius, 3.5f);
  const float trailing = radius >= distance ? softPulse(radius - distance, 9.0f) * 0.35f : 0;
  const float burst = softPulse(distance, 5.0f) * clamp01(1.0f - float(elapsed) / 650.0f);
  const float fade = clamp01(float(3400 - elapsed) / 650.0f);
  // Pair-based phases mirror the freckles exactly; sine envelopes avoid flashing steps.
  const float twinkle = 0.5f + 0.5f * sinf(float(elapsed) * 0.018f + pairDistance * 2.39996f);
  const float sparks = twinkle * twinkle * twinkle * clamp01(front + trailing);
  return {clamp01(front * 0.8f + trailing + burst) * fade, sparks * fade};
}
// END_PORTABLE_RIPPLE
// BEGIN_PORTABLE_SPECTRUM
constexpr uint32_t RAINBOW_CYCLE_MS = 32000; // previous complete cycle: 40960 ms
uint16_t spectrumPhase(uint32_t now, uint16_t pixel, uint16_t count) {
  const uint32_t temporal = (now % RAINBOW_CYCLE_MS) * 65536UL / RAINBOW_CYCLE_MS;
  const uint32_t spatial = count ? uint32_t(pixel) * 65536UL / count : 0;
  return uint16_t(temporal + spatial);
}
uint16_t spectrumBlend(uint16_t phase) {
  const float t = float(phase & 8191) / 8192.0f;
  return uint16_t(65535.0f * t * t * (3.0f - 2.0f * t));
}
// END_PORTABLE_SPECTRUM
CRGB smoothSpectrum(uint16_t phase, uint8_t saturation, uint8_t value) {
  const uint8_t anchorHue = uint8_t((phase >> 13) * 32);
  const CRGB a = CHSV(anchorHue, saturation, value);
  const CRGB b = CHSV(uint8_t(anchorHue + 32), saturation, value);
  const uint32_t mix = spectrumBlend(phase);
  // 16-bit interpolation avoids discarding the fractional phase before RGB blending.
  return CRGB((uint32_t(a.r) * (65535 - mix) + uint32_t(b.r) * mix + 32767) / 65535,
              (uint32_t(a.g) * (65535 - mix) + uint32_t(b.g) * mix + 32767) / 65535,
              (uint32_t(a.b) * (65535 - mix) + uint32_t(b.b) * mix + 32767) / 65535);
}
void startSweep(uint32_t now) {
  animationStart = now; animating = true;
  Serial.println("MOVEMENT DETECTED: Center ripple scattering toward both ends.");
}
void animate(uint32_t now) {
  if (uint32_t(now - lastFrame) < FRAME_MS) return;
  lastFrame = now;
  const uint32_t elapsed = uint32_t(now - animationStart);
  if (animating && elapsed >= 3400) {
    animating = false;
    Serial.println("EFFECT COMPLETE: Ripple blended back into the rainbow.");
  }
  // Smooth cubic blending across eight spectrum anchors, with full fractional
  // spatial/time phase. Both baseline and disruption use the same continuous palette.
  for (uint16_t i = 0; i < NUM_LEDS; ++i) {
    const uint16_t hue16 = spectrumPhase(now, i, NUM_LEDS);
    CRGB color = smoothSpectrum(hue16, 240, 160);
    if (animating) {
      const RippleSample r = rippleSample(i, NUM_LEDS, elapsed);
      const uint16_t displacedHue = hue16 + uint16_t(24576.0f * r.wave);
      const CRGB disruption = smoothSpectrum(displacedHue, 210, 230);
      color = blend(color, disruption, uint8_t(r.wave * 220.0f));
      color = blend(color, CRGB(220, 240, 255), uint8_t(r.sparkle * 235.0f));
    }
    leds[i] = color;
  }
  FastLED.show();
}
void setup() {
  Serial.begin(115200);
  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, NUM_LEDS);
  FastLED.setBrightness(BRIGHTNESS); FastLED.setDither(0); FastLED.clear(true);
  Serial.println("\nToF Rainbow Ripple 90 | smooth colors v2");
  Serial.println("CONFIG: UNO R4 WiFi; D6; 90 LEDs (approximate); brightness 16/255.");
  Serial.println("COLORS: Smooth spectrum; 32-second cycle; brightness unchanged.");
  Serial.println("SENSOR: VL53L1X on SDA/SCL; approach below 800 mm; clear beyond 950 mm.");
  Serial.println("TIMING: Approach 200 ms; clear 400 ms; stale after 1 second. One trigger per approach.");
  animationStart = millis();
  Wire.begin(); Wire.setClock(400000); Wire.setWireTimeout(25000, true);
  sensor.setTimeout(100);
  if (!sensor.init() || !sensor.setDistanceMode(VL53L1X::Long) ||
      !sensor.setMeasurementTimingBudget(50000)) {
    Serial.println("ERROR: Sensor did not initialize. Rainbow remains active; detection disabled. Check sensor power and SDA/SCL, then reset.");
    return;
  }
  sensor.startContinuous(60);
  animationStart = millis();
  sensorOK = sensor.last_status == 0;
  sensorStart = millis();
  if (sensorOK) {
    Serial.println("SENSOR READY: Distance measurements started. Rainbow baseline active.");
    Serial.println("WAITING: Keep the sensor view clear beyond 950 mm to arm.");
  } else {
    Serial.println("ERROR: Sensor could not start measurements. Rainbow remains active; detection disabled. Check connections, then reset.");
  }
}
void loop() {
  const uint32_t now = millis();
  gate.tick(now);
  if (sensorOK && uint32_t(now - lastPoll) >= POLL_MS) {
    lastPoll = now;
    const bool ready = sensor.dataReady();
    i2cError = sensor.last_status;
    if (i2cError != 0) {
      lastSampleValid = false; gate.update(now, false, 0);
    } else if (ready) {
      const uint16_t mm = sensor.read(false);
      i2cError = sensor.last_status;
      lastRangeStatus = uint8_t(sensor.ranging_data.range_status);
      const bool timedOut = sensor.timeoutOccurred();
      lastSampleValid = sensor.last_status == 0 && !timedOut &&
        sensor.ranging_data.range_status == VL53L1X::RangeValid && mm > 0;
      if (lastSampleValid) lastMm = mm;
      if (gate.update(now, lastSampleValid, mm)) startSweep(now);
    }
  }
  animate(now);
  logSensorState(now);
}
