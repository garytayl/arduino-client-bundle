# Arduino Client Bundle

This repository contains the original Arduino sketches found in the author's local Arduino workspace on August 31, 2026.

## Projects

### Staircase project library

The static project hub lives in [`hub/`](hub/README.md). It organizes verified code, signal assignments, testing expectations and next steps without modifying the original sketch. See its README for build and content-update instructions.

### Yvels Staircase v1

An Arduino/FastLED prototype for a direction-aware RGB staircase. Two sensors determine travel direction and trigger blue-to-violet or magenta-to-orange LED animations.

#### Requirements

- Arduino-compatible board
- WS2812B LED strip
- Two digital sensors
- [FastLED](https://fastled.io/) library

#### Default wiring

- LED data: pin 6
- Sensor 1: pin 2
- Sensor 2: pin 3

Open `Yvels_Staircase_v1/Yvels_Staircase_v1.ino` in the Arduino IDE, install FastLED, select the appropriate board and port, then upload.

## Notes

Installed third-party Arduino libraries and their bundled examples are intentionally excluded. The source folders remain unchanged in their original location.
