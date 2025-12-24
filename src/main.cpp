#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>

// ===== WiFi Configuration =====
const char* ssid = "suito";           // Replace with your WiFi SSID
const char* password = "12345678";   // Replace with your WiFi password