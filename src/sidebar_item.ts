customElements.define(
    "navbar-item",
    class extends HTMLElement {
        constructor() {
            super();
            let template = document.querySelector<HTMLTemplateElement>("#sidebar-item-template")!;
            let templateContent = template.content;

            const shadowRoot = this.attachShadow({ mode: "open" })
            shadowRoot.appendChild(document.importNode(templateContent, true));
        }
    }
)