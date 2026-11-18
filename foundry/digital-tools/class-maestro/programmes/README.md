# Adding and updating programmes

One JSON file per subject and level, listed in `index.json`:

    { "id": "2AM-english", "level": "2AM", "subject": "English", "file": "2AM-english.json" }

File shape: `id, rev, level, subject, lang, sessionMinutes, stages[{name,pct}], skills[{id,label,fr?,ar?}], sequences[{id,sessions[{id,lessons[{id,title,skills[]}]}]}]`.
`subject` must match the subject name used in the app (English, French, Arabic, Mathematics, ...).
Classes created before a file exists are upgraded automatically once it is published.

## The rules that protect teachers' progress

Progress is stored as a list of lesson ids, so ids are a promise.

1. Lesson ids run 1, 2, 3 ... in order, no gaps.
2. **Once a file is published, never insert, reorder, renumber or remove lessons. Only add new lessons at the END.** Fixing a typo in a title is fine.
3. Every time a file changes, raise `rev` by 1. Teachers' phones only take the new file when `rev` is higher.
4. Every skill used by a lesson must exist in the file's `skills` list. Stage percentages add up to 100.
   `sessionMinutes` must be the real session length: it drives the pacer.

## Workflow for each change

    node tools/programmes.js --against <copy of programmes/ as it is published today>
    node tools/programmes.js --build

The first command checks the rules above (and tells you exactly what is wrong). The second one checks again and
regenerates `programmes.js`, the copy bundled for the first launch and for offline use. Publish only when both say OK.
Teachers get the update the next time they open the app with internet, with a short "Programmes updated" message.
