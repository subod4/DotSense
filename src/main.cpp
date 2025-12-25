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
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== ESP32 Braille Display System ===");

  // Initialize servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  
  for (int i = 0; i < 6; i++) {
    servos[i].setPeriodHertz(50);
    servos[i].attach(SERVO_PINS[i], 500, 2400);
    servos[i].write(LOWERED_ANGLE);  // Start with all dots lowered
  }
  Serial.println("✓ Servos initialized");
  delay(500);

  // Connect to WiFi
  setupWiFi();

  // Configure MQTTS
  espClient.setInsecure();  // Skip certificate verification (for testing)
  // For production, use: espClient.setCACert(ca_cert);
  
  mqtt_client.setServer(mqtt_server, mqtt_port);
  mqtt_client.setCallback(mqttCallback);
  mqtt_client.setKeepAlive(60);
  mqtt_client.setSocketTimeout(30);

  Serial.println("Setup complete!");
}

void loop() {
  // Maintain WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    setupWiFi();
  }

  // Maintain MQTT connection
  if (!mqtt_client.connected()) {
    reconnectMQTT();
  }
  
  mqtt_client.loop();  // Process incoming MQTT messages
  delay(10);           // Small delay to prevent watchdog issues
}

// ===== WiFi Connection Function =====
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  // Disconnect and clear previous config
  WiFi.disconnect(true);
  delay(1000);
  
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {  // Increased timeout
    delay(500);
    Serial.print(".");
    
    // Print detailed status every 5 seconds
    if (attempts % 10 == 0 && attempts > 0) {
      Serial.println();
      Serial.print("Status: ");
      switch (WiFi.status()) {
        case WL_IDLE_STATUS: Serial.println("Idle"); break;
        case WL_NO_SSID_AVAIL: Serial.println("SSID not found!"); break;
        case WL_SCAN_COMPLETED: Serial.println("Scan completed"); break;
        case WL_CONNECT_FAILED: Serial.println("Connection failed!"); break;
        case WL_CONNECTION_LOST: Serial.println("Connection lost"); break;
        case WL_DISCONNECTED: Serial.println("Disconnected"); break;
        default: Serial.println("Unknown"); break;
      }
    }
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("MAC Address: ");
    Serial.println(WiFi.macAddress());
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.print("Final status: ");
    Serial.println(WiFi.status());
    Serial.println("\nTroubleshooting:");
    Serial.println("1. Check WiFi name and password");
    Serial.println("2. Ensure router is on 2.4GHz (ESP32 doesn't support 5GHz)");
    Serial.println("3. Check router security settings");
    Serial.println("4. Try moving ESP32 closer to router");
  }
}

// ===== MQTT Reconnection Function =====
void reconnectMQTT() {
  while (!mqtt_client.connected()) {
    Serial.print("Connecting to MQTTS broker...");
    
    String clientId = "ESP32_Braille_" + String(random(0xffff), HEX);
    
    // Attempt to connect
    bool connected;
    if (strlen(mqtt_user) > 0 && strlen(mqtt_password) > 0) {
      connected = mqtt_client.connect(clientId.c_str(), mqtt_user, mqtt_password);
    } else {
      connected = mqtt_client.connect(clientId.c_str());
    }
    
    if (connected) {
      Serial.println(" Connected!");
      Serial.print("✓ Subscribed to topic: ");
      Serial.println(mqtt_topic);
      
      mqtt_client.subscribe(mqtt_topic);
      
      // Visual confirmation - briefly raise all servos
      for (int i = 0; i < 6; i++) {
        servos[i].write(RAISED_ANGLE);
      }
      delay(500);
      setAllServosLowered();
      
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(mqtt_client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

// ===== MQTT Message Callback =====
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received on topic: ");
  Serial.println(topic);
  
  if (length == 0) {
    Serial.println("Empty message received");
    return;
  }
  
  // Get first character and convert to uppercase
  char letter = (char)payload[0];
  if (letter >= 'a' && letter <= 'z') {
    letter = letter - 32;  // Convert to uppercase
  }
  
  Serial.print("Received letter: ");
  Serial.println(letter);
  
  // Check if it's a valid letter (A-Z)
  if (letter >= 'A' && letter <= 'Z') {
    uint8_t pattern = braillePatterns[letter - 'A'];
    
    Serial.print("Braille pattern (binary): ");
    for (int i = 5; i >= 0; i--) {
      Serial.print((pattern >> i) & 1);
    }
    Serial.println();
    
    updateBrailleServos(pattern);
  } else {
    Serial.println("Invalid letter received (not A-Z)");
    setAllServosLowered();  // Clear display for invalid input
  }
}

// ===== Update Servo Positions Based on Braille Pattern =====
void updateBrailleServos(uint8_t pattern) {
  Serial.println("Updating servos:");
  
  for (int i = 0; i < 6; i++) {
    bool isRaised = (pattern >> i) & 1;
    int angle = isRaised ? RAISED_ANGLE : LOWERED_ANGLE;
    servos[i].write(angle);
    
    Serial.print("  Dot ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.println(isRaised ? "RAISED" : "lowered");
  }
  
  Serial.println("✓ Servos updated successfully");
}

// ===== Lower All Servos =====
void setAllServosLowered() {
  for (int i = 0; i < 6; i++) {
    servos[i].write(LOWERED_ANGLE);
  }
  Serial.println("All servos lowered");
}