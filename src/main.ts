// TODO: Globally - 
// - Use events and event listeners to minimize coupling

import './style.css'
import { createComponent, listComponents } from './ecsql'
import { reloadNotes, setupSidebar } from './sidebar';
import { setupEditor } from './editor';
import { setupTags } from './tags';


export let name = await createComponent("__name", { "name": 'TEXT' });
export let body = await createComponent("__body", { "body": 'TEXT' });

await setupUi()
await reloadNotes()
await getTags()



export function getCurrentNote() {
  let url = new URL(window.location.href);
  let params = url.searchParams;
  // TODO: Handle case when this isn't set
  return parseInt(params.get("note")!);
}


async function setupUi() {
  setupSidebar();
  await setupEditor(getCurrentNote())
  await setupTags();
}

async function getTags() {
  listComponents();
}

async function forceUpdate() {
  await setupEditor(getCurrentNote());
}

// TODO: This doesn't currently work with the forward button at all,
// maybe should look into bfcache?
window.addEventListener("popstate", forceUpdate);
