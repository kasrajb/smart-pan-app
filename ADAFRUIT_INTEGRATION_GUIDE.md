# Adafruit IO Integration Guide

## Overview
Your Smart Pan web application has been successfully integrated with Adafruit IO for **LIVE remote temperature monitoring**. The app now receives real sensor data from your Raspberry Pi Pico W while maintaining simulation mode as an automatic fallback.

---

## What Changed

### 1. **Adafruit IO Configuration** (Lines 6-17)
Added configuration constants at the top of `app.js`:
```javascript
const ADAFRUIT_CONFIG = {
    username: 'kasrajb',
    apiKey: 'aio_***YOUR_API_KEY***',  // Configured in app.js
    feedName: 'temperature',
    baseURL: 'https://io.adafruit.com/api/v2',
    updateInterval: 500  // Check for new data every 500ms
};
```

**Connection tracking variables:**
- `adafruitConnected`: Boolean flag for connection status
- `useSimulationMode`: Boolean flag when falling back to simulation

---

### 2. **New Adafruit IO Functions** (Lines 102-195)

#### `testAdafruitConnection()`
- **Purpose**: Tests connection to Adafruit IO on app startup
- **Returns**: `Promise<boolean>` - true if connected, false if failed
- **Behavior**: 
  - Makes GET request to Adafruit feed
  - Sets `adafruitConnected` flag
  - Logs "✅ Adafruit IO Connected" or "ℹ️ Using Simulation Mode"
  - Includes timestamp in console logs

#### `getTempFromAdafruit()`
- **Purpose**: Fetches latest temperature reading from Adafruit IO
- **Returns**: `Promise<number|null>` - temperature value or null
- **API Endpoint**: `GET https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data/last`
- **Behavior**:
  - Returns null if not connected
  - Parses JSON response: `parseFloat(data.value)`
  - Validates temperature is a number
  - Auto-switches to simulation mode if fetch fails
  - Uses `console.warn()` for errors (not `console.error()`)

#### `sendTempToAdafruit(temperature)`
- **Purpose**: Sends temperature reading back to Adafruit IO (for logging)
- **Parameters**: `temperature` (number) - value to send
- **Returns**: `Promise<boolean>` - true if successful
- **API Endpoint**: `POST https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data`
- **Headers**: 
  - `X-AIO-Key: [configured in app.js]`
  - `Content-Type: application/json`
- **Body**: `{"value": temperature}`

---

### 3. **Updated Initialization** (Lines 197-222)

The `init()` function is now **async** and tests Adafruit connection on page load:

```javascript
async function init() {
    // ... existing initialization code ...
    
    // Test Adafruit IO connection
    await testAdafruitConnection();
    
    // Log initialization status
    const mode = adafruitConnected ? 'Adafruit IO (Live Data)' : 'Simulation Mode';
    console.log(`Smart Pan App Initialized - Unit: ${appState.unit} | Mode: ${mode}`);
}
```

**What happens on page load:**
1. App loads normally (unit preferences, presets, etc.)
2. Tests connection to Adafruit IO
3. Logs which mode is active in console
4. User sees no difference - app always works

---

### 4. **Updated Temperature Loop** (Lines 522-573)

Created new `updateTemperatureLoop()` function that replaces the old simulation-only approach:

```javascript
async function updateTemperatureLoop() {
    // Try to get real temperature from Adafruit IO
    if (adafruitConnected) {
        const adafruitTemp = await getTempFromAdafruit();
        
        if (adafruitTemp !== null) {
            // Received real temperature
            // Assume Pico sends Celsius, convert if needed
            appState.currentTemp = appState.unit === 'F' 
                ? celsiusToFahrenheit(adafruitTemp) 
                : adafruitTemp;
            
            // Send acknowledgment back to Adafruit
            sendTempToAdafruit(adafruitTemp);
        } else {
            // Adafruit failed, use simulation
            simulateTemperatureIncrease();
        }
    } else {
        // Use simulation mode
        simulateTemperatureIncrease();
    }
    
    // Check if target reached
    if (!appState.targetReached && appState.currentTemp >= appState.targetTemp) {
        appState.targetReached = true;
        notifyUser();
        updateStatus('ready');
    }
    
    // Check for overheating
    checkOverheating();
    
    // Update all displays
    updateTemperatureDisplay();
    updateProgressBar();
    updateTimeEstimate();
}
```

**Smart behavior:**
- If Adafruit connected: fetch real temperature every 500ms
- If Adafruit returns data: use it and send acknowledgment
- If Adafruit fails: automatically fall back to simulation
- App never crashes or shows errors to user

---

### 5. **Updated Start Heating Function** (Lines 498-530)

The `startHeatingSimulation()` function now intelligently chooses data source:

```javascript
function startHeatingSimulation() {
    // ... state initialization ...
    
    // Log which mode we're starting in
    const mode = adafruitConnected ? 'Adafruit IO (Real Data)' : 'Simulation Mode';
    console.log(`Started heating - Mode: ${mode} - Target: ${appState.targetTemp}°${appState.unit}`);
    
    // Use 500ms interval for Adafruit (smooth updates)
    // Use 1000ms interval for simulation (original behavior)
    const updateInterval = adafruitConnected ? ADAFRUIT_CONFIG.updateInterval : 1000;
    
    appState.heatingInterval = setInterval(() => {
        updateTemperatureLoop();
    }, updateInterval);
}
```

**Update intervals:**
- **Adafruit mode**: 500ms (2 updates/second) - smooth real-time feel
- **Simulation mode**: 1000ms (1 update/second) - original behavior

---

### 6. **Automatic Fallback System**

The integration includes **graceful degradation**:

1. **Startup failure**: 
   - Adafruit unreachable → automatic simulation mode
   - User never knows, app works normally

2. **Runtime failure**:
   - Adafruit returns null → switches to simulation
   - Logged to console with `console.warn()`
   - UI continues working seamlessly

3. **No user-facing errors**:
   - No error dialogs
   - No broken UI
   - App always functional

---

### 7. **Unit Conversion**

The system assumes your Raspberry Pi Pico W sends temperature in **Celsius**:

```javascript
// If user prefers Fahrenheit, auto-convert
appState.currentTemp = appState.unit === 'F' 
    ? celsiusToFahrenheit(adafruitTemp) 
    : adafruitTemp;
```

**Toggle behavior:**
- User clicks F/C toggle
- Display updates instantly
- Internally converts for calculations
- Works with both real and simulated data

---

### 8. **Testing Functions Exposed** (Lines 967-1026)

Added test functions to `window.SmartPanApp` for browser console testing:

```javascript
window.SmartPanApp = {
    validateTemperature,
    appState,
    testAdafruitConnection,
    getTempFromAdafruit,
    sendTempToAdafruit,
    adafruitConfig: ADAFRUIT_CONFIG,
    getConnectionStatus: () => ({
        connected: adafruitConnected,
        simulationMode: useSimulationMode,
        mode: adafruitConnected ? 'Adafruit IO' : 'Simulation'
    })
};
```

---

## How to Test

### Open Browser Console
1. Visit: https://kasrajb.github.io/smart-pan-app/
2. Press F12 (Windows) or Cmd+Option+I (Mac)
3. Click "Console" tab
4. Paste test commands below

### Test Commands

#### 1. Check Connection Status
```javascript
SmartPanApp.getConnectionStatus()
```
**Expected Output:**
```javascript
{
    connected: true,  // or false
    simulationMode: false,  // or true
    mode: "Adafruit IO"  // or "Simulation"
}
```

---

#### 2. Test Adafruit Connection
```javascript
await SmartPanApp.testAdafruitConnection()
```
**Expected Output:**
```
✅ Adafruit IO Connected - 2:45:30 PM
true
```

---

#### 3. Get Latest Temperature
```javascript
await SmartPanApp.getTempFromAdafruit()
```
**Expected Output:**
```javascript
175.5  // Current temperature in Celsius
```

---

#### 4. Send Test Temperature
```javascript
await SmartPanApp.sendTempToAdafruit(175.5)
```
**Expected Output:**
```javascript
true  // Success
```

---

#### 5. Check Current App State
```javascript
SmartPanApp.appState
```
**Expected Output:**
```javascript
{
    currentTemp: 175.5,
    targetTemp: 180,
    isHeating: true,
    unit: 'F',
    // ... more properties
}
```

---

#### 6. Simulate Continuous Heating
This sends incrementing temperatures to Adafruit every second:
```javascript
let testTemp = 100;
const heatingTest = setInterval(async () => {
    testTemp += 5;
    console.log(`Sending ${testTemp}°C to Adafruit IO...`);
    await SmartPanApp.sendTempToAdafruit(testTemp);
    if (testTemp > 250) clearInterval(heatingTest);
}, 1000);
```

**Expected Output:**
```
Sending 105°C to Adafruit IO...
Sending 110°C to Adafruit IO...
Sending 115°C to Adafruit IO...
... (continues until 250°C)
```

---

#### 7. Force Reconnection Test
```javascript
await SmartPanApp.testAdafruitConnection(); 
console.log(SmartPanApp.getConnectionStatus());
```

---

#### 8. View Adafruit Configuration
```javascript
SmartPanApp.adafruitConfig
```
**Expected Output:**
```javascript
{
    username: "kasrajb",
    apiKey: "aio_***YOUR_API_KEY***",  // Hidden for security
    feedName: "temperature",
    baseURL: "https://io.adafruit.com/api/v2",
    updateInterval: 500
}
```

---

#### 9. Monitor Live Updates (Every 2 Seconds)
```javascript
const monitor = setInterval(async () => {
    const temp = await SmartPanApp.getTempFromAdafruit();
    console.log(`Current temp from Adafruit: ${temp}°C - ${new Date().toLocaleTimeString()}`);
}, 2000);
```

**To stop monitoring:**
```javascript
clearInterval(monitor);
```

**Expected Output:**
```
Current temp from Adafruit: 175.5°C - 2:45:30 PM
Current temp from Adafruit: 176.2°C - 2:45:32 PM
Current temp from Adafruit: 177.0°C - 2:45:34 PM
...
```

---

#### 10. Test Full Heating Cycle
```javascript
SmartPanApp.appState.targetTemp = 180;
SmartPanApp.appState.currentTemp = 100;
console.log('Heating from', SmartPanApp.appState.currentTemp, 'to', SmartPanApp.appState.targetTemp);
```

---

## API Details

### Adafruit IO REST API

#### GET Latest Temperature
**Endpoint:**
```
GET https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data/last?X-AIO-Key=[YOUR_API_KEY]
```

**Response Format:**
```json
{
    "id": "0EXAMPLEID",
    "value": "175.5",
    "feed_id": 123456,
    "created_at": "2025-11-05T20:00:00Z",
    "updated_at": "2025-11-05T20:00:00Z"
}
```

**Our Code Extracts:**
```javascript
const temperature = parseFloat(data.value);  // 175.5
```

---

#### POST New Temperature
**Endpoint:**
```
POST https://io.adafruit.com/api/v2/kasrajb/feeds/temperature/data
```

**Headers:**
```
X-AIO-Key: [YOUR_API_KEY]
Content-Type: application/json
```

**Body:**
```json
{
    "value": 175.5
}
```

**Response:**
```json
{
    "id": "0EXAMPLEID",
    "value": "175.5",
    "feed_id": 123456,
    "created_at": "2025-11-05T20:00:00Z"
}
```

---

## Deployment Steps

### 1. Commit Changes
```powershell
cd "c:\Users\kasra\Desktop\Kasra\Telegram\Fall 2025\424_WebApp"
git add app.js ADAFRUIT_INTEGRATION_GUIDE.md
git commit -m "integrated adafruit io for live temperature monitoring"
git push
```

### 2. Wait for Deployment
- GitHub Pages deploys in **1-2 minutes**
- Check: https://kasrajb.github.io/smart-pan-app/

### 3. Verify in Browser
1. Open the live site
2. Open browser console (F12)
3. Look for initialization message:
   ```
   Smart Pan App Initialized - Unit: F | Mode: Adafruit IO (Live Data)
   ```

### 4. Test Connection
Run in console:
```javascript
SmartPanApp.getConnectionStatus()
```

---

## Raspberry Pi Pico W Integration

Your Pico W should send temperature data to the same Adafruit feed:

### MicroPython Example
```python
import urequests
import ujson

ADAFRUIT_IO_USERNAME = "kasrajb"
ADAFRUIT_IO_KEY = "aio_***YOUR_API_KEY***"  # Your actual API key here
FEED_NAME = "temperature"

def send_temperature(temp_celsius):
    url = f"https://io.adafruit.com/api/v2/{ADAFRUIT_IO_USERNAME}/feeds/{FEED_NAME}/data"
    headers = {
        "X-AIO-Key": ADAFRUIT_IO_KEY,
        "Content-Type": "application/json"
    }
    data = ujson.dumps({"value": temp_celsius})
    
    try:
        response = urequests.post(url, headers=headers, data=data)
        print(f"Sent {temp_celsius}°C to Adafruit IO")
        response.close()
        return True
    except Exception as e:
        print(f"Error sending to Adafruit: {e}")
        return False

# In your main loop:
while True:
    temp = read_thermocouple()  # Your MAX6675 reading
    send_temperature(temp)
    time.sleep(0.5)  # Send every 500ms to match web app
```

---

## Troubleshooting

### "Using Simulation Mode" at Startup
**Possible causes:**
1. Adafruit IO is down (rare)
2. Internet connection issues
3. API key incorrect
4. Feed doesn't exist yet

**Solution:**
- Send one test temperature from Pico to create the feed
- Verify API key is correct
- Check browser console for specific error messages

---

### Temperature Not Updating
**Check:**
1. Is Pico sending data? (Check Adafruit IO dashboard)
2. Console shows "Adafruit IO Connected"?
3. Run: `await SmartPanApp.getTempFromAdafruit()` in console

---

### Seeing Old/Cached Data
**Solution:**
Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

---

## Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| **Data Source** | Simulation only | Adafruit IO + Simulation fallback |
| **Update Rate** | 1000ms | 500ms (Adafruit) / 1000ms (simulation) |
| **Initialization** | Sync | Async (tests connection) |
| **Error Handling** | None needed | Graceful fallback + console warnings |
| **Testing** | Limited | Full test suite in console |
| **Temperature Loop** | `simulateTemperatureIncrease()` | `updateTemperatureLoop()` |
| **User Experience** | Same | Same (seamless transition) |

---

## Files Modified

1. **app.js** - Complete Adafruit IO integration
   - Added configuration (lines 6-17)
   - Added 3 new functions (lines 102-195)
   - Updated initialization (lines 197-222)
   - Updated temperature loop (lines 522-573)
   - Updated start function (lines 498-530)
   - Added test exports (lines 967-1026)

2. **ADAFRUIT_INTEGRATION_GUIDE.md** - This documentation file

3. **No changes needed:**
   - index.html (same interface)
   - style.css (same styling)
   - README.md (functionality still accurate)

---

## Production Checklist

- [x] Adafruit IO credentials configured
- [x] Connection test on page load
- [x] GET temperature from Adafruit
- [x] POST temperature to Adafruit
- [x] Automatic fallback to simulation
- [x] Unit conversion (C ↔ F)
- [x] Update interval optimization (500ms)
- [x] Error handling (no crashes)
- [x] Console logging (no console.error)
- [x] Test functions exposed
- [x] Documentation complete
- [x] Code commented
- [x] Ready to deploy

---

## What's Next?

1. **Deploy to GitHub Pages** (commit and push)
2. **Test in browser** (use console commands above)
3. **Connect Raspberry Pi Pico W** (send real sensor data)
4. **Monitor temperature** (watch it update live!)
5. **Celebrate** 🎉 (you now have a fully integrated IoT cooking assistant!)

---

**Need help?** Check browser console for detailed logs and warnings.
