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