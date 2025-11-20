# Raspberry Pi Integration Guide

## Overview
Your Smart Pan web application now uses a **two-feed system** for communication with the Raspberry Pi Pico W:

1. **`target-temperature` feed** - Web app sends desired temperature to Raspberry Pi
2. **`temperature` feed** - Raspberry Pi sends real-time sensor readings to web app

## API Endpoints for Your Teammate

### 1. Read Target Temperature (Raspberry Pi reads this)
**Endpoint:** `GET https://io.adafruit.com/api/v2/kasrajb/feeds/target-temperature/data/last`

**Headers:**
```
X-AIO-Key: aio_qqGg500P3TBnmMBTvE49aPiBjHdY
```

**Response:**
```json
{
    "id": "0EXAMPLEID",
    "value": "180.0",
    "feed_id": 123456,
    "created_at": "2025-11-20T15:30:00Z"
}
```

**Usage:** Parse `data.value` as float to get target temperature in Celsius.

---

### 2. Send Real-Time Temperature (Raspberry Pi writes this)
**Endpoint:** `POST https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data`

**Headers:**
```
X-AIO-Key: aio_qqGg500P3TBnmMBTvE49aPiBjHdY
Content-Type: application/json
```

**Body:**
```json
{
    "value": 175.5
}
```

**Usage:** Send current sensor temperature in Celsius every 500ms.

---

## Raspberry Pi Pico W Code Example

```python
import urequests
import ujson
import time

# Adafruit IO Configuration
ADAFRUIT_IO_USERNAME = "kasrajb"
ADAFRUIT_IO_KEY = "aio_qqGg500P3TBnmMBTvE49aPiBjHdY"
TARGET_FEED = "target-temperature"
SENSOR_FEED = "temperature"
BASE_URL = "https://io.adafruit.com/api/v2"

def read_target_temperature():
    """Read target temperature from web app"""
    try:
        url = f"{BASE_URL}/{ADAFRUIT_IO_USERNAME}/feeds/{TARGET_FEED}/data/last?X-AIO-Key={ADAFRUIT_IO_KEY}"
        response = urequests.get(url)
        data = response.json()
        target_temp = float(data['value'])
        response.close()
        return target_temp
    except Exception as e:
        print(f"Error reading target temperature: {e}")
        return None

def send_sensor_temperature(temp_celsius):
    """Send current temperature to web app"""
    try:
        url = f"{BASE_URL}/{ADAFRUIT_IO_USERNAME}/feeds/{SENSOR_FEED}/data"
        headers = {
            "X-AIO-Key": ADAFRUIT_IO_KEY,
            "Content-Type": "application/json"
        }
        data = ujson.dumps({"value": temp_celsius})
        response = urequests.post(url, headers=headers, data=data)
        response.close()
        return True
    except Exception as e:
        print(f"Error sending temperature: {e}")
        return False

# Main control loop
def main():
    target_temp = None
    heating_active = False

    while True:
        try:
            # Check for new target temperature from web app
            new_target = read_target_temperature()
            if new_target is not None and new_target != target_temp:
                target_temp = new_target
                heating_active = True
                print(f"🎯 New target temperature: {target_temp}°C")

            # Read current temperature from sensor
            current_temp = read_sensor_temperature()  # Your MAX6675 function

            # Send current temperature to web app
            send_sensor_temperature(current_temp)

            # Control heating element based on target
            if heating_active and target_temp is not None:
                if current_temp < target_temp:
                    turn_on_heating()  # Your heating control function
                else:
                    turn_off_heating()  # Your heating control function
                    heating_active = False
                    print(f"✅ Target temperature {target_temp}°C reached!")

            time.sleep(0.5)  # Send data every 500ms

        except Exception as e:
            print(f"Main loop error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
```

---

## Workflow Summary

1. **User sets temperature in web app** → Web app sends target to `target-temperature` feed
2. **Raspberry Pi reads target** → Pico reads from `target-temperature` feed
3. **Raspberry Pi starts heating** → Pico controls heating element toward target
4. **Raspberry Pi sends sensor data** → Pico sends current temp to `temperature` feed every 500ms
5. **Web app displays real-time data** → Web app reads from `temperature` feed and shows live updates

---

## Testing the Integration

### Web App Testing (Browser Console)
```javascript
// Send target temperature to Raspberry Pi
await SmartPanApp.sendTargetTempToAdafruit(180);

// Monitor real-time temperature from Raspberry Pi
const monitor = setInterval(async () => {
    const temp = await SmartPanApp.getTempFromAdafruit();
    console.log(`Raspberry Pi temp: ${temp}°C`);
}, 1000);
// Stop with: clearInterval(monitor);
```

### Raspberry Pi Testing
```python
# Test reading target temperature
target = read_target_temperature()
print(f"Target from web app: {target}°C")

# Test sending sensor temperature
send_sensor_temperature(25.5)  # Room temperature
```

---

## Important Notes

- **Temperature units**: Always send/receive in Celsius
- **Update frequency**: Send temperature data every 500ms for smooth UI
- **Error handling**: Both sides should handle network failures gracefully
- **Feed creation**: Make sure both feeds exist in your Adafruit IO account:
  - `target-temperature` (for receiving commands)
  - `temperature` (for sending sensor data)

---

## Feed URLs Summary

**For Raspberry Pi to READ target temperature:**
```
GET https://io.adafruit.com/api/v2/kasrajb/feeds/target-temperature/data/last?X-AIO-Key=aio_qqGg500P3TBnmMBTvE49aPiBjHdY
```

**For Raspberry Pi to SEND current temperature:**
```
POST https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data
```

---

## Next Steps

1. Create both feeds in Adafruit IO dashboard
2. Update your Raspberry Pi code with the endpoints above
3. Test the communication loop
4. Deploy the updated web app
5. Verify real-time temperature monitoring works!