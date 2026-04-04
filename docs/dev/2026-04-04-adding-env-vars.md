# Adding environment variables

The app uses `@t3-oss/env-core` for env var validation. The main file is `src/env.ts`,
where all vars are declared, validated with zod, and exported via the `env` object. Start
there. For each new var, add a `getDockerInjectedEnv` call to read from `window.*` (how
Docker injects runtime vars), add it to the `client` schema with a zod validator, and wire
it into `runtimeEnv`. If the var should be previewable via the deploy tool at
deploy.blorpblorp.xyz, also add it to the `runtimeInjectedEnv` block — but only do this
for vars that make sense to preview before deploying.

## Docker

Runtime vars are injected by the entrypoint script in `Dockerfile`. You need to add the
var in four places: the `ARG` declaration, the `ENV` block, the `window.*` assignment in
the JS snippet, and the `envsubst` variable list. Missing any one of these means the var
will be silently ignored at runtime.

## Docs and other files

Update `.env.example` and the environment variables table in `README.md`. Also remember to keep
deploy.blorpblorp.xyz in sync. The mobile release workflows
(`.github/workflows/mobile-release.yml`, `mobile-beta.yml`) only pass a subset of vars as
build args — check whether your new var is needed for mobile builds and add it there if
so. `scripts/build-release.sh` is used for local release builds and may also need
updating.
