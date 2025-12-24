#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ===== WiFi Configuration =====
const char* ssid = "suito";           // Replace with your WiFi SSID
const char* password = "12345678";   // Replace with your WiFi password

// ===== MQTTS Broker Configuration =====
const char* mqtt_server = "038f74955fe741d3b52eeabac9673729.s1.eu.hivemq.cloud";  // Replace with your MQTT broker address
const int mqtt_port = 8883;                     // MQTTS port (TLS)
const char* mqtt_user = "sudip";       // Replace with your MQTT username (if required)
const char* mqtt_password = "12345678aA";   // Replace with your MQTT password (if required)
const char* mqtt_topic = "braille";     // MQTT topic to subscribe to

// ===== TLS/SSL Certificate (Optional - for server verification) =====
// If your broker uses a self-signed certificate, add it here
// For testing, you can skip certificate verification (insecure)
const char* ca_cert = R"EOF(
-----BEGIN CERTIFICATE-----
(Add your CA certificate here for secure connection)
-----END CERTIFICATE-----
)EOF";

// ===== Servo Configuration =====
// 6 servos representing 6 Braille dots
// Dot numbering (standard Braille):
//   1 • • 4
//   2 • • 5
//   3 • • 6
const int SERVO_PINS[6] = {18, 19, 21, 22, 23, 25};  // GPIO pins for servos 1-6
const int RAISED_ANGLE = 90;    // Servo angle for raised dot (active)
const int LOWERED_ANGLE = 0;    // Servo angle for lowered dot (inactive)

Servo servos[6];

// ===== WiFi and MQTT Clients =====
WiFiClientSecure espClient;
PubSubClient mqtt_client(espClient);

// ===== Braille Pattern Mapping (6-dot) =====
// Each letter A-Z mapped to 6-bit pattern (bit 0 = dot 1, bit 5 = dot 6)
// 1 = raised (active), 0 = lowered (inactive)
const uint8_t braillePatterns[26] = {
  0b100000,  // A: dot 1
  0b110000,  // B: dots 1,2
  0b100100,  // C: dots 1,4
  0b100110,  // D: dots 1,4,5
  0b100010,  // E: dots 1,5
  0b110100,  // F: dots 1,2,4
  0b110110,  // G: dots 1,2,4,5
  0b110010,  // H: dots 1,2,5
  0b010100,  // I: dots 2,4
  0b010110,  // J: dots 2,4,5
  0b101000,  // K: dots 1,3
  0b111000,  // L: dots 1,2,3
  0b101100,  // M: dots 1,3,4
  0b101110,  // N: dots 1,3,4,5
  0b101010,  // O: dots 1,3,5
  0b111100,  // P: dots 1,2,3,4
  0b111110,  // Q: dots 1,2,3,4,5
  0b111010,  // R: dots 1,2,3,5
  0b011100,  // S: dots 2,3,4
  0b011110,  // T: dots 2,3,4,5
  0b101001,  // U: dots 1,3,6
  0b111001,  // V: dots 1,2,3,6
  0b010111,  // W: dots 2,4,5,6
  0b101101,  // X: dots 1,3,4,6
  0b101111,  // Y: dots 1,3,4,5,6
  0b101011   // Z: dots 1,3,5,6
};

// ===== Function Prototypes =====
void setupWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void updateBrailleServos(uint8_t pattern);
void setAllServosLowered();
