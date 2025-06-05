#pragma once

#include <Arduino.h>

class LigGateway {
public:
    LigGateway();

    void begin(HardwareSerial& serial = Serial, TwoWire& wire = Wire);
    void hello();
    
private:
    HardwareSerial& _serial;
    TwoWire& _wire;
};

extern LigGateway Lig;