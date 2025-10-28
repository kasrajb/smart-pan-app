# Smart Pan - Temperature Control System

## 🎯 Project Overview

Smart Pan addresses the common cooking problem of pan temperature control by providing:
- Real-time temperature monitoring
- Target temperature preheating
- Visual and auditory notifications when ready
- Safe, precise cooking temperature management

---

## ✨ Features

### Current Implementation (v1.1 - Enhanced)
✅ **Temperature Input Screen**
- **Unit Toggle**: Switch between Fahrenheit (°F) and Celsius (°C) - defaults to Fahrenheit
- **Dual Temperature Ranges**: 
  - Fahrenheit: 200°F - 500°F (cooking range)
  - Celsius: 100°C - 300°C (cooking range)
- **Smart Presets by Unit**:
  - Fahrenheit: Low (300°F), Medium (360°F), High (450°F)
  - Celsius: Low (150°C), Medium (180°C), High (230°C)
- Large, easy-to-tap numeric input with validation
- Temperature persistence using localStorage
- Active state feedback on preset button selection

✅ **Temperature Monitoring Screen**
- Large, readable current temperature display (84px font)
- Target temperature display with unit
- Real-time progress bar with percentage display
- Visual status indicators (heating/ready states)
- **Sound notification** when target is reached (Web Audio API)
- **Overheating warning** if temperature exceeds target by 20°F/10°C
- Ability to change target mid-heating
- Cancel/reset functionality
- Unit toggle available during monitoring

✅ **User Experience**
- Mobile-first responsive design
- High contrast for kitchen environments
- Large touch targets (56px+ buttons)
- ARIA labels for screen readers
- Keyboard navigation support (Enter to submit, Escape to cancel)
- Instant unit conversion across all displays
- Unit preference saved to localStorage

✅ **Safety Features**
- Overheating detection and warning system
- Visual red alert when temperature exceeds safe threshold
- Clear error messages for out-of-range inputs

✅ **Simulated Heating**
- Realistic temperature increase (12.6°F or 7°C per second)
- Smooth animations and transitions
- Audio and visual alerts when target reached
- Dynamic conversion when switching units during heating

---

## 🎨 Design Principles

Based on user research and usability testing:

1. **Learnability** - Users understand the interface within 2 minutes
2. **Efficiency** - Setting temperature takes less than 30 seconds
3. **Clarity** - Clear distinction between current and target temperatures
4. **Visual Hierarchy** - Temperature displays are the focal point
5. **Simplicity** - Only essential features, no clutter

### Color Palette
- **Heating/Active**: Orange (#ff6b35) - indicates heating in progress
- **Ready/Success**: Green (#4caf50) - target temperature reached
- **Idle/Neutral**: Gray (#607d8b) - neutral states
- **Warning**: Red (#f44336) - errors and warnings

---

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No build tools or dependencies required (vanilla JavaScript)

### Installation
1. Download all project files to a folder
2. Open `index.html` in your web browser
3. That's it! No server or installation needed.

### For Local Development
If you want to test with a local server:

```powershell
# Using Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

---

## 📱 Usage Guide

### Setting Your Preferred Unit
1. **Toggle between °F and °C**: Click the unit toggle in the top-right corner
2. **Default is Fahrenheit** (°F) - common for North American cooking
3. **All displays update instantly** when you switch units
4. **Your preference is saved** for next time

### Setting a Target Temperature

**In Fahrenheit (°F):**
1. Enter temperature between 200°F and 500°F, OR
2. Use quick presets: Low (300°F), Medium (360°F), High (450°F)
3. Click "Start Heating"

**In Celsius (°C):**
1. Enter temperature between 100°C and 300°C, OR
2. Use quick presets: Low (150°C), Medium (180°C), High (230°C)
3. Click "Start Heating"

### Monitoring Progress
- **Current temperature** displayed in large numbers at center
- **Progress bar** shows percentage to target (e.g., "75%")
- **Status indicator** shows "Heating..." or "✓ Target Reached!"
- **Overheating warning** appears if temperature exceeds safe threshold
- **Sound notification** plays when target is reached

### Adjusting During Heating
- **Switch units**: Toggle °F/°C even while heating
- **Change Target**: Modify target temperature mid-heating
- **Cancel**: Stop heating and return to start screen
- **Cancel**: Stop heating and return to start screen

---

## 🧪 Testing Scenarios

The application has been designed to handle:

✅ **Unit Conversion**
- Switch between Fahrenheit and Celsius during input
- Switch units while actively heating
- All temperatures convert accurately
- Presets update to match selected unit

✅ **Temperature Validation**
- Valid input in Fahrenheit (e.g., 360°F) and Celsius (e.g., 180°C)
- Invalid inputs (empty, non-numeric, out of range)
- Error messages reference correct unit

✅ **Heating & Monitoring**
- Target reached detection with visual and audio alerts
- Progress bar shows accurate percentage
- Overheating warning triggers at 20°F/10°C over target
- Cancel and restart operations

✅ **Preset Buttons**
- Active state feedback when clicked
- Immediate value population
- Updates when switching units

✅ **Responsive Design**
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop browsers (1024px+)  

---

## 📂 Project Structure

```
424_WebApp/
├── index.html          # Main HTML structure (2 screens)
├── style.css           # Complete styling (mobile-first, responsive)
├── app.js              # Application logic (vanilla JavaScript)
└── README.md           # This file
```

---

## 🔌 Hardware Integration (Future)

The code is structured for easy hardware integration:

### Hardware Components (Next Phase)
- Raspberry Pi Pico W (WiFi microcontroller)
- MAX6675 thermocouple module
- K-type temperature probe
- LED indicator
- Buzzer/speaker

### Integration Points

**In `app.js`**, look for these marked sections:

```javascript
/**
 * HARDWARE INTEGRATION POINT:
 * Replace simulateTemperatureIncrease() with:
 * 
 * function receiveRealTemperature(sensorData) {
 *     appState.currentTemp = sensorData.temperature;
 *     updateTemperatureDisplay();
 *     checkTargetReached();
 * }
 */
```

The web app will run on the Pico W and receive real sensor data via:
- HTTP requests to MicroPython endpoints
- WebSocket connections for real-time updates
- MQTT messaging (depending on implementation)

---

## 🎓 Educational Context

This project is part of a Human-Computer Interaction (HCI) course at McGill University. Key learning objectives:

- **User Research**: Understanding user needs through interviews and observations
- **Prototyping**: Creating and testing paper prototypes
- **Usability Testing**: Evaluating designs with real users
- **Iterative Design**: Incorporating feedback into digital prototype
- **Accessibility**: Building inclusive interfaces (ARIA, keyboard nav)

---

## 🌟 Usability Goals (From User Research)

Based on testing with real users:

1. **Learnability** - Users preferred simple, clear interfaces
2. **Efficiency** - Quick temperature selection was highly valued
3. **Effectiveness** - Live temperature updates were essential
4. **Safety** - Clear visual indicators prevent overheating
5. **Satisfaction** - Users appreciated preset buttons and large displays

---

## 📊 User Feedback Incorporated

From usability testing sessions:

✅ "I want to see the temperature change in real-time" - Implemented live updates  
✅ "The simple design is great" - Minimalist interface maintained  
✅ "I noticed the LED right away" - Strong visual indicators added  
✅ "Can I change the temperature while it's heating?" - Feature added  
✅ "Wall-mounted would be better" - Mobile-first design for phone/tablet use  

---

## 🔒 Accessibility Features

- **ARIA labels** on all interactive elements
- **Keyboard navigation** (Enter to submit, Escape to cancel)
- **High contrast** colors for readability
- **Large touch targets** (minimum 44x44px)
- **Screen reader support** with live regions
- **Reduced motion** support for users with vestibular disorders

---

## 🚧 Future Enhancements

### ✅ Recently Implemented (v1.1)
- [x] **Temperature unit toggle** (Celsius/Fahrenheit) with localStorage persistence
- [x] **Sound effects for notifications** using Web Audio API
- [x] **Overheating warning system** for safety
- [x] **Active state for preset buttons** with visual feedback
- [x] **Progress percentage display** on monitoring screen

### Phase 2 - Hardware Integration
- [ ] Connect to Raspberry Pi Pico W
- [ ] Real temperature data from MAX6675 sensor
- [ ] LED and buzzer control
- [ ] WebSocket real-time updates

### Phase 3 - Advanced Features
- [ ] Temperature history graph with time axis
- [ ] Multiple pan monitoring (up to 4 pans)
- [ ] Recipe suggestions based on temperature
- [ ] User accounts and saved preferences
- [ ] Dark mode for kitchen environments
- [ ] Custom notification sounds
- [ ] Voice control integration
- [ ] Pan material presets (cast iron, stainless, non-stick)


