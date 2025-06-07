class ByteComponent extends HTMLElement {

  constructor() {
    super();
    this.parsed_val = 0;
    this.error = false;
    this.deletable = false;
    this.e_intval = document.createElement("div");
    this.e_hexval = document.createElement("div");
    this.e_binval = document.createElement("div");
    this.e_action = document.createElement("div");
    this.e_action_icon = document.createElement("div");
    this.bound_action = null;
  }

  // component attributes
  static get observedAttributes() {
    return ['val', 'deletable', 's-error', 's-parsed-val'];
  }

  // attribute change
  attributeChangedCallback(property, oldValue, newValue) {

    if (property == 's-error') {
      if (String(this.error) !== newValue) {
        this.set_state();
      }
      return;
    }

    if (property == 's-parsed-val') {
      if (String(this.parsed_val) !== newValue) {
        this.set_state();
      }
      return;
    }

    if (oldValue === newValue) return;

    if (property == 'deletable') {
      this.listener_delete_detach();

      if (newValue.trim().toLowerCase() == 'true') {
        this.deletable = true;
      }
      else {
        this.deletable = false;
      }
    }

    if (property == 'val') {
      let v = newValue.trim().toLowerCase();
      if (v.startsWith('0b')) {
        v = parseInt(v.slice(2), 2);
      }
      else if (v.startsWith('0x')) {
        v = v.slice(2).match(/^([0-9]|[a-f])+$/) ? parseInt(v.slice(2), 16) : NaN;
      }
      else {
        v = parseInt(newValue);
      }

      if (!isNaN(v) && v >= 0 && v <= 255) {
        this.parsed_val = v;
        this.error = false;
      }
      else {
        this.parsed_val = -1;
        this.error = true;
      }
    }

    this.update();
  }

  // connect component
  connectedCallback() {
    this.update();
  }

  // disconnect component
  disconnectedCallback() {
    this.listener_delete_detach();
  }


  listener_delete(e) {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  listener_delete_attach() {
    if (!this.bound_action) {
      this.bound_action = this.listener_delete.bind(this);
      this.e_action.addEventListener('click', this.bound_action);
    }
  }

  listener_delete_detach() {
    if (this.bound_action) {
      this.e_action.removeEventListener('click', this.bound_action);
      this.bound_action = null;
    }
  }

  set_state() {
    this.setAttribute('s-error', String(this.error));
    this.setAttribute('s-parsed-val', String(this.parsed_val));
  }

  update() {
    this.set_state();

    this.classList.add("byte-component");
    this.e_intval.classList.add("intval");
    this.e_hexval.classList.add("hexval");
    this.e_binval.classList.add("binval");
    this.e_action_icon.classList.add("action-icon")
    this.e_action.classList.add("action");

    if (!this.error) {
      this.classList.remove("with-error");

      this.e_intval.textContent = this.parsed_val;
      this.e_hexval.textContent = `0x${this.parsed_val.toString(16).padStart(2, "0")}`;
      this.e_binval.textContent = `0b${this.parsed_val.toString(2).padStart(8, "0")}`;

      this.appendChild(this.e_intval);
      this.appendChild(this.e_hexval);
      this.appendChild(this.e_binval);
    }
    else {
      this.classList.add("with-error");

      this.e_binval.textContent = 'error';
      const raw_val = `${this.getAttribute("val")}`.trim();
      this.e_intval.textContent = raw_val.length > 8 ? `${raw_val.slice(0, 6)}…` : raw_val;

      if (this.e_hexval.parentNode == this) {
        this.removeChild(this.e_hexval);
      }

      this.appendChild(this.e_intval);
      this.appendChild(this.e_binval);
    }

    if (this.deletable) {
      this.classList.add("with-action");
      this.e_action_icon.textContent = "⨯";

      this.e_action.appendChild(this.e_action_icon);
      this.appendChild(this.e_action);

      this.listener_delete_attach();
    } else {
      this.classList.remove("with-action");

      if (this.e_action.parentNode == this) {
        this.removeChild(this.e_action);
      }

      this.listener_delete_detach();
    }
  }
}

customElements.define('byte-component', ByteComponent);
