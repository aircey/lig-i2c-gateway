#pragma once

#include <Arduino.h>

class LIGino {
public:
    LIGino(Stream& stream = Serial);

    void begin();
    void hello();
    
private:
    Stream& _stream;
};
