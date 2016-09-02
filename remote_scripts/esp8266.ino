/***************************************************************************
  This is a library for the BME280 humidity, temperature & pressure sensor
  which sends measurements to RasPi-Weather

  https://github.com/dventurino/raspi-weather
 ***************************************************************************/

#include <ESP8266WiFi.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

#define ALTITUDE (93)

Adafruit_BME280 bme; // I2C

const char* ssid     = "SSID";
const char* password = "password";

const char* host = "192.168.1.1";
/*
  const char* streamId   = "....................";
  const char* privateKey = "....................";
*/

bool boot_up = true;

const int MAX_ATTEMPTS = 5;
int attempts = 0;

void setup() {
  Serial.begin(115200);

  // Initialize the LED_BUILTIN pin as an output
  pinMode(LED_BUILTIN, OUTPUT);

  delay(10);

  // We start by connecting to a WiFi network
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  // connect to BME280 sensor
  if (!bme.begin(0x76)) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1);
  }
}

void loop() {

  // Turn the LED on
  digitalWrite(LED_BUILTIN, LOW);

  float temperature = bme.readTemperature();
  float pressure = bme.readPressure() / 100.0F;
  // Adjust pressure to sea level
  pressure = pressure * pow((1 - (0.0065 * ALTITUDE) / (temperature + 0.0065 * ALTITUDE + 273.15)), (-5.257));
  float humidity = bme.readHumidity();

  Serial.print("Temperature = ");
  Serial.print(temperature, 2);
  Serial.println(" \260C");

  Serial.print("Pressure = ");

  Serial.print(pressure, 2);
  Serial.println(" hPa");

  Serial.print("Humidity = ");
  Serial.print(humidity, 0);
  Serial.println(" %");

  Serial.println();

  // create json string with values
  String jsonValues = String("{\"temperature\":\"");
  jsonValues += String(temperature, 1);
  jsonValues += "\", \"pressure\":\"";
  jsonValues += String(pressure, 2);
  jsonValues += "\", \"humidity\":\"";
  jsonValues += String(humidity, 0);
  jsonValues += "\"";
  jsonValues += "}";
  Serial.println(jsonValues);

  // send data
  Serial.print("connecting to ");
  Serial.println(host);

  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  const int httpPort = 3080;
  if (!client.connect(host, httpPort)) {
    attempts = attempts + 1;
    Serial.print("Error connecting to server ");
    Serial.print(host);
    Serial.print(":");
    Serial.print(httpPort);
    Serial.print(" (");
    Serial.print(attempts);
    Serial.println(")");
    if (attempts >= MAX_ATTEMPTS) {
      attempts = 0;
      //Reached MAX_ATTEMPTS, retry again after 30 minutes
      delay(30UL * 60UL * 1000UL); //30 minutes
    }
    return;
  }

  // We now create a URI for the request
/*  String url = "/input/";
    url += streamId;
    url += "?private_key=";
    url += privateKey;
    url += "&value=";
    url += value;

  Serial.print("Requesting URL: ");
  Serial.println(url);
*/
  
  client.print(jsonValues);
  /*
  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) {
      Serial.println(">>> Client Timeout !");
      client.stop();
      return;
    }
  }
  */
  // Read all the lines of the reply from server and print them to Serial
  while (client.available()) {
    String line = client.readStringUntil('\r');
    Serial.print(line);
  }

  Serial.println();
  Serial.println("closing connection");

  // Turn the LED off
  digitalWrite(LED_BUILTIN, HIGH);

  if (boot_up == true) {
    // wair for sensor calibration and send first measurement
    delay(60000);
    boot_up = false;
  } else {
    // wait for 30 minutes
    delay(30UL * 60UL * 1000UL); //30 minutes
  }
  
  // TODO deep sleep mode; see
  // https://github.com/esp8266/Arduino/blob/d6e38f0abd2e1bf796a32e8b1a24d37fdc7daaf8/doc/libraries.md
  /*
     ESP.deepSleep(microseconds, mode) will put the chip into deep
     sleep. mode is one of
     WAKE_RF_DEFAULT, WAKE_RFCAL, WAKE_NO_RFCAL, WAKE_RF_DISABLED.
     (GPIO16 needs to be tied to RST to wake from deepSleep.)
  */
  //ESP.deepSleep(1e+7, WAKE_RF_DEFAULT);
}
