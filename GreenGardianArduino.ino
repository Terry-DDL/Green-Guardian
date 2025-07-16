#include <Adafruit_LiquidCrystal.h>
#include <WiFi.h>
#include <HTTPClient.h>

Adafruit_LiquidCrystal lcd(0);  

// Sensor & output pins
const int soilIN = A0;
const int tempIN = A1;
const int humidityIN = A2;
const int rainIN = 2;
const int pumpOUT = 3;
const int buzzerOUT = 8;
const int greenLED = 6;
const int redLED = 7;

// Wi-Fi credentials
const char* ssid = "MYID";
const char* password = "MYPASSWORD";


const char* backendURL = "SECRETIP:4000/api/from-arduino";

void setup() {
  lcd.begin(16, 2);
  lcd.print("Smart Irrigation");
  lcd.setCursor(0, 1);
  lcd.print("System Setup");
  delay(2000);
  lcd.clear();

  pinMode(soilIN, INPUT);
  pinMode(tempIN, INPUT);
  pinMode(humidityIN, INPUT);
  pinMode(rainIN, INPUT);
  pinMode(pumpOUT, OUTPUT);
  pinMode(buzzerOUT, OUTPUT);
  pinMode(greenLED, OUTPUT);
  pinMode(redLED, OUTPUT);

  Serial.begin(9600);

  WiFi.begin(ssid, password);
  lcd.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  lcd.clear();
  lcd.print("WiFi connected");
  delay(1000);
  lcd.clear();
}

void loop() {
  int soil = analogRead(soilIN);
  int humidity = analogRead(humidityIN);
  int temp = analogRead(tempIN);

  float voltage = temp * (5.0 / 1023.0);
  float tempInCelsius = (voltage - 0.5) * 100;
  float humidityPercent = map(humidity, 0, 1023, 0, 100);
  int rain = (humidityPercent > 50) ? 1 : 0;

  lcd.setCursor(0, 0);
  lcd.print("T:"); lcd.print(tempInCelsius);
  lcd.print("C H:"); lcd.print(humidityPercent);
  lcd.setCursor(0, 1);
  lcd.print("M:"); lcd.print(soil);
  lcd.print(" R:"); lcd.print(rain);

  Serial.print("Temp: "); Serial.println(tempInCelsius);
  Serial.print("Humidity: "); Serial.println(humidityPercent);
  Serial.print("Soil: "); Serial.println(soil);
  Serial.print("Rain: "); Serial.println(rain);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendURL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"temperature\":" + String(tempInCelsius) + ",";
    payload += "\"humidity\":" + String(humidityPercent) + ",";
    payload += "\"moisture\":" + String(soil) + ",";
    payload += "\"rain\":" + String(rain);
    payload += "}";

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
      if (response.indexOf("true") >= 0) {
        digitalWrite(pumpOUT, HIGH);
        digitalWrite(redLED, HIGH);
        digitalWrite(greenLED, LOW);
        tone(buzzerOUT, 1000, 200); /
        lcd.clear();
        lcd.print("Watering ON");
      } else {
        digitalWrite(pumpOUT, LOW);
        digitalWrite(greenLED, HIGH);
        digitalWrite(redLED, LOW);
        noTone(buzzerOUT);
        lcd.clear();
        lcd.print("No Watering");
      }
    } else {
      Serial.println("POST failed");
    }
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }

  delay(3600000); 
}
