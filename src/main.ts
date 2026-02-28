import './style.css'
import { createComponent, createEntity, query, sql } from './ecsql'


let name = await createComponent("__name", { "name": 'TEXT' });
let body = await createComponent("__body", { "body": 'TEXT' });

await setupUi()
await getNotes()


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
}

async function setupUi() {
  document.querySelector<HTMLButtonElement>("#run_debug")!.onclick = runDebugQuery;
  document.querySelector<HTMLButtonElement>("#new_note_button")!.onclick = createNewNote;
  document.querySelector<HTMLButtonElement>("#refresh")!.onclick = getNotes;
  document.querySelector<HTMLButtonElement>("#save_button")!.onclick = save;

  await setupEditor(getCurrentNote())
}

async function getNotes() {
  ///@ts-ignore
  let answer: { entity: number, name: string, body: string }[] = await query(name.component, body.component);
  let parent = document.querySelector<HTMLDivElement>("#notes")!;
  parent.innerText = "";
  for (let note of answer) {
    let elt = document.createElement('a');
    parent.appendChild(elt)
    elt.onclick = () => setupEditor(note.entity);
    elt.innerHTML = note.name;
  }
}

async function forceUpdate() {
  await setupEditor(getCurrentNote());
  window.history.pushState
}

// TODO: This doesn't currently work with the forward button at all,
// maybe should look into bfcache?
window.addEventListener("popstate", forceUpdate);
