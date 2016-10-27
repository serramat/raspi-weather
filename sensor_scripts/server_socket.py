import socket
import sys
from thread import *
import time
import json
import os

log_file = 'socket_logger.log'
dir_path = os.path.dirname(os.path.abspath(__file__))
f = open(os.path.join(dir_path, log_file), 'a')

HOST = ''
PORT = 3001

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
f.write('Socket created\n')
print 'Socket created'

try:
    s.bind((HOST, PORT))
except socket.error as msg:
    f.write("ERROR: Bind failed. Error Code: " + str(msg[0]) + ' Message ' + msg[1] + "\n")
    print 'Bind failed. Error Code: ' + str(msg[0]) + ' Message ' + msg[1]
    f.close()
    sys.exit()

f.write('Socket bind complete\n')
print 'Socket bind complete'

s.listen(10)
f.write('Socket now listening on port ' + str(PORT) + '\n')
print 'Socket now listening on port ' + str(PORT)
f.close()

def clientthread(conn):
    f = open(os.path.join(dir_path, log_file), 'a')
    total_data=[]
    while True:
        data = conn.recv(4096)
        if not data:
            break
        total_data.append(data)

    conn.close()
    json_string = ''.join(total_data)
    f.write('Received: ' + json_string + '\n')
    print 'Received: ' + json_string
    sensor_data = json.loads(json_string)
    degrees = float(sensor_data["temperature"])
    hectopascals = float(sensor_data["pressure"])
    humidity = int(sensor_data["humidity"])
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())

    import sqlite3
    try:
        db = sqlite3.connect(os.path.join(dir_path, '../raspi-weather.db'))
        c = db.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS indoor_in(
            `id`            INTEGER PRIMARY KEY AUTOINCREMENT,
            `timestamp`     DATETIME,
            `temperature`   NUMERIC,
            `humidity`      NUMERIC,
            `pressure`      NUMERIC)""")
        db.commit()
        f.write('Inserting data: Timestamp = %s'%timestamp + ', Temp = {0:0.3f} deg C'.format(degrees) + ', Pressure = {0:0.2f} hPa'.format(hectopascals) + ', Humidity = {0:0.2f} %'.format(humidity) + '\n')
        print 'Inserting data: Timestamp = %s'%timestamp + ', Temp = {0:0.3f} deg C'.format(degrees) + ', Pressure = {0:0.2f} hPa'.format(hectopascals) + ', Humidity = {0:0.2f} %'.format(humidity)
        args = [timestamp, round(degrees, 2), int(humidity), round(hectopascals , 2)]
        c.execute('INSERT INTO indoor_in (timestamp, temperature, humidity, pressure) VALUES (?, ?, ?, ?)', args)
        db.commit()
        db.close()
        print("Done")
    except sqlite3.Error as err:
        print("ERROR: " + str(err))
        f.write("ERROR: " + str(err))
        f.write('\n')
    f.close()

while 1:
    conn, addr = s.accept()
    f = open(os.path.join(dir_path, log_file), 'a')
    f.write('Connected with ' + addr[0] + ':' + str(addr[1]) + '\n')
    print 'Connected with ' + addr[0] + ':' + str(addr[1])
    f.close()
    start_new_thread(clientthread, (conn,))

s.close()
