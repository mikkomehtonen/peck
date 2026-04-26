# Benchmarks

Evaluates kiss-spec agents against the [revim](https://github.com/gytis-ivaskevicius/revim) project using known pass/fail cases.

## Structure

Each benchmark directory contains a `config.sh` defining the agent and test cases.

- `revim-acceptance-reviewer/` — tests the `acceptance-reviewer` agent
- `revim-code-reviewer/` — tests the `code-reviewer` agent

## Running

Single run:
```bash
./run.sh --benchmark revim-acceptance-reviewer --case 007-1 --model /path/to/model.json
```

Multiple models in parallel:
```bash
./run-parallel.sh --benchmark revim-acceptance-reviewer --case 007-1 --runs 3 \
  --model /path/to/model-a.json \
  --model /path/to/model-b.json
```

Model configs live in `~/ai/BENCHMARKING/models/`. Cases ending in `-1` expect `fail`, `-2` expect `pass`.
