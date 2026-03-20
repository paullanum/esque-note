export class TagItem extends HTMLElement {
    constructor() {
        super();
        let template = document.querySelector<HTMLTemplateElement>("#note-item-template")!;
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" })
        let node = document.importNode(templateContent, true);
        shadowRoot.appendChild(node);
    }
}

customElements.define("tag-item", TagItem)