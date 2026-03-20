// TODO: Globally - 
// None currently

import './style.css'
import { createComponent } from './ecsql'
import { NOTES_CHANGED_EVENT } from './sidebar';
import { NOTE_SELECTED_EVENT } from './editor';
import { TAGS_CHANGED_EVENT } from './tags';
import * as _ from './sidebar_item';

export let name = await createComponent("__name", { "name": 'TEXT' });
export let body = await createComponent("__body", { "body": 'TEXT' });

document.dispatchEvent(new CustomEvent(NOTES_CHANGED_EVENT));
document.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));

let noteParam = (new URL(window.location.href)).searchParams.get("note")
export let currentNote: number;

if (noteParam === null) {
  currentNote = 0
}
else {
  currentNote = parseInt(noteParam);
  // TODO: If this note doesn't exist, navigate to one that does
}

document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: currentNote } }));
// Make sure to do this AFTER sending the first one
document.addEventListener(NOTE_SELECTED_EVENT, (e) => currentNote = (e as CustomEvent<{ noteId: number }>).detail.noteId);

// TODO: This doesn't currently work with the forward button at all,
// maybe should look into bfcache?
window.addEventListener("popstate", () => document.dispatchEvent(new CustomEvent(NOTE_SELECTED_EVENT, { detail: { noteId: currentNote } })));
