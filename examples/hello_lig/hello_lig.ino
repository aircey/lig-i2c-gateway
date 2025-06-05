#include <Lig.hpp>

void setup() {

    // Setup Serial
    Serial.begin(115200);

    // Setup I2C with Wire
    Wire.begin(21, 22);
    
    // Setup LIG using Serial and Wire
    Lig.begin(Serial, Wire);

    // Call hello for testing
    Lig.hello();
}

void loop() {
    // Nothing here yet
}
