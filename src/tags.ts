import { createComponent, getDataTypes, listComponents, queryEntity, removeComponent, type Data } from "./ecsql";
import { NOTE_SELECTED_EVENT } from "./editor";

let dialog = document.querySelector<HTMLDialogElement>("#new_tag_dialog")!;
let dataTypeContainer = dialog.querySelector<HTMLDivElement>("#new_tag_data_types")!;
let dataTypeTemplate = document.querySelector<HTMLTemplateElement>("#new_tag_data_type_selection")!;
let unusedTags = document.querySelector<HTMLUListElement>("#unused_tags")!;
let newNoteTag = document.querySelector<HTMLDetailsElement>("#new_note_tag")!;

document.querySelector<HTMLButtonElement>("#new_tag_button")!.onclick = initTagDialog;
document.querySelector<HTMLButtonElement>("#new_tag_accept")!.onclick = submitNewTag;

export const TAGS_CHANGED_EVENT = "tagschanged";

function initTagDialog() {
    dataTypeContainer.textContent = "";
    function addDataType() {
        let node = document.importNode(dataTypeTemplate, true);
        dataTypeContainer.appendChild(node.content);
    }
    let add_button = dialog.querySelector<HTMLButtonElement>("#add_tag_data_type")!
    add_button.onclick = addDataType;
    addDataType();
}

function tagTypeToData(tagType: string): Data {
    switch (tagType) {
        case "Int":
            return "INTEGER"
        case "Float":
            return "REAL"
        case 'String':
            return "TEXT"
        default:
            // Assume this is a reference for now
            console.error("ERROR: REFERENCES ARE NOT HANDLED HERE YET")
            return "REFERENCE x(abc)"
    }
}

async function reloadTags() {
    let components = await listComponents();
    console.log(components);
    let tags_box = document.querySelector<HTMLDivElement>("#tags")!;
    for (let component of components) {
        let elt = document.createElement('a');
        elt.textContent = component.name
        tags_box.appendChild(elt);
    }
}

async function submitNewTag() {
    let tagNameInput = dialog.querySelector<HTMLInputElement>("#new_tag_name")!;
    if (!validateNewTag()) {
        console.log("Error in validation")
        return
    }
    let dataTypes: Record<string, Data> = {};
    let dataTypeForms = Array.from(dialog.querySelectorAll<HTMLFormElement>(".new_tag_data_type_entry"));
    for (let form of dataTypeForms) {
        let name = form.querySelector<HTMLInputElement>(".new_tag_type_name")!.value;
        let type = form.querySelector<HTMLSelectElement>(".new_tag_type_data")!.value;
        dataTypes[name] = tagTypeToData(type);
    }
    await createComponent(tagNameInput.value, dataTypes);
    dialog.close();
    document.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
}

function validateNewTag() {
    let tagNameInput = dialog.querySelector<HTMLInputElement>("#new_tag_name")!;
    if (tagNameInput.value.length === 0) {
        return false;
    }
    for (let nameInput of dataTypeContainer.querySelectorAll<HTMLInputElement>(".new_tag_type_name")!) {
        if (nameInput.value.length === 0) {
            return false;
        }
    }
    return true;
}

async function setupEditorTags(event: CustomEvent<{ noteId: number }>) {
    let noteId = event.detail.noteId;
    let tagSpace = document.querySelector<HTMLDivElement>("#note_tags")!;
    tagSpace.textContent = "";

    let { components: tags, unused_components: unused_tags } = await getTagsForNote(noteId);
    let tagElts: ReturnType<typeof createTagVisual>[] = [];
    for (let tagName of Object.keys(tags)) {
        let data = await queryEntity(tagName, noteId);
        // TODO: Cache this
        let types = await getDataTypes(tagName);
        if (data === null) {
            throw "ERROR: queryEntity returned null";
        }
        let tagData: Record<string, { data: string | number; type: Data; }> = {};
        for (let columnName of Object.keys(data)) {
            tagData[columnName] = { data: data[columnName], type: types[columnName] };
        }
        let tag = createTagVisual(tagName, tagData);
        tagElts.push(tag);
    }
    for (let elt of tagElts) {
        tagSpace.appendChild(elt);
    }
    unusedTags.textContent = "";
    for (let tag of Object.keys(unused_tags)) {
        let item = document.createElement("li");
        item.textContent = tag;
        item.onclick = () => {
            newNoteTag.open = false
            console.log(`Add ${tag} to note with id ${noteId}`)
        };
        unusedTags.appendChild(item);
    }
}

async function getTagsForNote(noteId: number) {
    let components: Record<string, Record<string, Data>> = {};
    let unused_components: Record<string, Record<string, Data>> = {};
    for (let component of await listComponents()) {
        let result = await queryEntity(component.name, noteId)
        if (result === null) {
            unused_components[component.name] = await getDataTypes(component.name);
            continue;
        }
        components[component.name] = await getDataTypes(component.name);
    }
    console.log(components);
    return { components, unused_components };
}

const sqliteToCssClass: Record<string, string> = {
    "INTEGER": "int",
    "REAL": "float",
    "TEXT": "string",
}

function createTagVisual(name: string, data: Record<string, { type: Data, data: number | string }>) {
    let { entity, ...filteredTypes } = data;
    if (Object.keys(filteredTypes).length > 1) {
        // TODO: Compound data types
        throw "ERROR: COMPOUND DATA TYPES ARE NOT CURRENTLY SUPPORTED"
    }
    let tempFirstKey = Object.keys(filteredTypes)[0];

    let tagTemplate = document.querySelector<HTMLTemplateElement>("#tag_template")!;
    let elt = document.importNode(tagTemplate, true).content;
    elt.querySelector<HTMLDivElement>("#tag_name")!.textContent = name;
    elt.querySelector<HTMLDivElement>("#tag_value")!.textContent = filteredTypes[tempFirstKey].data as string;
    elt.firstElementChild!!.classList.add(sqliteToCssClass[filteredTypes[tempFirstKey].type]);
    return elt
}

// TODO: This
async function deleteTag(tagName: string) {
    await removeComponent(tagName);
    document.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
}

document.addEventListener(NOTE_SELECTED_EVENT, async (e) => await setupEditorTags(e as CustomEvent<{ noteId: number }>));
document.addEventListener(TAGS_CHANGED_EVENT, reloadTags);
