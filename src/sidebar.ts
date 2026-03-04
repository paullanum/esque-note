import { createEntity, query, sql } from "./ecsql";
import { setupEditor } from "./editor";
import { name, body } from "./main";

export function setupSidebar() {
    document.querySelector<HTMLButtonElement>("#run_debug")!.onclick = runDebugQuery;
    document.querySelector<HTMLButtonElement>("#new_note_button")!.onclick = createNewNote;
    document.querySelector<HTMLButtonElement>("#refresh")!.onclick = reloadNotes;
}

async function createNewNote() {
    let entity = await createEntity();
    name.init(entity, { name: "New Note" });
    body.init(entity, { body: "" });
    await reloadNotes();
}

async function runDebugQuery() {
    let text_field = document.querySelector<HTMLInputElement>("#sql_debug")!;
    let text_data = text_field.value;
    console.log(text_data)
    console.log(await sql(text_data))
}

export async function reloadNotes() {
    ///@ts-ignore
    let answer: { entity: number, name: string, body: string }[] = await query(name.component, body.component);
    let parent = document.querySelector<HTMLDivElement>("#notes")!;
    parent.innerText = "";
    let modal = document.querySelector<HTMLDialogElement>("#confirm_deletion")!;
    for (let note of answer) {
        let elt = document.createElement('a');
        parent.appendChild(elt)
        elt.onclick = () => setupEditor(note.entity);
        elt.innerHTML = note.name;
        elt.classList.add("note_link")
        let button = document.createElement('button')
        button.classList.add("delete_note_button")
        button.commandForElement = modal;
        button.command = "show-modal"
        button.innerText = "🗑️";
        elt.appendChild(button);
    }
}