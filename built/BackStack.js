export default class BackStack {
    constructor() {
        this.events = {};
        window.addEventListener("popstate", this.onpop.bind(this));
    }
    onpop(event) {
        if (typeof this.events[event.state] === "function") {
            this.events[event.state]();
            event.preventDefault();
            window.history.replaceState(undefined, "");
        }
    }
    pop() {
        window.history.back();
    }
    push(state) {
        window.history.replaceState(state, "");
        window.history.pushState(undefined, "");
    }
    replace(state) {
        window.history.replaceState(state, "");
    }
    addPopHandler(state, fn) {
        this.events[state] = fn;
    }
    removePopHandler(state) {
        if (typeof this.events[state] !== "undefined") {
            delete this.events[state];
        }
    }
}
//# sourceMappingURL=BackStack.js.map