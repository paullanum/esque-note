import { getCached, invalidateFromFunction } from "./cache";
import { createComponent, getComponent, getDataTypes, listComponents, queryEntity, removeComponent, type Data } from "./ecsql";
import { NOTE_SELECTED_EVENT } from "./editor";
import { currentNote, name } from "./main";

let dialog = document.querySelector<HTMLDialogElement>("#new_tag_dialog")!;
let dataTypeContainer = dialog.querySelector<HTMLDivElement>("#new_tag_data_types")!;
let dataTypeTemplate = document.querySelector<HTMLTemplateElement>("#new_tag_data_type_selection")!;
let unusedTags = document.querySelector<HTMLUListElement>("#unused_tags")!;
let newNoteTag = document.querySelector<HTMLDetailsElement>("#new_note_tag")!;
let addTagToNoteDialog = document.querySelector<HTMLDialogElement>("#add_tag_value_dialog")!;
let addTagName = document.querySelector<HTMLDivElement>("#add_tag_name")!;
let addTagValue = document.querySelector<HTMLInputElement>("#add_tag_value")!;
let submitTagValue = document.querySelector<HTMLButtonElement>("#submit_tag_value")!;

document.querySelector<HTMLButtonElement>("#new_tag_button")!.onclick = initTagDialog;
document.querySelector<HTMLButtonElement>("#new_tag_accept")!.onclick = submitNewTag;
submitTagValue.onclick = addTagToNote;

export const TAGS_CHANGED_EVENT = "tagschanged";

let lastUsedNote: number = -1;
let lastUsedTagData: { component: string, column: string };

function initTagDialog() {
    // TODO: Only clear after a valid tag submission
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
            return "REFERENCE"
    }
}

async function reloadTags() {
    invalidateFromFunction((name) => name.startsWith("tags-"));
    let components = await listComponents();
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

    let { components: tags, unused_components: unusedNoteTags } = await getTagsForNote(noteId);
    let tagElts: ReturnType<typeof createTagVisual>[] = [];
    for (let tagName of Object.keys(tags)) {
        let data = await getCached(`tags-query-${tagName}-entity-${noteId}`, async () => await queryEntity(tagName, noteId));
        let types = await getCached(`tags-types-${tagName}`, async () => await getDataTypes(tagName));
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
    for await (let elt of tagElts) {
        tagSpace.appendChild(elt);
    }
    unusedTags.textContent = "";
    for (let tag of Object.keys(unusedNoteTags)) {
        let item = document.createElement("li");
        item.textContent = tag;
        item.onclick = () => {
            newNoteTag.open = false
            addTagName.textContent = `Value for ${tag}`
            addTagToNoteDialog.show();
            lastUsedNote = currentNote;
            let nonEntityKey = Object.keys(unusedNoteTags[tag]).filter(x => x !== "entity")[0];
            lastUsedTagData = { column: nonEntityKey, component: tag }
        };
        unusedTags.appendChild(item);
    }
}

async function addTagToNote() {
    if (lastUsedNote === -1) {
        throw "ERROR: TRIED TO ADD TAG WITHOUT PROVIDING NOTE"
    }
    let { init } = getComponent(lastUsedTagData.component);
    let data: Record<string, Data> = {};
    data[lastUsedTagData.column] = addTagValue.value as Data;
    await init(lastUsedNote, data);
    document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: lastUsedNote } }))
    lastUsedNote = -1;
}

async function getTagsForNote(noteId: number) {
    return await getCached(`tags-note-${noteId}`, async () => {
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
        return { components, unused_components };
    });
}

const sqliteToCssClass: Record<string, string> = {
    "INTEGER": "int",
    "REAL": "float",
    "TEXT": "string",
    "REFERENCE": "reference",
}

async function createTagVisual(componentName: string, data: Record<string, { type: Data, data: number | string }>) {
    let { entity, ...filteredTypes } = data;
    if (Object.keys(filteredTypes).length > 1) {
        // TODO: Compound data types
        throw "ERROR: COMPOUND DATA TYPES ARE NOT CURRENTLY SUPPORTED"
    }
    let tempFirstKey = Object.keys(filteredTypes)[0];

    let tagTemplate = document.querySelector<HTMLTemplateElement>("#tag_template")!;
    let elt = document.importNode(tagTemplate, true).content;
    elt.querySelector<HTMLDivElement>("#tag_name")!.textContent = componentName;
    let tagInfo = filteredTypes[tempFirstKey];
    if (tagInfo.type === "REFERENCE") {
        // TODO: Invalidate this when names change
        let nameTable = await getCached(
            `note-name-${tagInfo.data}`,
            async () => await queryEntity(name.component, tagInfo.data as number)
        );
        if (nameTable === null) {
            throw new Error(`No name for referenced note with id ${tagInfo.data}`);
        }
        let content = nameTable["name"]
        let link = document.createElement("a");
        link.onclick = () => document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: tagInfo.data } }))
        link.tabIndex = 0;
        link.textContent = content;
        elt.querySelector<HTMLDivElement>("#tag_value")!.appendChild(link);
    }
    else {
        let content = filteredTypes[tempFirstKey].data as string;
        elt.querySelector<HTMLDivElement>("#tag_value")!.textContent = content;
    }
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
