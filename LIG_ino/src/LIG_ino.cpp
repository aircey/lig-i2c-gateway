#include "LIG_ino.hpp"

LIGino::LIGino(Stream& stream) : _stream(stream) {}

void LIGino::begin() {
    _stream.begin(115200);
    _stream.println("LIGino ready.");
}

void LIGino::hello() {
    _stream.println("Hello from LIG_ino!");
}
