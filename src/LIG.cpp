#include "LIG.hpp"

LIG::LIG(HardwareSerial& serial) : _serial(serial) {}

void LIG::begin() {
    _serial.begin(115200);
    _serial.println("LIGino ready.");
}

void LIG::hello() {
    _serial.println("Hello from LIG_ino!");
}
