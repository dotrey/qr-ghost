export default class BackStack {

    private events : { 
        [key: string] : () => void
    } = {};

    constructor() {
        window.addEventListener("popstate", this.onpop.bind(this));
    }

    private onpop(event : PopStateEvent) {
        if (typeof this.events[event.state] === "function") {
            this.events[event.state]();

            console.log(history.state);
            event.preventDefault();
            window.history.replaceState(undefined, "");
        }
    }

    pop() {
        window.history.back();
    }

    push(state : string) {
        window.history.replaceState(state, "");
        window.history.pushState(undefined, "");
    }

    replace(state : string) {
        window.history.replaceState(state, "");
    }

    addPopHandler(state : string, fn : () => void) {
        this.events[state] = fn;
    }

    removePopHandler(state : string) {
        if (typeof this.events[state] !== "undefined") {
            delete this.events[state];
        }
    }
}