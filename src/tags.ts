import { createComponent, getDataTypes, listComponents, queryEntity, type Data } from "./ecsql";

let dialog = document.querySelector<HTMLDialogElement>("#new_tag_dialog")!;
let dataTypeContainer = dialog.querySelector<HTMLDivElement>("#new_tag_data_types")!;
let dataTypeTemplate = document.querySelector<HTMLTemplateElement>("#new_tag_data_type_selection")!;

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
    await reloadTags();
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

export async function getTagsForNote(noteId: number) {
    let components: Record<string, Record<string, Data>> = {};
    for (let component of await listComponents()) {
        let result = await queryEntity(component.name, noteId)
        if (result === null) {
            continue;
        }
        components[component.name] = await getDataTypes(component.name);
    }
    console.log(components);
    return components;
}

const sqliteToCssClass: Record<string, string> = {
    "INTEGER": "int",
    "REAL": "float",
    "TEXT": "string",
}

export function createTagVisual(name: string, data: Record<string, { type: Data, data: number | string }>) {
    let { entity, ...filteredTypes } = data;
    if (Object.keys(filteredTypes).length > 1) {
        // TODO: Compound data types
        throw "ERROR: COMPOUND DATA TYPES ARE NOT CURRENTLY SUPPORTED"
    }
    let tempFirstKey = Object.keys(filteredTypes)[0];

    let tagTemplate = document.querySelector<HTMLTemplateElement>("#tag_template")!;
    let elt = document.importNode(tagTemplate, true).content;
    elt.querySelector<HTMLDivElement>("#tag_name")!.textContent = name;
    // let content = await queryEntity()
    elt.querySelector<HTMLDivElement>("#tag_value")!.textContent = filteredTypes[tempFirstKey].data as string;
    elt.firstElementChild!!.classList.add(sqliteToCssClass[filteredTypes[tempFirstKey].type]);
    return elt
}

// TODO: This
function deleteTag() {

}

export async function setupTags() {
    document.querySelector<HTMLButtonElement>("#new_tag_button")!.onclick = initTagDialog;
    document.querySelector<HTMLButtonElement>("#new_tag_accept")!.onclick = submitNewTag;
    await reloadTags();
}