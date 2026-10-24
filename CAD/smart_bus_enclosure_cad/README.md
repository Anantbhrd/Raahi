# Smart Bus Tracking Unit — Compact Enclosure CAD

## Files
- `bus_unit_enclosure.scad` — editable parametric OpenSCAD source. Set `part = "assembly"`, `"base"`, or `"front"` near the top.
- `bus_unit_base.stl` — back shell STL for 3D printing.
- `bus_unit_front_panel.stl` — front face STL for 3D printing.
- `bus_unit_assembly_preview.png` — preview of the assembled enclosure.
- `DIMENSIONS_AND_PRINTING.md` — dimensions, hardware-fit notes and print recommendations.

## Nominal dimensions
- Main body: 100 × 120 × 40 mm
- Front panel: 100 × 120 × 3 mm
- Total depth: about 43 mm, excluding cables and antennas
- LCD window: 76 × 19 mm
- RFID tap zone: raised non-metallic target, 29 mm outer diameter
- One status LED, one service/sync button, buzzer perforations

## Intended electronics
ESP32, MFRC522 RFID reader, GPS/GNSS module, cellular/GSM module, 16×2 I²C LCD, one status LED, buzzer and one service/sync button. ETA prediction, crowd-pattern analytics and wait-versus-walk recommendations remain software-side.

## Important fit note
This is an editable concept enclosure, not a verified fit for every supplier's PCBs. LCD bezels, mounting holes, USB connectors, GPS/GSM antenna connectors and breakout-board outlines vary. Measure your exact components and edit the SCAD parameters or support pads before printing the final housing. Keep the RFID face plastic and non-metallic. External GPS/cellular antenna pigtails may be necessary depending on the bus installation.

## Print guidance
- Material: PETG or ASA for a prototype; for actual installation, choose material suitable for temperature, vibration and flammability requirements.
- Suggested layer height: 0.20 mm.
- Suggested walls: 4 perimeters; 25–35% infill for the base; 4–5 perimeters for the front panel.
- Print the base open-side-up and the front panel flat.
- Test the panel and all connectors before final assembly. Use strain relief for wiring and do not over-tighten plastic bosses.
- This is not a certified automotive enclosure. Mount away from airbags, driver's field of view, hot surfaces, moisture and moving parts.
