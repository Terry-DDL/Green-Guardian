// index.js
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const axios    = require('axios');

const atlasUri = 'mongodb+srv://plantUser:666@cluster0.bymrwvg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const WEATHER_API_KEY = '94107f25aa864d49b4f213452251507'; 
const WEATHER_LAT = '43.85'; 
const WEATHER_LON = '-79.39'; 

mongoose
  .connect(atlasUri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET','POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is working');
});

app.get('/api/fake-data', async (req, res) => {
  try {
    const now = Date.now();
    const readings = [];
    const plantIds = ['plant-1', 'plant-2', 'plant-3'];

    plantIds.forEach((plantId, i) => {
      for (let j = 0; j < 5; j++) {
        readings.push({
          plantId,
          timestamp: new Date(now - (5 - j) * 60_000),
          moisture: 50 + Math.random() * 20 - i * 2,
          pH: 6.0 + Math.random() * 0.5 - i * 0.1,
          light: 400 + Math.random() * 50 + i * 10
        });
      }
    });

    await mongoose.connection.collection('readings').insertMany(readings);
    res.json({ success: true, inserted: readings.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/readings', async (req, res) => {
  try {
    const readings = await mongoose.connection
      .collection('readings')
      .find()
      .sort({ timestamp: 1 })
      .limit(500)
      .toArray();
    res.json(readings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    mode: currentWateringMode,
    interval: wateringInterval,
    lastWateredAt
  });
});

let currentWateringMode = 'smart';
let wateringInterval = 3600000;
let lastWateredAt = 0;

app.post('/api/from-arduino', async (req, res) => {
  try {
    const { temperature, humidity, moisture, rain } = req.body;
    if (typeof moisture !== 'number' || typeof temperature !== 'number' || typeof humidity !== 'number' || typeof rain !== 'number') {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const plantId = 'plant-arduino';
    const newReading = {
      plantId,
      timestamp: new Date(),
      moisture,
      pH: 6.5,
      light: 420,
      temperature,
      humidity,
      rain
    };

    await mongoose.connection.collection('readings').insertOne(newReading);

    let shouldWater = false;

    if (currentWateringMode === 'smart') {
  let willRain = false;
  try {
    // 1 – call WeatherAPI for a 1‑day forecast (hourly data is included)
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${WEATHER_LAT},${WEATHER_LON}&days=1&aqi=no&alerts=no`;
    const { data } = await axios.get(url);

    // 2 – scan the next 6 hours
    const now   = Date.now();
    const next6 = now + 6 * 60 * 60 * 1000;

    data.forecast.forecastday[0].hour.forEach(h => {
      const t = new Date(h.time).getTime();
      if (t <= next6 && h.will_it_rain === 1) willRain = true;
    });
  } catch (err) {
    console.error('error:', err.message);
  }

  const moisturePct = 100 - (moisture / 1023) * 100; // 0‑100 %
  const TOO_DRY     = 35;
  shouldWater = !willRain && moisturePct < TOO_DRY && rain === 0;
} else if (currentWateringMode === 'periodic') {
      const now = Date.now();
      if (now - lastWateredAt >= wateringInterval) {
        shouldWater = true;
        lastWateredAt = now;
      }
    }

    if (shouldWater) {
      await mongoose.connection.collection('wateringLogs').insertOne({
        timestamp: new Date(),
        plantId,
        reason: currentWateringMode
      });
    }

    res.json({ water: shouldWater });
  } catch (err) {
    console.error('Failed to receive data:', err);
    res.status(500).json({ error: 'Failed to handle data' });
  }
});

app.get('/api/watering-log', async (req, res) => {
  try {
    const logs = await mongoose.connection.collection('wateringLogs')
      .find()
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    res.json(logs);
  } catch (e) {
    console.error('Failed to fetch watering logs:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/set-mode', (req, res) => {
  const { mode, interval } = req.body;
  if (mode === 'smart' || mode === 'periodic') {
    currentWateringMode = mode;
    if (mode === 'periodic' && interval) {
      wateringInterval = interval;
    }
    res.json({ success: true, mode: currentWateringMode, interval: wateringInterval });
  } else {
    res.status(400).json({ error: 'Invalid mode' });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});


