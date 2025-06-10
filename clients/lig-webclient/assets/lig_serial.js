class LigSerialMatcher {
  static match(request, response) {
    return response.startsWith(`> ${request} `);
  }
}

class LigSerialError extends Error {
  constructor(message) {
    super(message);
    this.name = "LigSerialError";
  }

  static #handle_error(error, callback) {
    if (error instanceof LigSerialError) {
      return error;
    } else if (error instanceof Error) {
      const error_message = callback(error);
      if (!error_message) {
        return new LigSerialError(`An unexpected error occurred (${error.name}): ${error.message}`);
      }
      return new LigSerialError(error_message);
    } else {
      console.error("Unexpected error type:", error);
      return new LigSerialError("An unexpected error occurred.");
    }
  }

  static connect_error(error) {
    return LigSerialError.#handle_error(error, (e) => {
      switch (e.name) {
        case 'NotFoundError':
          return ("Please select a device and try again.");
        case 'SecurityError':
          return ("Access to the device was denied. Please check your permissions.");
        case 'NetworkError':
          return ("Attempt to open the port failed.");
        case 'InvalidStateError':
          return ("Device may be already used. Please close other applications or try to reset the device.");
        default:
          return null;
      }
    });
  }

  static disconnect_error(error) {
    return LigSerialError.#handle_error(error, (e) => null);
  }

  static run_error(error) {
    return LigSerialError.#handle_error(error, (e) => {
      switch (e.name) {
        case 'NetworkError':
          return `Connection error: ${e.message.charAt(0).toLowerCase()}${e.message.slice(1)}`;
        default:
          return null;
      }
    });
  }

  static query_error(error) {
    return LigSerialError.#handle_error(error, (e) => null);
  }
}

class LigSerial {
  #port;
  #reader;
  #writer;
  #next_line = Promise.withResolvers();
  #run_sem = null;
  #disconnect_sem = null;
  #on_receive_cb = null;

  #connecting = false;
  #connected = false;
  #disconnecting = false;
  #running = false;
  #querying = false;
  #query_queue = [];

  on_receive(callback) {
    if (typeof callback !== 'function') {
      throw new LigSerialError("Callback must be a function.");
    }
    this.#on_receive_cb = callback;
  }

  async connect(baud_rate = 115200, options = {}) {
    try {
      return await this.#do_connect(baud_rate, options);
    } catch (e) {
      throw LigSerialError.connect_error(e);
    }
  }

  async #do_connect(baud_rate, options) {
    if (!navigator.serial) {
      throw new LigSerialError("Web Serial is not supported in this browser.");
    }

    if (this.#connected) {
      throw new LigSerialError("Already connected. Please disconnect first.");
    }

    if (this.#connecting) {
      throw new LigSerialError("Connection already in progress.");
    }

    const all_options = { baudRate: baud_rate, ...options };

    if (typeof all_options.baudRate !== 'number'
      || all_options.baudRate < 9600
      || all_options.baudRate > 115200) {
      throw new LigSerialError("Invalid baud rate. It must be beetwen 9600 and 115200.");
    }

    this.#connecting = true;

    try {
      // Request a port from the user
      this.#port = await navigator.serial.requestPort();

      this.#port.addEventListener("disconnect", () => {
        // Handle unsolicited disconnection 
        // out of running mode
        if (!this.#running) {
          this.disconnect().catch((e) => {
            console.error("Error during disconnect:", e);
          });
        }
      });

      // Open the port with the specified options
      await this.#port.open(all_options);

      // Connected flag
      this.#connected = true;
    } finally {
      if (!this.#connected) this.#port = null;
      this.#connecting = false;
    }
  }

  async disconnect() {
    try {
      return await this.#do_disconnect();
    } catch (e) {
      throw LigSerialError.disconnect_error(e);
    }
  }

  async #do_disconnect() {
    if (!this.#connected) {
      throw new LigSerialError("Already disconnected");
    }

    // If disconnecting is already in progress, wait for it to finish
    if (this.#disconnecting) {
      if (this.#disconnect_sem) await this.#disconnect_sem.promise;
      return;
    }

    this.#disconnect_sem = Promise.withResolvers();
    this.#disconnecting = true;

    // If running, try to cancel the reader and wait for run() to finish
    let cancel_error = null;
    if (this.#running && this.#reader) {
      try {
        const run_sem = this.#run_sem;
        await this.#reader.cancel();
        if (run_sem) await run_sem.promise;
      } catch (e) {
        cancel_error = e;
      }
    }

    try {
      // Close the serial port
      await this.#port.close();
      this.#port = null;
    } catch (e) {
      // Re-throw the cancel error if it happened first
      if (cancel_error) throw cancel_error;
      throw e;
    } finally {
      this.#connected = false;
      this.#disconnecting = false;
      this.#disconnect_sem.resolve();
    }
  }

  async run() {
    try {
      return await this.#do_run();
    } catch (e) {
      throw LigSerialError.run_error(e);
    }
  }

  async #do_run() {
    if (this.#running) {
      throw new LigSerialError("Already running.");
    }

    if (!this.#connected) {
      throw new LigSerialError("Not connected. Please call connect() first.");
    }

    this.#run_sem = Promise.withResolvers();
    this.#running = true;

    let disconnect_error = null;

    try {
      this.#run_write_enable();
      await this.#run_read_loop();
    } finally {
      await this.#run_write_disable();
      this.#running = false;
      const disconnecting = this.#disconnecting;
      this.#run_sem.resolve();

      // In case of unsolicited disconnection
      if (!disconnecting) {
        try {
          await this.disconnect();
        } catch (e) {
          disconnect_error = e;
        }
      }
    }

    if (disconnect_error) {
      // If there was an error during disconnection, re-throw it
      throw disconnect_error;
    }
  }

  #run_write_enable() {
    // Enable writer
    if (this.#port && this.#port.writable) {
      this.#writer = this.#port.writable.getWriter();
    }
  }

  async #run_write_disable() {
    // Disable writer
    try {
      if (this.#writer) {
        await this.#writer.abort();
        this.#writer.releaseLock();
        this.#writer = null;
      }
    } catch (e) {
      console.warn("Error disabling serial writer:", e);
    }
  }

  async #run_read_loop() {
    const decoder = new TextDecoder();
    let buffer = '';
    let read_error = null;

    // Read loop while the read stream is open 
    // and we are not in the disconnecting state
    while (this.#port && this.#port.readable && !this.#disconnecting) {

      // If we get here after an error, it means it has recovered
      if (read_error != null) {
        console.warn("Recovered read error:", read_error);
        read_error = null;
      }

      this.#reader = this.#port.readable.getReader();

      try {
        // Read chunk loop
        while (true) {
          // Get a chunk from the read stream
          const { value, done } = await this.#reader.read();

          // Check if the read stream has ended 
          // ie: with reader.cancel()
          if (done) {
            break;
          }

          // Decode the Uint8Array value to a string
          const decoded = decoder.decode(value, { stream: true });

          // Provide the on_receive callback with the decoded data
          if (this.#on_receive_cb) {
            try {
              this.#on_receive_cb(decoded);
            } catch (e) {
              console.error("Error in on_receive callback:", e);
            }
          }

          // No query in progress, reset the buffer and ignore the data
          if (!this.#querying) {
            buffer = '';
            continue;
          }

          // Append the decoded data to the buffer
          buffer += decoded;

          // Split the buffer into lines
          let lines = buffer.split("\n");

          // If the last line is not complete, keep it in the buffer
          buffer = lines.pop();

          // Feed the lines into the next_line promise chain
          for (const line of lines) {
            const line_resolve = this.#next_line.resolve;
            this.#next_line = Promise.withResolvers();
            line_resolve({ response: line, next: this.#next_line.promise });
          }
        }
      } catch (e) {
        // Save the read error
        // => if the reader recovers, log it to console (see above)
        // => otherwise, re-throw it after tear down (see below)
        read_error = e;
      } finally {
        this.#reader.releaseLock();
      }
    }

    this.#reader = null;

    // Re-throw here any unrecoverable read error
    if (read_error != null) {
      throw read_error;
    }
  }

  async query(request, timeout = 3000) {
    try {
      return await this.#do_query(request, timeout);
    } catch (e) {
      throw LigSerialError.query_error(e);
    }
  }

  async #do_query(request, timeout) {
    if (request === undefined || request === null) {
      throw new LigSerialError("Undefined or null request.");
    }

    // Queue if another query is being processed
    if (this.#querying) {
      const sem = Promise.withResolvers();
      this.#query_queue.push(sem);
      await sem.promise;
    }

    this.#querying = true;

    try {

      if (!this.#connected) {
        throw new LigSerialError("Not connected. Please call connect() first.");
      }

      if (!this.#running) {
        throw new LigSerialError("Not running. Please call run() first.");
      }

      if (this.#disconnecting) {
        throw new LigSerialError("Disconnection in progress.");
      }

      if (!this.#port || !this.#port.writable || !this.#writer) {
        throw new LigSerialError("Device write stream is not available.");
      }

      let next_line = this.#next_line.promise;

      await this.#writer.write(new TextEncoder().encode(`${request.trim()}\n`));

      // Add a timer to handle request timeout
      const timeout_p = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new LigSerialError("Request timeout. Please check device connection, baudrate or firmware."));
        }, timeout);
      });

      // Wait for expected response or timeout
      while (true) {
        const line = await Promise.race([next_line, timeout_p]);

        if (!line || !line.next) {
          throw new LigSerialError("Internal error: Invalid line object");
        }

        const response = `${line.response}`;
        if (LigSerialMatcher.match(request, response)) {
          // Expected response
          return response;
        }

        next_line = line.next;
      }
    } finally {
      this.#querying = false;

      // Resolve the next send request if any
      if (this.#query_queue.length > 0) {
        const next = this.#query_queue.shift();
        next.resolve();
      }
    }
  }
}
