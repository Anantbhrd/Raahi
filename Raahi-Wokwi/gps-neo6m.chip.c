// Lightweight custom Wokwi NEO-6M simulator: emits valid NMEA RMC lines.
#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define GPS_INTERVAL_US 1000000

typedef struct {
  uart_dev_t uart;
  uint32_t index;
} gps_state_t;

static const char *nmea_lines[] = {
  "$GPRMC,120000.00,A,1719.2000,N,07649.2000,E,12.0,90.0,231026,,,A*51\r\n",
  "$GPRMC,120001.00,A,1719.2600,N,07649.2900,E,12.0,90.0,231026,,,A*5F\r\n",
  "$GPRMC,120002.00,A,1719.3500,N,07649.3800,E,12.0,90.0,231026,,,A*5E\r\n",
  "$GPRMC,120003.00,A,1719.4400,N,07649.5000,E,12.0,90.0,231026,,,A*57\r\n",
  "$GPRMC,120004.00,A,1719.5600,N,07649.6200,E,12.0,90.0,231026,,,A*52\r\n"
};

static void gps_tick(void *user_data) {
  gps_state_t *state = (gps_state_t *)user_data;
  const char *line = nmea_lines[state->index];
  uart_write(state->uart, (uint8_t *)line, (uint32_t)strlen(line));
  state->index = (state->index + 1) % (sizeof(nmea_lines) / sizeof(nmea_lines[0]));
}

void chip_init(void) {
  gps_state_t *state = (gps_state_t *)calloc(1, sizeof(gps_state_t));
  if (!state) return;

  const uart_config_t uart_config = {
    .tx = pin_init("TX", INPUT_PULLUP),
    .rx = pin_init("RX", INPUT),
    .baud_rate = 9600,
    .user_data = state
  };
  state->uart = uart_init(&uart_config);

  const timer_config_t timer_config = {
    .callback = gps_tick,
    .user_data = state
  };
  timer_t timer = timer_init(&timer_config);
  timer_start(timer, GPS_INTERVAL_US, true);
  printf("GPS NEO-6M simulator started: NMEA output every second.\n");
}
