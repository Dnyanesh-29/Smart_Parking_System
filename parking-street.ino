#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "WIFI_name";
const char* password = "WIFI_Password";
const char* serverURL = "http://192.168.56.239:5000";

// Sensor setup
struct Sensor {
  int trigPin;
  int echoPin;
  String slotNumber;
  String side;
};

Sensor sensors[6] = {
  {2, 4, "A1", "Side A"},
  {5, 18, "A2", "Side A"},
  {19, 21, "A3", "Side A"},
  {22, 23, "B1", "Side B"},
  {25, 26, "B2", "Side B"},
  {27, 14, "B3", "Side B"}
};

const int DETECTION_THRESHOLD = 10; // cm
const int NUM_SENSORS = 6;
const unsigned long SENSOR_INTERVAL = 3000; // Interval between full scan
unsigned long lastSensorRead = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize sensor pins
  for (int i = 0; i < NUM_SENSORS; i++) {
    pinMode(sensors[i].trigPin, OUTPUT);
    pinMode(sensors[i].echoPin, INPUT);
  }

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected");
    Serial.println("IP: " + WiFi.localIP().toString());
    testServerConnection();
  } else {
    Serial.println("\nWiFi Connection Failed");
  }
}

void loop() {
  if (millis() - lastSensorRead > SENSOR_INTERVAL) {
    readAndSendAll();
    lastSensorRead = millis();
  }
}

void readAndSendAll() {
  for (int i = 0; i < NUM_SENSORS; i++) {
    delay(200); // Prevent cross-talk

    float distance = averageSensorReading(sensors[i].trigPin, sensors[i].echoPin);
    bool occupied;

    if (distance == -1) {
      // Treat invalid reading as occupied
      occupied = true;
      Serial.printf("Slot %s: INVALID reading → treated as OCCUPIED\n", sensors[i].slotNumber.c_str());
    } else {
      occupied = distance < DETECTION_THRESHOLD;
      Serial.printf("Slot %s: %.2f cm → %s\n", sensors[i].slotNumber.c_str(), distance, occupied ? "OCCUPIED" : "AVAILABLE");
    }

    if (WiFi.status() == WL_CONNECTED) {
      updateSlot(sensors[i].slotNumber, occupied);
    } else {
      Serial.println("WiFi not connected. Skipping update.");
    }
  }
}


float averageSensorReading(int trigPin, int echoPin) {
  float total = 0;
  int count = 0;

  for (int i = 0; i < 3; i++) {
    float d = readSensor(trigPin, echoPin);
    if (d > 0) {
      total += d;
      count++;
    }
    delay(50); // Short delay between reads
  }

  if (count == 0) return -1;
  float avg = total / count;

  if (avg < 2 || avg > 400) return -1; // Discard out-of-range average
  return avg;
}

float readSensor(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  if (duration == 0) return -1;

  float distance = (duration * 0.0343) / 2.0;
  if (distance < 3 || distance > 400) return -1; // Updated lower limit
  return distance;
}


void updateSlot(String slotNumber, bool isOccupied) {
  HTTPClient http;
  String url = String(serverURL) + "/slots/" + slotNumber;

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["status"] = isOccupied ? "occupied" : "available";

  String jsonStr;
  serializeJson(doc, jsonStr);

  int code = http.PUT(jsonStr);
  Serial.printf("Updating slot %s → HTTP %d\n", slotNumber.c_str(), code);
  http.end();
}

void testServerConnection() {
  HTTPClient http;
  http.begin(String(serverURL) + "/health");
  int code = http.GET();
  if (code == 200) {
    Serial.println("✅ Server is reachable");
  } else {
    Serial.println("❌ Server is NOT reachable. Code: " + String(code));
  }
  http.end();
}
