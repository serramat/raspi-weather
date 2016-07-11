from Adafruit_BME280 import *
import time

sensor = BME280(mode=BME280_OSAMPLE_8)

degrees = sensor.read_temperature()
pascals = sensor.read_pressure()
hectopascals = pascals / 100
humidity = sensor.read_humidity()
timestamp = time.ctime()

print 'Timestamp = %s'%timestamp + ', Temp = {0:0.3f} deg C'.format(degrees) + ', Pressure = {0:0.2f} hPa'.format(hectopascals) + ', Humidity = {0:0.2f} %'.format(humidity)

import sqlite3
import os

dir_path = os.path.dirname(os.path.abspath(__file__))
# Running this script by cron messes up the relative path

try:
    db = sqlite3.connect(os.path.join(dir_path, '../raspi-weather.db'))
    c = db.cursor()

    c.execute("""CREATE TABLE IF NOT EXISTS indoor(
        `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
        `timestamp`     DATETIME,
        `temperature`   NUMERIC,
        `humidity`      NUMERIC,
        `pressure`      NUMERIC)""")
    db.commit()

    args = [timestamp, round(degrees, 2), int(humidity), round(hectopascals, 2)]
    c.execute('INSERT INTO indoor (timestamp, temperature, humidity, pressure) VALUES (?, ?, ?, ?)', args)
    db.commit()
    db.close()
except sqlite3.Error as err:
    f = open(os.path.join(dir_path, 'logger.log'), 'a')
    print(str(err))
    f.write(str(err))
    f.write('\n')
    f.close()

