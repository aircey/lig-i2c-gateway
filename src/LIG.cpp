#include "Lig.hpp"

LigGateway::LigGateway() {}

void LigGateway::begin(HardwareSerial& serial, TwoWire& wire) {
    _serial = serial;
    _wire = wire;
    _serial.println("LIG ready.");
}

void LigGateway::hello() {
    _serial.println("Hello from LIG!");
}

LigGateway Lig = LigGateway();