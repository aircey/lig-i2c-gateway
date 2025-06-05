#pragma once

#include <Arduino.h>
#include <Wire.h>

#ifndef LIG_BUFFER_SIZE
#define LIG_BUFFER_SIZE 200
#endif

class LigGateway
{
public:
    LigGateway();

    void begin(HardwareSerial &serial = Serial, TwoWire &wire = Wire);
    void process();

protected:
    HardwareSerial *serial = &Serial;
    TwoWire *wire = &Wire;
    char lineBuffer[LIG_BUFFER_SIZE];
    uint8_t ipos = 0;
    bool lineComplete = false;

    void lineRead();
    void lineProcess();
    int lineParseHexAtPosition(int pos);
    void lineProcessEnd();
    void lineBufferReset();

    void printError();
    void printAddress(int addr);
    void printWriteMode();
    void printReadMode();
    void printEnd();
    void printHexVal(int val);
    void printCommand();
};

extern LigGateway Lig;
