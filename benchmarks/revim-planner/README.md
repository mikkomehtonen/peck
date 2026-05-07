# revim planner benchmark

Runs the `planner` agent against revim story 010 (vim search).

## Cases

| Case  | Checkout  | Expected |
|-------|-----------|----------|
| 010-1 | `8307388` | pass     |

The checkout is just before `010-vim-search` was created on the main branch. `peck story create` will assign the next available number.

## Verdict

Pass requires: at least one new commit, a `stories/*/story.md` file in the diff, and a clean working tree.

## Running

```bash
./run.sh --benchmark revim-planner --case 010-1 --model models/sonnet-4.6.json
```
