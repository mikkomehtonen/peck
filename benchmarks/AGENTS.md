# Benchmarks

Evaluates peck agents against the [revim](https://github.com/gytis-ivaskevicius/revim) project using known pass/fail cases.

## Structure

Each benchmark directory contains a `config.sh` defining the agent and test cases.

- `revim-acceptance-reviewer/` — tests the `acceptance-reviewer` agent
- `revim-code-reviewer/` — tests the `code-reviewer` agent
- `revim-planner/` — tests the `planner` agent on revim story 010

## Running

Single run:
```bash
./run.sh --benchmark revim-acceptance-reviewer --case 010-1 --model sonnet-4.6
./run.sh --benchmark revim-code-reviewer      --case 010-2 --model sonnet-4.6
./run.sh --benchmark revim-planner            --case 010-1 --model sonnet-4.6
```

With a thinking variant:
```bash
./run.sh --benchmark revim-code-reviewer --case 010-2 --model deepseek-v4-pro:max
```

Multiple models in parallel:
```bash
./run-parallel.sh --benchmark revim-code-reviewer --case 010-2 --runs 3 \
  --model sonnet-4.6 \
  --model kimi-k2.6
```

Model names are defined in `benchmarks/models.json`. Cases ending in `-1` expect `fail`, `-2` expect `pass`.
