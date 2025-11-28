import utime as time
from machine import Pin, I2C
from max6675 import MAX6675
import network
import urequests
import json
import gc
#my led
led = Pin(10, Pin.OUT)
#inputs for the max 6675 object
so = Pin(15, Pin.IN)
sck = Pin(13, Pin.OUT)
cs = Pin(14, Pin.OUT)
#my buzzer
buzzer = Pin(9, Pin.OUT)

#initialize reader for sensor
sensor = MAX6675(sck, cs, so)

#set target temperature
target=50

#start check
led.value(1)
time.sleep(0.25)
led.value(0)
buzzer.value(1)
time.sleep(0.25)
buzzer.value(0)

#connect to wifi
ssid = 'iPhone (9)'
password= '6fxfqhz2kvjre'
wifi=network.WLAN(network.STA_IF)
wifi.active(True)
print(wifi.scan())
wifi.connect(ssid, password)
time.sleep(3)
#post url
urlpost = 'https://melodic-meerkat-f2757e.netlify.app/.netlify/functions/send-data'
urlget = 'https://melodic-meerkat-f2757e.netlify.app/.netlify/functions/get-target'
exurl = "https://httpbin.org/post"
exurl2 = "https://httpbin.org/get"
#start check
while (wifi.isconnected()==False):
    wifi.connect(ssid, password)
    time.sleep(0.5)
    led.value(1)
    time.sleep(0.5)
    led.value(0)
    if (wifi.status()==1):
        time.sleep(5)
    print(wifi.status())
        


while True:
    temperature= sensor.read()
    if wifi.isconnected():
        #try:
            payload= {'feed': 'temperature', 'value': temperature}
            response = urequests.post(url=urlpost, data=json.dumps(payload), headers={'Content-Type': 'application/json'})
            print(response.text)
            response.close()
            
            response = urequests.get(url=urlget)
            print('get response', response.text)
            if response.status_code==200:
                data = response.json()
                new_target=float(data['value'])
                print(new_target)
                if target!=new_target:
                    target=new_target
                    print('updated')
            response.close()
        #except:
            #print("jsonfail")
    gc.collect()
        
    print(sensor.error())
    print(temperature)
    if temperature >= target+100:
        led.value(1)
        buzzer.value(1)
        time.sleep(0.25)
    elif temperature >= target:
        led.value(1)
        buzzer.value(1)
        time.sleep(0.1)
        buzzer.value(0)
        time.sleep(2.5)
        led.value(0)
        time.sleep(2.5)
    else:
        led.value(0)
        buzzer.value(0)
        time.sleep(1)