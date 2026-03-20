import { NOTE_SELECTED_EVENT } from "./editor";
import { currentNote } from "./main";
import { prepareDeletion } from "./sidebar";

export class NoteItem extends HTMLElement {
    constructor(noteId: number) {
        super();
        let template = document.querySelector<HTMLTemplateElement>("#note-item-template")!;
        let templateContent = template.content;

        const shadowRoot = this.attachShadow({ mode: "open" })
        let node = document.importNode(templateContent, true);
        node.querySelector("a")!.onclick = () => {
            if (noteId === currentNote) {
                return;
            }
            document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId } }));
        }
        let button = node.querySelector("button")!
        button.onclick = () => prepareDeletion(noteId);
        shadowRoot.appendChild(node);
    }
}

customElements.define("note-item", NoteItem)