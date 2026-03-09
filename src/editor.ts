import { query } from "./ecsql";
import { name, body, currentNote } from "./main";
import { NOTES_CHANGED_EVENT } from "./sidebar";

export const NOTE_SELECTED_EVENT = "noteselected";

async function save() {
    let title_elt = document.querySelector<HTMLInputElement>("#note_title")!;
    let body_elt = document.querySelector<HTMLTextAreaElement>("#note_body")!;

    await name.update(currentNote, { name: title_elt.value });
    await body.update(currentNote, { body: body_elt.value });
    document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
}

document.addEventListener(NOTE_SELECTED_EVENT, async (e) => await setupEditor(e as CustomEvent<{ noteId: number }>))

async function setupEditor(event: CustomEvent<{ noteId: number }>) {
    let noteId = event.detail.noteId;
    document.querySelector<HTMLButtonElement>("#save_button")!.onclick = save;
    let response = await query(name.component, body.component);
    let selected_note = response.find(note => note.entity === noteId);
    if (selected_note === undefined) {
        console.log(`could not find note with id ${noteId}`)
        console.error(event);
        return
    }
    let note_body = selected_note["body"]
    document.querySelector<HTMLTextAreaElement>("#note_body")!.value = note_body
    document.querySelector<HTMLTextAreaElement>("#note_title")!.value = selected_note["name"]

    const params = new URL(window.location.href).searchParams;
    params.set("note", selected_note.entity);
    document.title = `EsqueNote - ${selected_note["name"]} (id: ${selected_note["entity"]})`
    window.history.pushState({}, "", "?" + params.toString());
}