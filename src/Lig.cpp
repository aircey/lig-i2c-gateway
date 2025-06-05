#include "Lig.hpp"

static char hexConvBuf[3];
static int parseHex(char *str);
static char *toHex(int i);

LigGateway::LigGateway() {}

void LigGateway::begin(HardwareSerial &serial, TwoWire &wire)
{
    this->serial = &serial;
    this->wire = &wire;
    this->ipos = 0;
    this->lineComplete = false;
    this->lineBuffer[0] = 0;
}

void LigGateway::process()
{
    this->lineRead();

    if (this->lineComplete)
    {
        this->lineProcess();
    }
}

void LigGateway::lineRead()
{
    while (!this->lineComplete && this->serial->available())
    {
        char inChar = (char)this->serial->read();

        if (inChar == '\r')
        {
            continue;
        }

        if (this->ipos == LIG_BUFFER_SIZE - 1)
        {
            // Discard the rest of the line when buffer is full
            if (inChar == '\n' || inChar == 0)
            {
                this->ipos = 0;
            }
        }
        else
        {
            if (inChar == '\n' || inChar == 0)
            {
                this->lineComplete = true;
            }
            else
            {
                this->lineBuffer[this->ipos] = inChar;
                this->ipos++;
                this->lineBuffer[ipos] = 0; // Null-terminate the string
            }
        }
    }
}

void LigGateway::lineProcess()
{
    int addr = -1;
    int val = -1;
    int xpos = 0;
    int len = -1;
    bool ended = false;

    this->printCommand();

    addr = this->lineParseHexAtPosition(xpos);
    if (addr == -1)
    {
        this->printError();
        this->lineProcessEnd();
        return;
    }

    this->printAddress(addr);

    xpos = 2;
    switch (this->lineBuffer[xpos])
    {
    case '.': // write mode
        this->printWriteMode();
        xpos++;
        this->wire->beginTransmission(addr);

        while (1)
        {
            if (this->lineBuffer[xpos] == 0) // end of command
            {
                this->wire->endTransmission(true);
                this->printEnd();
                break;
            }
            else if (this->lineBuffer[xpos] == '?') // read after write
            {
                this->wire->endTransmission(false);
                this->printReadMode();
                xpos++;
                len = this->lineParseHexAtPosition(xpos);
                if (len == -1)
                {
                    this->wire->endTransmission(true);
                    this->printError();
                }
                else
                {
                    this->wire->requestFrom(addr, len);
                    while (this->wire->available())
                    {
                        val = this->wire->read();
                        this->printHexVal(val);
                    }
                    this->printEnd();
                }
                break;
            }
            else
            {
                val = this->lineParseHexAtPosition(xpos);
                xpos += 2;

                if (val == -1)
                {
                    // We should cancel the transmission if we get an error,
                    // but flush() is not well implemented on some Arduino ports
                    // so we just end the transmission whitout cancelling it...
                    // this->wire->flush();

                    this->wire->endTransmission(true);
                    this->printError();
                    break;
                }

                this->wire->write(val);
                this->printHexVal(val);
            }
        }
        break;

    case '?': // read mode
        this->printReadMode();
        xpos++;
        len = this->lineParseHexAtPosition(xpos);
        if (len == -1)
        {
            this->printError();
        }
        else
        {
            this->wire->requestFrom(addr, len);
            while (this->wire->available())
            {
                val = this->wire->read();
                this->printHexVal(val);
            }
            this->printEnd();
        }
        break;

    default:
        this->printError();
    }

    this->lineProcessEnd();
}

int LigGateway::lineParseHexAtPosition(int pos)
{
    return parseHex(&this->lineBuffer[pos]);
}

void LigGateway::lineProcessEnd()
{
    this->serial->println("");
    this->lineComplete = false;
    this->ipos = 0;
    this->lineBuffer[0] = 0;
}

void LigGateway::printError()
{
    this->serial->print("$ ");
}

void LigGateway::printAddress(int addr)
{
    this->serial->print("| ");
    this->serial->print(toHex(addr));
    this->serial->print(" ");
}

void LigGateway::printWriteMode()
{
    this->serial->print(". ");
}

void LigGateway::printReadMode()
{
    this->serial->print("? ");
}

void LigGateway::printEnd()
{
    this->serial->print("* ");
}

void LigGateway::printHexVal(int val)
{
    if (val < 0 || val > 255)
    {
        this->serial->print("$$ ");
    }
    else
    {
        this->serial->print(toHex(val));
        this->serial->print(" ");
    }
}

void LigGateway::printCommand()
{
    this->serial->print("> ");
    this->serial->print(this->lineBuffer);
    this->serial->print(" ");
}

LigGateway Lig = LigGateway();

static int parseHex(char *str)
{
    uint8_t a, b;
    a = str[0];
    b = str[1];
    if (a > 'f')
        return -1;
    if (a < '0')
        return -1;
    if (a > '9' && a < 'A')
        return -1;
    if (a > 'F')
        a -= 32; // abcdef -> ABCDEF
    a = a - '0';
    if (a > 9)
        a -= 7;
    if (a > 15)
        return -1;

    if (a < 0 || a > 15)
        return -1;

    if (b > 'f')
        return -1;
    if (b < '0')
        return -1;
    if (b > '9' && b < 'A')
        return -1;
    if (b > 'F')
        b -= 32; // abcdef -> ABCDEF
    b = b - '0';
    if (b > 9)
        b -= 7;
    if (b > 15)
        return -1;

    if (b < 0 || b > 15)
        return -1;

    return a * 16 + b;
}

static char *toHex(int i)
{
    hexConvBuf[0] = i / 16;
    hexConvBuf[1] = i % 16;
    hexConvBuf[0] += '0';
    hexConvBuf[1] += '0';
    if (hexConvBuf[0] > '9')
        hexConvBuf[0] += 7;
    if (hexConvBuf[1] > '9')
        hexConvBuf[1] += 7;
    hexConvBuf[2] = 0;
    return hexConvBuf;
}
