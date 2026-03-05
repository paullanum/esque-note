import { getDataTypes, query, queryEntity, type Data } from "./ecsql";
import { name, body, getCurrentNote } from "./main";
import { reloadNotes } from "./sidebar";
import { createTagVisual, getTagsForNote } from "./tags";


async function save() {
    let title_elt = document.querySelector<HTMLInputElement>("#note_title")!;
    let body_elt = document.querySelector<HTMLTextAreaElement>("#note_body")!;
    let current_note = getCurrentNote();

    await name.update(current_note, { name: title_elt.value });
    await body.update(current_note, { body: body_elt.value });
    reloadNotes();
}

export async function setupEditor(noteId: number) {
    document.querySelector<HTMLButtonElement>("#save_button")!.onclick = save;
    let response = await query(name.component, body.component);
    let selected_note = response.find(note => note.entity === noteId);
    if (selected_note === undefined) {
        console.log(`could not find note with id ${noteId}`)
        return
    }
    let note_body = selected_note["body"]
    document.querySelector<HTMLTextAreaElement>("#note_body")!.value = note_body
    document.querySelector<HTMLTextAreaElement>("#note_title")!.value = selected_note["name"]
    let tagSpace = document.querySelector<HTMLDivElement>("#note_tags")!;
    tagSpace.textContent = "";
    let tags = await getTagsForNote(noteId);
    for (let tagName of Object.keys(tags)) {
        let data = await queryEntity(tagName, noteId);
        let types = await getDataTypes(tagName);
        if (data === null) {
            throw "ERROR: queryEntity returned null";
        }
        let tagData: Record<string, { data: string | number, type: Data }> = {}
        for (let columnName of Object.keys(data)) {
            tagData[columnName] = { data: data[columnName], type: types[columnName] };
        }
        let tag = createTagVisual(tagName, tagData);
        tagSpace.appendChild(tag);
    }

    const params = new URL(window.location.href).searchParams;
    params.set("note", selected_note.entity);
    document.title = `EsqueNote - ${selected_note["name"]} (id: ${selected_note["entity"]})`
    window.history.pushState({}, "", "?" + params.toString());
}