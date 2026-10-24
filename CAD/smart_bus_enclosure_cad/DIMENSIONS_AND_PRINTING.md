# Dimensions and Physical Integration Notes

| Feature | Nominal dimension |
|---|---:|
| Main body width | 100 mm |
| Main body height | 120 mm |
| Main body depth | 40 mm |
| Front-panel thickness | 3 mm |
| Overall depth | approximately 43 mm, excluding cable exits |
| LCD viewing window | 76 × 19 mm |
| RFID target ring | 29 mm outer diameter |
| LED opening | 4 mm diameter |
| Sync button opening | 7.2 mm diameter |
| Buzzer holes | 1.8 mm diameter |
| Rear mounting holes | 4 holes, 4.5 mm diameter |
| USB/service opening | 12 × 7 mm nominal |
| Cable/antenna pass-throughs | 8.5 mm and two 5.5 mm nominal holes |

## Before printing a final enclosure
1. Measure your exact 16×2 I²C LCD and ensure its display/PCB can fit behind the 76 × 19 mm viewing window.
2. Verify the MFRC522 reader sits directly behind the raised `TAP ID` zone. Keep the face over the reader non-metallic and test read range with the printed panel.
3. Measure the ESP32 USB connector position before using the side service opening.
4. Check the exact GPS and GSM module footprints, connectors, cable bend radii, antenna placement and power regulation. The internal support pads are generic and may require moving/removing.
5. Do not feed a bare SIM800L from the ESP32 3.3 V pin. Use a suitable supply designed for its current peaks.
6. Check GPS performance and electromagnetic noise after assembly, especially if the cellular antenna or switching regulator is close to the GPS receiver.
7. Secure the enclosure and all wiring against vibration; this concept is not automotive-certified.

## Recommended prototype print settings
- PETG or ASA, 0.2 mm layer height.
- Base: 4 perimeters, 25–35% infill.
- Front panel: 4–5 perimeters.
- Print base open-side-up and front panel flat.
