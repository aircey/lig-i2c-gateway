#include <Lig.hpp> // Include the LIG library header

void setup()
{
    // Setup Serial with desired baud rate
    Serial.begin(115200);

    // Setup I2C (see Wire documentation for options)
    Wire.begin();

    // Setup LIG using Serial and Wire
    // You can also set alternative instances if needed (e.g., Serial2, Wire1)
    Lig.begin(Serial, Wire);
}

void loop()
{
    // Process LIG commands in the loop
    Lig.process();
}
