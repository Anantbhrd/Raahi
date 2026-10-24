# Smart Bus Tracking System — Updated Wokwi Bus-Side Unit

This compact circuit contains only the ESP32, RFID, GPS, GSM, I2C display, one LED with a resistor, buzzer, and one manual-sync button.

## Files
- `sketch.ino` — ESP32 firmware for RFID access control, GPS parsing, LCD feedback, and GSM telemetry.
- `diagram.json` — Wokwi circuit and wiring.
- `libraries.txt` — Arduino libraries used by the sketch.
- `gps-neo6m.chip.json` / `.chip.c` — custom NMEA-output GPS simulator for Wokwi.
- `sim800l.chip.json` / `.chip.c` — custom AT-command/HTTP-response SIM800L simulator for Wokwi.

## Open in Wokwi
1. Create a new ESP32 project in Wokwi.
2. Replace `sketch.ino` and `diagram.json` with these files.
3. Add both custom chips to the project by adding the provided `.chip.json` and `.chip.c` files exactly as named. The diagram uses `chip-gps-neo6m` and `chip-sim800l`.
4. Add the libraries in `libraries.txt` through Library Manager.
5. Start simulation and open Serial Monitor at 115200 baud.

## Pin map
| Device signal | ESP32 pin |
|---|---|
| MFRC522 SS/SDA | GPIO 5 |
| MFRC522 SCK / MISO / MOSI | GPIO 18 / 19 / 23 |
| MFRC522 RST | GPIO 4 |
| GPS TX -> ESP32 RX | GPIO 16 |
| GPS RX <- ESP32 TX | GPIO 17 (optional) |
| GSM TX -> ESP32 RX | GPIO 26 |
| GSM RX <- ESP32 TX | GPIO 27 |
| I2C LCD SDA / SCL | GPIO 21 / 22 |
| Green status LED through 220 ohm resistor | GPIO 14 |
| Buzzer positive | GPIO 25 |
| Manual SYNC button | GPIO 32 to GND (`INPUT_PULLUP`) |

All grounds must be common. The MFRC522 uses 3.3 V. The diagram powers the I2C LCD from 5 V for Wokwi compatibility; a physical ESP32 circuit must ensure the LCD backpack's SDA/SCL pull-ups never drive ESP32 pins to 5 V. Use a 3.3 V-compatible backpack or a bidirectional I2C level shifter.

## RFID test
The allow-list is hard-coded for the simulation:
- `01:02:03:04` — access granted
- `11:22:33:44` — access granted
- Other UIDs — access denied

The LCD shows `ACCESS GRANTED` or `ACCESS DENIED`. The LED and buzzer provide local feedback. When idle, the LCD shows GPS and GSM status.

## GPS / GSM behavior
The custom GPS chip emits NMEA RMC sentences with example coordinates; they are not live coordinates. The SIM800L custom chip responds to AT commands and returns a simulated HTTP 200; it does not contact a real cellular network or website. The ESP32 builds a JSON telemetry payload and simulates an HTTP POST to the configured URL.

Before a physical prototype, change `GSM_APN` and `API_URL` in `sketch.ino`. Use an API URL that is reachable over the cellular connection. A real SIM800L requires a suitable SIM, compatible 2G coverage, antenna, and a separate supply capable of handling transmit-current peaks. Confirm local network support before buying a modem. For production security, use a secure transport-capable modem and authenticated HTTPS, store credentials safely, and queue events during coverage loss.
