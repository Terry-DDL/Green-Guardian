Green Guardian – Smart & Connected Irrigation System

Monitor plant health (soil moisture, temp, humidity, light), log data in the cloud, and water automatically using **Smart Mode** (weather‑aware) or **Periodic Mode** (every X hours).  
Designed by a high‑school student(which is me) learning full‑stack + hardware

---

Features

- Real-time dashboard (React + Chart.js) with graphs(Moisture, pH, Light) showing the living environment of the plant.
- Watering Modes:
  - Smart: connect to a weather api, skip watering if rain is forecasted in the next 6 h + soil moisture is OK.
  - Periodic: Water every user‑selected interval.
- Cloud persistence: MongoDB Atlas.
- Weather‑aware: WeatherAPI.com forecast integration.
- Watering history log + last watered time.
- Arduino + ESP8266 + Temp/humidity/pH/light sensors + pump, that can auto-water the garden and keep track of the living environment of my plants

---

How to run
1. `cd plant-monitor-backend && npm install && node index.js`
2. `cd plant-dashboard && npm install && npm start`
3. Flash `Smart_Irrigation_Arduino.ino` onto Arduino(after you assemble it (remember to change Wi‑Fi creds and Ip adress).

