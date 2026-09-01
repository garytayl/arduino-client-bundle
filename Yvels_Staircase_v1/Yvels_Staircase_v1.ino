#include <FastLED.h>

#define LED_PIN     6
#define SENSOR_1    2
#define SENSOR_2    3

#define NUM_LEDS    75
#define TEST_LEDS   50
#define BRIGHTNESS  70

CRGB leds[NUM_LEDS];

bool lastS1 = false;
bool lastS2 = false;

int firstSensor = 0;
unsigned long lastTriggerTime = 0;

const unsigned long DIRECTION_WINDOW = 2000;


// =====================================================
// UP COLOR
// Blue → Cyan → Purple
// =====================================================

CRGB upColor(int position) {

  uint8_t hue = map(
    position,
    0,
    TEST_LEDS - 1,
    160,   // blue/cyan
    200    // violet
  );

  return CHSV(hue, 255, 255);
}


// =====================================================
// DOWN COLOR
// Magenta → Red → Orange
// =====================================================

CRGB downColor(int position) {

  uint8_t hue = map(
    position,
    0,
    TEST_LEDS - 1,
    245,   // magenta
    15     // orange/red
  );

  return CHSV(hue, 255, 255);
}


// =====================================================
// UP ANIMATION
// =====================================================

void animateUp() {

  Serial.println("↑ UP");

  FastLED.clear();

  // Run slightly beyond the strip so the tail
  // has time to disappear.
  for (int head = 0; head < TEST_LEDS + 12; head++) {

    fadeToBlackBy(leds, NUM_LEDS, 48);

    // 5 LED glowing head
    for (int j = 0; j < 5; j++) {

      int led = head - j;

      if (led >= 0 && led < TEST_LEDS) {

        CRGB color = upColor(led);

        // LEDs farther behind head are dimmer
        color.fadeToBlackBy(j * 35);

        leds[led] += color;
      }
    }

    FastLED.show();
    delay(25);
  }

  FastLED.clear(true);
}


// =====================================================
// DOWN ANIMATION
// =====================================================

void animateDown() {

  Serial.println("↓ DOWN");

  FastLED.clear();

  for (int head = TEST_LEDS - 1;
       head >= -12;
       head--) {

    fadeToBlackBy(leds, NUM_LEDS, 48);

    // 5 LED glowing head
    for (int j = 0; j < 5; j++) {

      int led = head + j;

      if (led >= 0 && led < TEST_LEDS) {

        CRGB color = downColor(led);

        color.fadeToBlackBy(j * 35);

        leds[led] += color;
      }
    }

    FastLED.show();
    delay(25);
  }

  FastLED.clear(true);
}


// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);

  pinMode(SENSOR_1, INPUT);
  pinMode(SENSOR_2, INPUT);

  FastLED.addLeds<WS2812B, LED_PIN, GRB>(
    leds,
    NUM_LEDS
  );

  FastLED.setBrightness(BRIGHTNESS);
  FastLED.clear(true);

  Serial.println("Smart Staircase RGB Prototype Ready");
}


// =====================================================
// LOOP
// =====================================================

void loop() {

  bool s1 = digitalRead(SENSOR_1) == LOW;
  bool s2 = digitalRead(SENSOR_2) == LOW;


  // -----------------------
  // SENSOR 1 TRIGGERED
  // -----------------------

  if (s1 && !lastS1) {

    Serial.println("Sensor 1");

    // Sensor 2 happened first
    if (
      firstSensor == 2 &&
      millis() - lastTriggerTime < DIRECTION_WINDOW
    ) {

      animateDown();

      firstSensor = 0;

    } else {

      firstSensor = 1;
      lastTriggerTime = millis();
    }
  }


  // -----------------------
  // SENSOR 2 TRIGGERED
  // -----------------------

  if (s2 && !lastS2) {

    Serial.println("Sensor 2");

    // Sensor 1 happened first
    if (
      firstSensor == 1 &&
      millis() - lastTriggerTime < DIRECTION_WINDOW
    ) {

      animateUp();

      firstSensor = 0;

    } else {

      firstSensor = 2;
      lastTriggerTime = millis();
    }
  }


  // Reset incomplete sequence
  if (
    firstSensor != 0 &&
    millis() - lastTriggerTime > DIRECTION_WINDOW
  ) {

    firstSensor = 0;
  }


  lastS1 = s1;
  lastS2 = s2;

  delay(5);
}