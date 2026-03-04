import { query } from "./ecsql";
import { name, body, getCurrentNote } from "./main";
import { reloadNotes } from "./sidebar";


async function save() {
    let title_elt = document.querySelector<HTMLInputElement>("#note_title")!;
    let body_elt = document.querySelector<HTMLTextAreaElement>("#note_body")!;
    let current_note = getCurrentNote();

    await name.update(current_note, { name: title_elt.value });
    await body.update(current_note, { body: body_elt.value });
    reloadNotes();
}

export async function setupEditor(note_id: number) {
    document.querySelector<HTMLButtonElement>("#save_button")!.onclick = save;
    let response = await query(name.component, body.component);
    let selected_note = response.find(note => note.entity === note_id);
    if (selected_note === undefined) {
        console.log(`could not find note with id ${note_id}`)
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