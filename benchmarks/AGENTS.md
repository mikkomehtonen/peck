# Benchmarks

Evaluates kiss-spec agents against the [revim](https://github.com/gytis-ivaskevicius/revim) project using known pass/fail cases.

## Structure

Each benchmark directory contains a `config.sh` defining the agent and test cases.

- `revim-acceptance-reviewer/` — tests the `acceptance-reviewer` agent
- `revim-code-reviewer/` — tests the `code-reviewer` agent
- `revim-planner/` — tests the `planner` agent on revim story 010

## Running

Single run:
```bash
./run.sh --benchmark revim-acceptance-reviewer --case 010-1 --model models/sonnet-4.6.json
./run.sh --benchmark revim-code-reviewer      --case 010-2 --model models/sonnet-4.6.json
./run.sh --benchmark revim-planner            --case 010-1 --model models/sonnet-4.6.json
```

Multiple models in parallel:
```bash
./run-parallel.sh --benchmark revim-acceptance-reviewer --case 007-1 --runs 3 \
  --model models/model-a.json \
  --model models/model-b.json
```

Model configs live in `benchmarks/models/`. Cases ending in `-1` expect `fail`, `-2` expect `pass`.
