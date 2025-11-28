# Smart Pan

Real-time IoT temperature monitoring system for precise cooking temperature control.

## Overview

Smart Pan monitors pan temperature in real-time using a Raspberry Pi Pico W with MAX6675 thermocouple sensor. The web interface displays live temperature data, preset heating modes, and visual/audio alerts when target temperatures are reached. Data is transmitted via Adafruit IO (MQTT) through Netlify serverless functions.

## Features

- Real-time temperature monitoring via Raspberry Pi Pico W
- Web-based interface with mobile/desktop support
- Preset temperature modes (Low: 150°C, Medium: 180°C, High: 230°C)
- Dual unit support (°F / °C) with automatic conversion
- Color-coded progress bar (Blue → Orange → Green)
- Audio and LED alerts for target/overheating states
- Persistent user preferences (units, mute state)
- Debug console for diagnostics
- Connection status indicator
- Secure API via Netlify Functions (hides credentials)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Hardware | Raspberry Pi Pico W, MAX6675 Thermocouple Sensor |
| Firmware | MicroPython |
| Backend | Netlify Functions, Adafruit IO (MQTT) |
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Hosting | Netlify |


