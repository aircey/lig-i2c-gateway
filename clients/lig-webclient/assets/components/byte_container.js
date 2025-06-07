class ByteContainer extends HTMLElement {

  constructor() {
    super();
    this.e_dragged = null;
    this.bound_dragstart = null;
    this.bound_dragover = null;
    this.bound_dragend = null;
  }

  // connect component
  connectedCallback() {
    this.classList.add("byte-container");

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
  }

  // disconnect component
  disconnectedCallback() {
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
}

customElements.define('byte-container', ByteContainer);
