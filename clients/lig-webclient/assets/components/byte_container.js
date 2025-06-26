class ByteContainer extends HTMLElement {

  constructor() {
    super();
    this.byte_values = [];
    this.e_dragged = null;
    this.bound_dragstart = null;
    this.bound_dragover = null;
    this.bound_dragend = null;
    this.bound_byte_component = null;

    this.observer = new MutationObserver(this.listener_observer.bind(this));
  }

  // connect component
  connectedCallback() {
    this.classList.add("byte-container");

    this.observer.observe(this, { childList: true });

    if (!this.bound_dragstart) {
      this.bound_dragstart = this.listener_dragstart.bind(this);
      this.addEventListener('dragstart', this.bound_dragstart);
    }

    if (!this.bound_dragover) {
      this.bound_dragover = this.listener_dragover.bind(this);
      this.addEventListener('dragover', this.bound_dragover);
    }

    if (!this.bound_dragend) {
      this.bound_dragend = this.listener_dragend.bind(this);
      this.addEventListener('dragend', this.bound_dragend);
    }

    if (!this.bound_byte_component) {
      this.bound_byte_component = this.listener_byte_component.bind(this);
      this.addEventListener('byte-update', this.bound_byte_component);
    }

    this.may_values_update();
  }

  // disconnect component
  disconnectedCallback() {

    this.observer.disconnect();

    if (this.bound_dragstart) {
      this.removeEventListener('dragstart', this.bound_dragstart);
      this.bound_dragstart = null;
    }

    if (this.bound_dragover) {
      this.removeEventListener('dragover', this.bound_dragover);
      this.bound_dragover = null;
    }

    if (this.bound_dragend) {
      this.removeEventListener('dragend', this.bound_dragend);
      this.bound_dragend = null;
    }

    if (this.bound_byte_component) {
      this.removeEventListener('byte-update', this.bound_byte_component);
      this.bound_byte_component = null;
    }
  }

  listener_dragstart(e) {
    if (e.target.classList.contains('byte-component')) {
      this.e_dragged = e.target;
      e.target.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  listener_dragover(e) {
    e.preventDefault();

    const target = e.target.closest('.byte-component[draggable="true"]');

    if (!target || target === this.e_dragged) return;

    const rect = target.getBoundingClientRect();
    const next = (e.clientY - rect.top < rect.height / 2 || e.clientX - rect.left < rect.width / 2)
      ? target
      : target.nextSibling;

    if (
      next !== this.e_dragged &&
      this.contains(this.e_dragged) &&
      (next === null || this.contains(next))
    ) {
      this.insertBefore(this.e_dragged, next);
    }
  }

  listener_dragend(e) {
    if (this.e_dragged) {
      this.e_dragged.classList.remove('dragging');
      this.e_dragged = null;
    }
  }

  listener_byte_component(e) {
    e.preventDefault();
    e.stopPropagation();
    this.may_values_update();
  }

  listener_observer(mutations) {
    this.may_values_update();
  }

  may_values_update() {
    const new_values = Array.from(this.querySelectorAll('byte-component'))
      .map((bc) => bc.getAttribute('val') || '');

    if (this.byte_values.length === new_values.length
      && this.byte_values.every((val, index) => val === new_values[index])) {
      // No changes detected
      return;
    }

    this.byte_values = new_values;

    this.dispatchEvent(new CustomEvent('byte-container-update', {
      bubbles: false,
      detail: { values: this.byte_values }
    }));
  }
}

customElements.define('byte-container', ByteContainer);
