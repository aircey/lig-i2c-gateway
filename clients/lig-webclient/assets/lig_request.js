class LigRequest {
  static #escape_chars = ['\\', '[', ']'];
  static #part_type = {
    CMD: 0,
    DUO: 1,
    EXP: 2,
  };
  static #parse_steps = {
    INIT: 0,
    ADDRESS: 1,
    WRITE: 2,
    READ: 3,
  };

  #addr = "";
  #write_bytes = [];
  #read = "0"

  static #strip_escaped(str, replace = '_') {
    for (const c of LigRequest.#escape_chars) {
      str = str.replaceAll(`\\${c}`, replace.repeat(c.length + 1));
    }
    return str;
  }

  static #unescape(str) {
    for (const c of LigRequest.#escape_chars) {
      str = str.replaceAll(`\\${c}`, `${c}`);
    }
    return str;
  }

  static #escape(str) {
    for (const c of LigRequest.#escape_chars) {
      str = str.replaceAll(`${c}`, `\\${c}`);
    }
    return str;
  }

  static #parse_expressions(req) {
    const req_strip = LigRequest.#strip_escaped(req);

    const expr_list = [];

    let cursor = 0;
    while (cursor !== -1) {
      cursor = req_strip.indexOf("[", cursor);
      if (cursor === -1) continue;
      const expr_loc = { start: cursor, end: req_strip.length };
      cursor = req_strip.indexOf("]", cursor);
      if (cursor !== -1) expr_loc.end = cursor;
      expr_list.push(expr_loc);
    }

    return expr_list;
  }

  static #parse_parts(req) {
    const expr_list = LigRequest.#parse_expressions(req);
    const parts = [];
    const types = LigRequest.#part_type;

    let cursor = 0;
    let expr_cursor = 0;

    while (cursor < req.length) {
      if (expr_cursor < expr_list.length && expr_list[expr_cursor].start === cursor) {
        const expr_val = req.substring(expr_list[expr_cursor].start + 1, expr_list[expr_cursor].end);
        parts.push({ type: types.EXP, val: expr_val });
        cursor = expr_list[expr_cursor].end + 1;
        expr_cursor++;
        continue;
      }

      const cur_char = req.charAt(cursor);

      if (cur_char === '.' || cur_char === '?') {
        parts.push({ type: types.CMD, val: cur_char });
        cursor++;
        continue;
      }

      const next_is_exp = expr_cursor < expr_list.length && expr_list[expr_cursor].start === cursor + 1;
      const next_char = req.charAt(cursor + 1);

      if (next_is_exp || next_char === '' || next_char === '.' || next_char === '?') {
        parts.push({ type: types.DUO, val: `${cur_char}_` });
        cursor++;
      } else {
        parts.push({ type: types.DUO, val: `${cur_char}${next_char}` });
        cursor += 2;
      }
    }

    return parts;
  }

  static #part_get_val(part) {
    const types = LigRequest.#part_type;

    switch (part.type) {
      case types.EXP:
        return LigRequest.#unescape(part.val);
      case types.DUO:
        return `0x${part.val}`;
      case types.CMD:
        return part.val;
      default:
        throw new TypeError(`Invalid part type: ${part.type}`);
    }
  }

  parse(request) {
    if (typeof request !== 'string') {
      throw new TypeError("Request must be a string");
    }

    this.#addr = "";
    this.#write_bytes = [];
    this.#read = "0";

    const parts = LigRequest.#parse_parts(request.trim());

    if (parts.length === 0) return this;

    const steps = LigRequest.#parse_steps;
    const types = LigRequest.#part_type;

    const p_val = (part) => LigRequest.#part_get_val(part);
    const p_val_eq = (part, v) => p_val(part) === v;

    let step = steps.INIT;

    for (const part of parts) {

      // Looking for address value
      if (step === steps.INIT && part.type === types.CMD) {
        // Skip INIT step if we have a CMD before grabbing any address value
        step = steps.ADDRESS;
      } else if (step === steps.INIT) {
        // The first part is the address,
        this.#addr = p_val(part);
        step = steps.ADDRESS;
        continue;
      }

      // We have the address, looking for a WRITE or READ command
      if (step === steps.ADDRESS && part.type === types.CMD) {
        step = p_val_eq(part, '.') ? steps.WRITE : steps.READ;
        continue;
      } else if (step === steps.ADDRESS) {
        // We ignore other parts until the first CMD
        continue;
      }

      // Accumulating WRITE bytes or switching to READ
      if (step === steps.WRITE && part.type === types.CMD) {
        step = p_val_eq(part, '?') ? steps.READ : steps.WRITE;
        continue;
      } else if (step === steps.WRITE) {
        this.#write_bytes.push(p_val(part));
        continue;
      }

      // Looking for READ length
      if (step === steps.READ && part.type === types.CMD) {
        if (!p_val_eq(part, '?')) break;
        continue;
      } else if (step === steps.READ) {
        this.#read = p_val(part);
        break;
      }
    }

    return this;
  }

  static #val_convert(val, to_int = false) {
    let int_val = NaN;
    const v = String(val).trim().toLowerCase();

    if (v.startsWith('0b')) {
      int_val = parseInt(v.slice(2), 2);
    }
    else if (v.startsWith('0x')) {
      int_val = v.slice(2).match(/^([0-9]|[a-f])+$/) ? parseInt(v.slice(2), 16) : NaN;
    }
    else {
      int_val = parseInt(v);
    }

    if (!isNaN(int_val) && int_val >= 0 && int_val <= 255) {
      return to_int ? int_val : int_val.toString(16).toUpperCase().padStart(2, '0');
    } else {
      return to_int ? -1 : `[${LigRequest.#escape(val)}]`;
    }
  }

  toString() {
    const address = LigRequest.#val_convert(this.#addr);
    const writes = this.#write_bytes.map((b) => LigRequest.#val_convert(b)).join('');
    const read = this.#read ? LigRequest.#val_convert(this.#read) : '00'

    return `${address}${writes ? `.${writes}` : ''}${read !== '00' ? `?${read}` : ''}`;
  }

  get addr() {
    return this.#addr;
  }

  set addr(address) {
    this.#addr = String(address).trim();
  }

  get write_bytes() {
    return this.#write_bytes;
  }

  set write_bytes(bytes) {
    if (!Array.isArray(bytes)) {
      throw new TypeError("Write bytes must be an array");
    }

    this.#write_bytes = bytes.map(byte => String(byte).trim());
  }

  get read() {
    return this.#read;
  }
  set read(rd) {
    this.#read = rd ? String(rd).trim() : '0';
  }

  get int_addr() {
    return LigRequest.#val_convert(this.#addr, true);
  }

  get int_write_bytes() {
    return this.#write_bytes.map(byte => LigRequest.#val_convert(byte, true));
  }

  get int_read() {
    return LigRequest.#val_convert(this.#read, true);
  }
}
