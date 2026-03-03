// TODO: Globally - 
// - Refactor into multiple, comprehensible files

import './style.css'
import { createComponent, createEntity, listComponents, query, sql, type Component, type ComponentDataTypes } from './ecsql'


let name = await createComponent("__name", { "name": 'TEXT' });
let body = await createComponent("__body", { "body": 'TEXT' });

await setupUi()
await getNotes()
await getTags()


async function setupEditor(note_id: number) {
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
  document.title = `EqueNote - ${selected_note["name"]} (id: ${selected_note["entity"]})`
  window.history.pushState({}, "", "?" + params.toString());
}

async function createNewNote() {
  let entity = await createEntity();
  name.init(entity, { name: "New Note" });
  body.init(entity, { body: "" });
  await getNotes();
}

async function createNewTag() {
  let dialog = document.querySelector<HTMLDialogElement>("#new_tag_dialog")!;
  let name = dialog.querySelector<HTMLInputElement>("#new_tag_name")!.value;
  let type_names = dialog.querySelectorAll<HTMLInputElement>(".new_tag_type_name")!.values()
  console.log(Array.from(type_names));
  // return await createComponent(name, types);
}

async function runDebugQuery() {
  let text_field = document.querySelector<HTMLInputElement>("#sql_debug")!;
  let text_data = text_field.value;
  console.log(text_data)
  console.log(await sql(text_data))
}

function getCurrentNote() {
  let url = new URL(window.location.href);
  let params = url.searchParams;
  // TODO: Handle case when this isn't set
  return parseInt(params.get("note")!);
}

async function save() {
  let title_elt = document.querySelector<HTMLInputElement>("#note_title")!;
  let body_elt = document.querySelector<HTMLTextAreaElement>("#note_body")!;
  let current_note = getCurrentNote();

  await name.update(current_note, { name: title_elt.value });
  await body.update(current_note, { body: body_elt.value });
  getNotes();
}

async function setupUi() {
  document.querySelector<HTMLButtonElement>("#run_debug")!.onclick = runDebugQuery;
  document.querySelector<HTMLButtonElement>("#new_note_button")!.onclick = createNewNote;
  document.querySelector<HTMLButtonElement>("#refresh")!.onclick = getNotes;
  document.querySelector<HTMLButtonElement>("#save_button")!.onclick = save;
  document.querySelector<HTMLButtonElement>("#new_tag_accept")!.onclick = createNewTag;

  await setupEditor(getCurrentNote())
}

async function getNotes() {
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

async function getTags() {
  listComponents();
}

function readTags<T extends ComponentDataTypes>(component: Component<T>) {
  let modal = document.querySelector<HTMLDialogElement>("#new_tag_dialog")!;
  let template = document.importNode(document.querySelector<HTMLTemplateElement>("#new_tag_data_type_selection")!);
  let data_types = component.data_types;
  for (let type of Object.keys(data_types)) {
    let this_type = data_types[type]
    let type_name = "";
    switch (this_type) {
      case 'INTEGER':
        type_name = "Int"
        break
      case 'REAL':
        type_name = "Float"
        break
      case 'TEXT':
        type_name = "String"
        break
      default:
        // Assume this is a reference for now
        console.error("ERROR: REFERENCES ARE NOT HANDLED HERE YET")
    }
    modal.appendChild(template)
  }
}

async function forceUpdate() {
  await setupEditor(getCurrentNote());
  window.history.pushState
}

// TODO: This doesn't currently work with the forward button at all,
// maybe should look into bfcache?
window.addEventListener("popstate", forceUpdate);
