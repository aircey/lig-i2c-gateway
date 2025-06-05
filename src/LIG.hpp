#pragma once

#include <Arduino.h>

class LIG {
public:
    LIG(HardwareSerial& serial = Serial);

    void begin();
    void hello();
    
private:
    HardwareSerial& _serial;
};
