// TODO: Globally - 
// None currently

import './style.css'
import { createComponent } from './ecsql'
import { NOTES_CHANGED_EVENT } from './sidebar';
import { NOTE_SELECTED_EVENT } from './editor';
import { TAGS_CHANGED_EVENT } from './tags';

export let name = await createComponent("__name", { "name": 'TEXT' });
export let body = await createComponent("__body", { "body": 'TEXT' });

document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
document.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: getCurrentNote() } }));


export function getCurrentNote() {
  let url = new URL(window.location.href);
  let params = url.searchParams;
  // TODO: Handle case when this isn't set
  try {
    return parseInt(params.get("note")!);
  }
  catch {
    return 0;
  }
}

// TODO: This doesn't currently work with the forward button at all,
// maybe should look into bfcache?
window.addEventListener("popstate", () => document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: getCurrentNote() } })));
