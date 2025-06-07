class LogComponent extends HTMLElement {

  raw_response = null;
  response = null;
  date = new Date();

  constructor() {
    super();

    this.e_header = document.createElement("div");
    this.e_header_date = document.createElement("div");
    this.e_header_address = document.createElement("div");
    this.e_header_write = document.createElement("div");
    this.e_header_read = document.createElement("div");
    this.e_header_message = document.createElement("div");
    this.e_body = document.createElement("div");
    this.e_body_left = document.createElement("div");
    this.e_body_parsed = document.createElement("div");
    this.e_body_raw = document.createElement("div");
    this.e_body_right = document.createElement("div");

    this.e_button_reuse = document.createElement("button");
    this.e_button_raw = document.createElement("button");
    this.e_button_clear = document.createElement("button");

    this.e_byte_container = document.createElement("byte-container");

    this.e_pre_raw = document.createElement("pre");

    this.bound_reuse = null;
    this.bound_raw = null;
    this.bound_clear = null;
  }

  // component attributes
  static get observedAttributes() {
    return ['val', 'timestamp'];
  }

  // attribute change
  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (property === 'val') {
      this.raw_response = newValue;
      this.response = LigResponse.parse(newValue);
    }

    if (property === 'timestamp') {
      this.date = new Date(newValue);
    }

    this.update();
  }

  // connect component
  connectedCallback() {
    this.update();

    if (!this.bound_reuse) {
      this.bound_reuse = this.reuse_listener.bind(this);
      this.e_button_reuse.addEventListener('click', this.bound_reuse);
    }
    if (!this.bound_raw) {
      this.bound_raw = this.raw_listener.bind(this);
      this.e_button_raw.addEventListener('click', this.bound_raw);
    }
    if (!this.bound_clear) {
      this.bound_clear = this.clear_listener.bind(this);
      this.e_button_clear.addEventListener('click', this.bound_clear);
    }
  }

  // disconnect component
  disconnectedCallback() {
    if (this.bound_reuse) {
      this.e_button_reuse.removeEventListener('click', this.bound_reuse);
      this.bound_reuse = null;
    }
    if (this.bound_raw) {
      this.e_button_raw.removeEventListener('click', this.bound_raw);
      this.bound_raw = null;
    }
    if (this.bound_clear) {
      this.e_button_clear.removeEventListener('click', this.bound_clear);
      this.bound_clear = null;
    }
  }

  update() {
    this.classList.add("log-component");
    this.e_header.classList.add("log-header");
    this.e_header_date.classList.add("log-header-date");
    this.e_header_address.classList.add("log-header-address");
    this.e_header_write.classList.add("log-header-write");
    this.e_header_read.classList.add("log-header-read");
    this.e_header_message.classList.add("log-header-message");
    this.e_body.classList.add("log-body");
    this.e_body_left.classList.add("log-body-left");
    this.e_body_parsed.classList.add("log-body-parsed");
    this.e_body_raw.classList.add("log-body-raw");
    this.e_body_right.classList.add("log-body-right");
    this.e_button_reuse.classList.add("button-reuse");
    this.e_button_raw.classList.add("button-raw");
    this.e_button_clear.classList.add("button-clear");

    this.e_header.appendChild(this.e_header_date);
    this.e_header.appendChild(this.e_header_address);
    this.e_header.appendChild(this.e_header_write);
    this.e_header.appendChild(this.e_header_read);
    this.e_header.appendChild(this.e_header_message);

    this.e_body_left.appendChild(this.e_button_reuse)
    this.e_body.appendChild(this.e_body_left);
    this.e_body_parsed.appendChild(this.e_byte_container);
    this.e_body.appendChild(this.e_body_parsed);
    this.e_body_raw.appendChild(this.e_pre_raw);
    this.e_body.appendChild(this.e_body_raw);
    this.e_body_right.appendChild(this.e_button_raw);
    this.e_body_right.appendChild(this.e_button_clear);
    this.e_body.appendChild(this.e_body_right);

    this.appendChild(this.e_header);
    this.appendChild(this.e_body);

    this.e_header_date.textContent = this.date.toLocaleString();

    if (this.response) {
      this.e_header_address.textContent = `Address: ${this.response.addr ? `0x${this.response.addr}` : 'N/A'}`;
      this.e_header_write.textContent = `Write: ${this.response.write_count()}`;
      this.e_header_read.textContent = `Read: ${this.response.read_count()}`;

      if (this.response.error.equals(LigResponseError.OK)) {
        this.e_header_message.textContent = `✔  ${this.response.error.message}`;
        this.e_header_message.classList.remove('with-error');
        this.classList.remove('show-raw');
        this.e_button_raw.textContent = "Raw";
      }
      else {
        this.e_header_message.classList.add('with-error');
        this.classList.add('show-raw');
        this.e_header_message.textContent = `✘  ${this.response.error.message}`;
        this.e_button_raw.textContent = "Parsed";
      }

      this.e_button_reuse.textContent = "Reuse";
      this.e_button_clear.textContent = "Clear";

      this.e_pre_raw.textContent = this.raw_response;

      // Clear previous byte-components
      this.e_byte_container.replaceChildren(); 

      if (this.response.addr) {
        const byteComponent = document.createElement('byte-component');
        byteComponent.setAttribute('val', `0x${this.response.addr}`);
        byteComponent.classList.add('byte-address');
        this.e_byte_container.appendChild(byteComponent);
      }

      this.response.values.forEach(value => {
        const byteComponent = document.createElement('byte-component');
        byteComponent.setAttribute('val', `0x${value.value}`);
        if (value.isWrite) {
          byteComponent.classList.add('byte-write');
        } else if (value.isRead) {
          byteComponent.classList.add('byte-read');
        }
        this.e_byte_container.appendChild(byteComponent);
      });
    }
  }

  reuse_listener(e) {
    console.log("Reuse listener called");
    /* TODO 
      e.stopPropagation();
      e.preventDefault();

      if (this.response) {
        this.dispatchEvent(new CustomEvent('reuse', {
          detail: { response: this.response },
          bubbles: true,
          composed: true
        }));
      }
    */
  }

  raw_listener(e) {
    e.stopPropagation();
    e.preventDefault();

    this.classList.toggle('show-raw');
    if (this.classList.contains('show-raw')) {
      this.e_button_raw.textContent = "Parsed";
    } else {
      this.e_button_raw.textContent = "Raw";
    }
  }

  clear_listener(e) {
    e.stopPropagation();
    e.preventDefault();

    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
}

customElements.define('log-component', LogComponent);
