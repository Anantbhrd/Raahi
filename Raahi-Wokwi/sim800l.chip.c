// Lightweight custom Wokwi SIM800L simulator.
// Responds to common AT commands and simulates an HTTP 200 response. It does
// not access a real GSM network or external server.
#include "wokwi-api.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#define COMMAND_MAX 256
#define PAYLOAD_MAX 1024

typedef struct {
  uart_dev_t uart;
  char command[COMMAND_MAX];
  uint32_t command_len;
  char payload[PAYLOAD_MAX];
  uint32_t payload_len;
  uint32_t expected_payload_len;
  bool in_http_data_mode;
  bool ignore_next_lf;
} gsm_state_t;

static void send_text(gsm_state_t *state, const char *text) {
  uart_write(state->uart, (uint8_t *)text, (uint32_t)strlen(text));
}

static void process_command(gsm_state_t *state) {
  state->command[state->command_len] = '\0';
  if (state->command_len == 0) return;
  printf("[SIM800L] AT command: %s\n", state->command);

  if (strncmp(state->command, "AT+HTTPDATA=", 12) == 0) {
    const char *number = state->command + 12;
    state->expected_payload_len = (uint32_t)strtoul(number, NULL, 10);
    if (state->expected_payload_len >= PAYLOAD_MAX) {
      state->expected_payload_len = PAYLOAD_MAX - 1;
    }
    state->payload_len = 0;
    state->payload[0] = '\0';
    state->in_http_data_mode = true;
    send_text(state, "DOWNLOAD\r\n");
  } else if (strcmp(state->command, "AT+HTTPACTION=1") == 0) {
    // A simulated modem/network result only; no request reaches the Internet.
    send_text(state, "\r\nOK\r\n+HTTPACTION: 1,200,2\r\n");
    printf("[SIM800L] Simulated HTTP POST accepted; actual network/server not contacted.\n");
  } else {
    // Sufficient for this prototype's AT, SAPBR and HTTPINIT/HTTPPARA/HTTPTERM commands.
    send_text(state, "\r\nOK\r\n");
  }
  state->command_len = 0;
}

static void on_uart_rx(void *user_data, uint8_t byte) {
  gsm_state_t *state = (gsm_state_t *)user_data;

  // Serial.println() sends CRLF. After processing CR, consume the trailing LF
  // before switching to the modem HTTPDATA payload mode.
  if (state->ignore_next_lf && byte == '\n') {
    state->ignore_next_lf = false;
    return;
  }
  state->ignore_next_lf = false;

  if (state->in_http_data_mode) {
    if (state->payload_len < PAYLOAD_MAX - 1) {
      state->payload[state->payload_len++] = (char)byte;
      state->payload[state->payload_len] = '\0';
    }
    if (state->payload_len >= state->expected_payload_len) {
      state->in_http_data_mode = false;
      printf("[SIM800L] Simulated HTTP payload (%u bytes): %s\n",
             state->payload_len, state->payload);
      send_text(state, "\r\nOK\r\n");
    }
    return;
  }

  if (byte == '\r') {
    process_command(state);
    state->ignore_next_lf = true;
    return;
  }
  if (byte == '\n') {
    process_command(state);
    return;
  }

  if (state->command_len < COMMAND_MAX - 1) {
    state->command[state->command_len++] = (char)byte;
  } else {
    state->command_len = 0;
  }
}

void chip_init(void) {
  gsm_state_t *state = (gsm_state_t *)calloc(1, sizeof(gsm_state_t));
  if (!state) return;

  const uart_config_t uart_config = {
    .tx = pin_init("TX", INPUT_PULLUP),
    .rx = pin_init("RX", INPUT),
    .baud_rate = 9600,
    .rx_data = on_uart_rx,
    .user_data = state
  };
  state->uart = uart_init(&uart_config);
  printf("SIM800L simulator started at 9600 baud. No real cellular/network access.\n");
}
