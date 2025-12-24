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
