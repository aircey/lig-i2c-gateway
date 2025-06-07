class LigResponseError {
  static OK = 0;
  static PARSE_CMD = 1;
  static PARSE_ADDRESS = 2;
  static PARSE_VALUES = 3;
  static PARSE_COMPLETE_FLAG = 4;
  static GATEWAY_ADDRESS = 5;
  static GATEWAY_RESPONSE = 6;
  static GATEWAY_INCOMPLETE = 7;

  #code;

  constructor(code) {
    this.#code = code;
  }

  equals(code) {
    return this.#code === code;
  }

  get message() {
    switch (this.#code) {
      case LigResponseError.OK:
        return "Success";
      case LigResponseError.PARSE_CMD:
        return "Failed to parse response from gateway";
      case LigResponseError.PARSE_ADDRESS:
        return "Failed to parse address from gateway response";
      case LigResponseError.PARSE_VALUES:
        return "Failed to parse read/write values from gateway response";
      case LigResponseError.PARSE_COMPLETE_FLAG:
        return "Gateway response has a complete flag while having additional data";
      case LigResponseError.GATEWAY_ADDRESS:
        return "Gateway threw an error due to invalid request or invalid address";
      case LigResponseError.GATEWAY_RESPONSE:
        return "Gateway threw an error during read/write operation";
      case LigResponseError.GATEWAY_INCOMPLETE:
        return "Gateway did not complete the read/write operation";
      default:
        return "Unknown error occurred";
    }
  }
}

class LigResponseValue {
  #flag;
  #value;

  constructor(flag, value) {
    this.#flag = flag;
    this.#value = value;
  }

  get isWrite() {
    return this.#flag === '.';
  }

  get isRead() {
    return this.#flag === '?';
  }

  get value() {
    return this.#value;
  }
}

class LigResponse {
  static #regex = {
    cmd_ok: /^> (?<cmd>.*) [\|](?<rsp>.*)$/,
    cmd_fail: /^> (?<cmd>.*) [\$](.*)$/,
    addr: /^(?<addr>[0-9a-fA-F$]{2}) (?<rem>.*)$/,
    values: /^(?<flag>[\.\?\*\$])(?<values>( [0-9a-fA-F$]{2})*)(?<rem>.*)$/,
  };

  #error = new LigResponseError(LigResponseError.OK);
  #cmd = "";
  #addr = "";
  #values = [];

  static is_related(str) {
    return str.trim().startsWith('>');
  }

  static parse(str) {
    const r = new LigResponse();

    const cmd_ok_match = LigResponse.#regex.cmd_ok.exec(str);

    if (!cmd_ok_match) {
      r.#set_error(LigResponseError.PARSE_CMD);

      const cmd_fail_match = LigResponse.#regex.cmd_fail.exec(str);
      if (cmd_fail_match) {
        r.#cmd = cmd_fail_match.groups.cmd.trim();
        r.#set_error(LigResponseError.GATEWAY_ADDRESS);
      }
      return r;
    }

    const cmd = cmd_ok_match.groups.cmd.trim();
    r.#cmd = cmd;

    const rsp = cmd_ok_match.groups.rsp.trim();

    const addr_match = LigResponse.#regex.addr.exec(`${rsp} `);

    if (!addr_match) {
      r.#set_error(LigResponseError.PARSE_ADDRESS);
      return r;
    }

    r.#addr = addr_match.groups.addr.trim();

    let remainder = addr_match.groups.rem.trim();

    while (remainder.length > 0) {
      const values_match = LigResponse.#regex.values.exec(remainder);

      if (!values_match) {
        r.#set_error(LigResponseError.PARSE_VALUES);
        return r;
      }

      const flag = values_match.groups.flag.trim();
      const values = values_match.groups.values.trim();
      remainder = values_match.groups.rem.trim();
      
      // Complete flag (*)
      if (flag === "*") { 
        if (values.length > 0 || remainder.length > 0) {
          r.#set_error(LigResponseError.PARSE_COMPLETE_FLAG);
        }
        return r;
      }

      // Error flag ($)
      if (flag === "$") { 
        r.#set_error(LigResponseError.GATEWAY_RESPONSE);
        return r;
      }

      // Read or write flag (? or .)
      values.trim().split(' ').forEach(
        v => r.#add_value(flag, v.trim())
      );
    }

    // If we reach here, we did not get a complete flag (*)
    r.#set_error(LigResponseError.GATEWAY_INCOMPLETE);

    return r;
  }

  #set_error(code) {
    this.#error = new LigResponseError(code);
  }

  #add_value(flag, value) {
    if (value) {
      this.#values.push(new LigResponseValue(flag, value));
    }
  }

  read_count() {
    return this.#values.filter(v => v.isRead).length;
  }
  
  write_count() {
    return this.#values.filter(v => v.isWrite).length;
  }

  get error() {
    return this.#error;
  }

  get cmd() {
    return this.#cmd;
  }

  get addr() {
    return this.#addr;
  }

  get values() {
    return this.#values;
  }

}
