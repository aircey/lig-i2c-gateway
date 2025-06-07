class LigResponseError {
  static OK = 0;
  static PARSE_CMD = 1;
  static PARSE_ADDRESS = 2;
  static PARSE_VALUES = 3;
  static PARSE_COMPLETE_FLAG = 4;
  static GATEWAY_ADDRESS = 5;
  static GATEWAY_RESPONSE = 6;
  static GATEWAY_UNCOMPLETE = 7;

  #_code;

  constructor(code) {
    this.#_code = code;
  }

  set(code) {
    this.#_code = code;
  }

  equals(code) {
    return this.#_code === code;
  }

  get message() {
    switch (this.#_code) {
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
      case LigResponseError.GATEWAY_UNCOMPLETE:
        return "Gateway did not complete the read/write operation";
      default:
        return "Unknown error occurred";
    }
  }
}

class LigResponseValue {
  #_flag;
  #_value;

  constructor(flag, value) {
    this.#_flag = flag;
    this.#_value = value;
  }

  get isWrite() {
    return this.#_flag === '.';
  }

  get isRead() {
    return this.#_flag === '?';
  }

  get value() {
    return this.#_value;
  }
}

class LigResponse {
  static #_regex = {
    cmd_ok: /^> (?<cmd>.*) [\|](?<rsp>.*)$/,
    cmd_fail: /^> (?<cmd>.*) [\$](.*)$/,
    addr: /^(?<addr>[0-9a-fA-F$]{2}) (?<rem>.*)$/,
    values: /^(?<flag>[\.\?\*\$])(?<values>( [0-9a-fA-F$]{2})*)(?<rem>.*)$/,
  };

  error = new LigResponseError(LigResponseError.OK);
  cmd = "";
  addr = "";
  values = [];

  static is_related(str) {
    return str.trim().startsWith('>');
  }

  static parse(str) {
    const r = new LigResponse();

    const cmd_ok_match = LigResponse.#_regex.cmd_ok.exec(str);

    if (!cmd_ok_match) {
      r.error.set(LigResponseError.PARSE_CMD);

      const cmd_fail_match = LigResponse.#_regex.cmd_fail.exec(str);
      if (cmd_fail_match) {
        r.cmd = cmd_fail_match.groups.cmd.trim();
        r.error.set(LigResponseError.GATEWAY_ADDRESS);
      }
      return r;
    }

    const cmd = cmd_ok_match.groups.cmd.trim();
    r.cmd = cmd;

    const rsp = cmd_ok_match.groups.rsp.trim();

    const addr_match = LigResponse.#_regex.addr.exec(`${rsp} `);

    if (!addr_match) {
      r.error.set(LigResponseError.PARSE_ADDRESS);
      return r;
    }

    const addr = addr_match.groups.addr.trim();
    r.addr = addr;

    let rem = addr_match.groups.rem.trim();

    while (rem.length > 0) {
      const values_match = LigResponse.#_regex.values.exec(rem);

      if (!values_match) {
        r.error.set(LigResponseError.PARSE_VALUES);
        return r;
      }

      const flag = values_match.groups.flag.trim();
      const values = values_match.groups.values.trim();
      rem = values_match.groups.rem.trim();
      
      // Complete flag (*)
      if (flag === "*") { 
        if (values.length > 0 || rem.length > 0) {
          r.error.set(LigResponseError.PARSE_COMPLETE_FLAG);
        }
        return r;
      }

      // Error flag ($)
      if (flag === "$") { 
        r.error.set(LigResponseError.GATEWAY_RESPONSE);
        return r;
      }

      // Read or write flag (? or .)
      values.trim().split(' ').map(v => v.trim()).forEach(
        v => r.add_value(flag, v)
      );
    }

    // If we reach here, we did not get a complete flag (*)
    r.error.set(LigResponseError.GATEWAY_UNCOMPLETE);

    return r;
  }

  add_value(flag, value) {
    if (value) {
      this.values.push(new LigResponseValue(flag, value));
    }
  }

  read_count() {
    return this.values.filter(v => v.isRead).length;
  }
  
  write_count() {
    return this.values.filter(v => v.isWrite).length;
  }

}
