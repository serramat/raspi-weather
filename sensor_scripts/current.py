#!/usr/bin/python

from Adafruit_BME280 import *

sensor = BME280(mode=BME280_OSAMPLE_8)

# Altitude in meters to calculate sea-level pressure
altitude = 93

try:
    temperature = sensor.read_temperature()
    humidity = sensor.read_humidity()
    pascals = sensor.read_pressure()
    hectopascals = pascals / 100
    # Adjust pressure to sea level
    hectopascals = hectopascals*(1-(0.0065 * altitude)/(temperature + 0.0065 * altitude + 273.15))**(-5.257)

    print '{0:0.1f}\n{1}\n{2:0.2f}'.format(temperature, int(humidity), hectopascals)
except RuntimeError as e:
    print 'error\n{0}'.format(e)
except:
    print 'error\nFailed to read sensor data'
