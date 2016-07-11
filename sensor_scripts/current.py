#!/usr/bin/python

from Adafruit_BME280 import *

sensor = BME280(mode=BME280_OSAMPLE_8)

try:
    temperature = sensor.read_temperature()
    humidity = sensor.read_humidity()
    pascals = sensor.read_pressure()
    hectopascals = pascals / 100
    print '{0:0.1f}\n{1}\n{2:0.2f}'.format(temperature, int(humidity), hectopascals)
except RuntimeError as e:
    print 'error\n{0}'.format(e)
except:
    print 'error\nFailed to read sensor data'
