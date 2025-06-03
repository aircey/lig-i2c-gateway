# LIG – Little I2C Gateway

**Talk I²C from your PC** — LIG is a toolkit that turns any Arduino-compatible board into a USB/UART-to-I²C bridge. It lets you debug, explore, and play with I²C devices from your **web browser** (via WebSerial) or **Python**.

The toolkit consists of:

- 🔌 **lig-ino** — An Arduino/PlatformIO library that acts as the I²C controller
- 🌐 **lig-web** — A WebSerial-based browser app for sending/receiving I²C commands with a graphical interface
- 🐍 **lig-py** — A Python package for sending/receiving I²C commands programmatically

LIG communicates over standard serial (USB/UART) with your board, which acts as a transparent gateway to the I²C bus. You can scan for I²C devices, read and write registers, automate sequences, or interact manually for quick debugging.

> 📝 In this documentation, we use modern I²C terminology:
> - **I²C controller** instead of "*I²C master*"
> - **I²C target** or **I²C device** instead of "*I²C slave*"

## 🚀 Quickstart

1. **Flash your Arduino board with `lig-ino`**
2. **Wire your I²C device(s) to the board**
3. **Open `lig-web` in your browser** (no installation needed)
4. **Connect over WebSerial and start sending I²C commands**

Or script it with Python:

```python
from ligpy import Lig

i2c = Lig('/dev/ttyUSB0')
i2c.cmd(address=0x3C, write=[0xA5], read=1)
```
