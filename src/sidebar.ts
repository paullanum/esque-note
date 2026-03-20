import { createEntity, deleteDatabaseFile, query, removeEntity, sql } from "./ecsql";
import { name, body } from "./main";
import { NoteItem } from "./note_item";

let selectedToDelete: number = -1;
export const NOTES_CHANGED_EVENT = "noteschanged";

const modal = document.querySelector<HTMLDialogElement>("#confirm_deletion")!;
async function deleteNote() {
    if (selectedToDelete === -1) {
        return
    }
    console.log("Attempting to delete ", selectedToDelete);
    await removeEntity(selectedToDelete)
    selectedToDelete = -1
    document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
}

function setupSidebar() {
    document.querySelector<HTMLButtonElement>("#run_debug")!.onclick = runDebugQuery;
    document.querySelector<HTMLButtonElement>("#new_note_button")!.onclick = createNewNote;
    document.querySelector<HTMLButtonElement>("#refresh")!.onclick = () => document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
    document.querySelector<HTMLButtonElement>("#confirm_deletion_button")!.onclick = deleteNote;
}


async function createNewNote() {
    let entity = await createEntity();
    name.init(entity, { name: "New Note" });
    body.init(entity, { body: "" });
    document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
}

async function runDebugQuery() {
    let text_field = document.querySelector<HTMLInputElement>("#sql_debug")!;
    let text_data = text_field.value;
    if (text_data === "WIPEALL") {
        await deleteDatabaseFile();
        console.log("WIPED ALL")
        return;
    }
    console.log(text_data)
    console.table(await sql(text_data))
}

export function prepareDeletion(noteId: number) {
    console.log("Preparing to delete id: ", noteId);
    selectedToDelete = noteId;
    modal.showModal();
}

document.addEventListener(NOTES_CHANGED_EVENT, reloadNotes)

async function reloadNotes() {
    let answer = await query(name.component, body.component) as { entity: number, name: string, body: string }[];
    let parent = document.querySelector<HTMLDivElement>("#notes")!;
    parent.innerText = "";
    for (let note of answer) {
        let noteItem = new NoteItem(note.entity);
        let name = noteItem.appendChild(document.createElement('p'));
        name.textContent = note.name;
        name.slot = "name"
        parent.appendChild(noteItem);
    }
}


setupSidebar();