#include <LIG.hpp>

LIG i2c_gw;

void setup() {
    i2c_gw.begin();
    i2c_gw.hello();
}

void loop() {
    // Nothing here yet
}
