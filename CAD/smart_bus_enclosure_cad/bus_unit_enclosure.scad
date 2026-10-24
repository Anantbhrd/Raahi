/*
 Smart Bus Tracking Unit — compact portrait enclosure
 Editable parametric OpenSCAD model. All measurements in millimetres.

 Intended electronics: ESP32, MFRC522 RFID reader, GPS receiver, cellular/GSM module,
 16x2 I2C LCD, one status LED, one service/sync button, buzzer.

 Design is a concept-level enclosure shell. Internal board mounting positions are intentionally
 generic because PCB dimensions, connector locations, antenna types and mounting-hole spacing vary
 by supplier. Measure the exact parts and adjust before printing a final case.
*/
part = "assembly"; // [assembly, base, front]
$fn = 32;

// Main envelope: 100 x 120 x 40 mm body + 3 mm front plate (43 mm deep total)
body_w = 100;
body_h = 120;
body_d = 40;
wall = 2.4;
corner_r = 7;
front_t = 3;
front_w = body_w;
front_h = body_h;
front_r = 7;

// Front panel layout
lcd_cx = 0;
lcd_cy = 28;
lcd_window_w = 76;
lcd_window_h = 19;
rfid_cx = -24;
rfid_cy = -17;
rfid_outer_r = 14.5;
led_x = 35;
led_y = -7;
button_x = 35;
button_y = -34;
buzzer_x = 10;
buzzer_y = -34;

cavity_w = body_w - 2*wall;
cavity_h = body_h - 2*wall;

module rounded_prism(w, h, d, r) {
    linear_extrude(height=d)
        offset(r=r)
            square([w-2*r, h-2*r], center=true);
}

module front_screw_boss(x, y) {
    translate([x, y, body_d-9]) difference() {
        cylinder(h=9, d=8.5);
        translate([0,0,-0.2]) cylinder(h=9.5, d=2.8);
    }
}

module base_shell() {
    difference() {
        rounded_prism(body_w, body_h, body_d, corner_r);

        // Open cavity toward the front panel, leaving 2.4 mm rear wall.
        translate([0,0,wall])
            rounded_prism(cavity_w, cavity_h, body_d-wall+0.2, corner_r-wall);

        // Four rear mounting holes through the rear wall; mount screws are fitted from inside.
        for (x=[-27,27]) for (y=[-48,48])
            translate([x,y,-0.2]) cylinder(h=wall+0.5, d=4.5);

        // Right-side USB/service access opening (measure your ESP32 board connector first).
        translate([body_w/2-wall-0.3, -39, 18]) cube([wall+0.8, 12, 7]);

        // Bottom-edge cable exits: central power/data cable and two small antenna pigtails.
        translate([-4, -body_h/2+wall+0.2, 15]) rotate([90,0,0]) cylinder(h=wall+0.6, d=8.5);
        for (x=[-22,22])
            translate([x, -body_h/2+wall+0.2, 15]) rotate([90,0,0]) cylinder(h=wall+0.6, d=5.5);
    }

    // Front plate screw bosses near the rounded corners.
    for (x=[-41,41]) for (y=[-52,52]) front_screw_boss(x,y);

    // Short, generic PCB support pads around perimeter. These are not hole-pattern-specific.
    // Adapt/remove them after measuring the actual ESP32, RFID, GPS and GSM breakout boards.
    for (x=[-44,44]) for (y=[-54,18])
        translate([x,y,wall]) difference() {
            cylinder(h=5, d=5.5);
            translate([0,0,-0.2]) cylinder(h=5.5, d=2.2);
        }
}

module front_panel() {
    difference() {
        rounded_prism(front_w, front_h, front_t, front_r);

        // LCD viewing window; confirm exact bezel dimensions before printing.
        translate([lcd_cx-lcd_window_w/2, lcd_cy-lcd_window_h/2, -0.2])
            cube([lcd_window_w, lcd_window_h, front_t+0.5]);

        // Removable front-panel fasteners
        for (x=[-41,41]) for (y=[-52,52])
            translate([x,y,-0.2]) cylinder(h=front_t+0.5, d=3.2);

        // Single status LED and single service/sync push button
        translate([led_x,led_y,-0.2]) cylinder(h=front_t+0.5, d=4.0);
        translate([button_x,button_y,-0.2]) cylinder(h=front_t+0.5, d=7.2);

        // Buzzer grill
        for (row=[-1:1]) for (col=[-2:2])
            if (abs(col)+abs(row)<4)
                translate([buzzer_x+col*3.2, buzzer_y+row*3.2, -0.2])
                    cylinder(h=front_t+0.5, d=1.8);

        // Engraved labels cut from the external face of the panel (surface at z=3).
        translate([0,53,2.4]) linear_extrude(height=0.75)
            text("CAMPUS TRANSIT", size=4.8, font="Inter:style=Bold", halign="center", valign="center");
        translate([0,46.5,2.4]) linear_extrude(height=0.75)
            text("BUS UNIT 01", size=2.8, font="Inter:style=Medium", halign="center", valign="center");
        translate([rfid_cx, rfid_cy-20.0, 2.4]) linear_extrude(height=0.75)
            text("TAP ID", size=3.6, font="Inter:style=Bold", halign="center", valign="center");
        translate([led_x-1.0,led_y-7.3,2.4]) linear_extrude(height=0.75)
            text("STATUS", size=2.4, font="Inter:style=Medium", halign="center", valign="center");
        translate([button_x,button_y-7.8,2.4]) linear_extrude(height=0.75)
            text("SYNC", size=2.4, font="Inter:style=Medium", halign="center", valign="center");
        translate([buzzer_x,buzzer_y-10.0,2.4]) linear_extrude(height=0.75)
            text("AUDIO", size=2.4, font="Inter:style=Medium", halign="center", valign="center");
    }

    // Raised non-metallic RFID tap rings on the external face (no holes through the antenna zone).
    translate([rfid_cx,rfid_cy,3]) difference() {
        cylinder(h=0.65, r=rfid_outer_r);
        translate([0,0,-0.1]) cylinder(h=0.9, r=rfid_outer_r-1.1);
    }
    translate([rfid_cx,rfid_cy,3]) difference() {
        cylinder(h=0.65, r=5.8);
        translate([0,0,-0.1]) cylinder(h=0.9, r=4.6);
    }
    translate([rfid_cx-4.0,rfid_cy-2.4,3]) linear_extrude(height=0.65)
        difference() {
            square([8,4.8]);
            translate([0.6,0.6]) square([6.8,3.6]);
        }
}

module assembly() {
    color([0.12,0.14,0.17]) base_shell();
    color([0.17,0.20,0.23]) translate([0,0,body_d]) front_panel();
}

if (part == "assembly") assembly();
else if (part == "base") base_shell();
else if (part == "front") front_panel();
