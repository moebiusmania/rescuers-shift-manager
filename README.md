# Shift Creator

A web-based planner that generates four-week rotations for rescuers drivers and RPCO staff, complete with coverage checks, volunteer preferences, and quick issue alerts. The tool targets operations teams that need to assemble compliant staffing rosters without spreadsheets.

## Scope & Features

- Configure employees with qualifications, weekend groups, shift patterns, and volunteer availability.
- Generate multi-week schedules with automatic validation for coverage gaps and conflicting assignments.
- Review per-person summaries alongside a shift-by-shift grid to balance workload.
- Built for internal teams; no authentication or persistence is included yet.

## Data Privacy

This application uses browser `localStorage` to store all data locally on your device. No data is sent to any server, all information remains on the user's computer and is never transmitted over the network.

## Tech Stack

- Deno 2.5 with the [Fresh 2](https://fresh.deno.dev/) framework.
- Preact with `@preact/signals` for interactive islands.
- Vite for local bundling via `@fresh/plugin-vite`.
- Deployed to Deno Deploy (`moebiusmania/shift-manager`).

## Local Development

1.  Install [Deno](https://deno.land/)
2.  Clone the repository and install dependencies (handled automatically when tasks run).
3.  Run the dev server:
    ```sh
    deno task dev
    ```
4.  Open `http://localhost:3000` and modify files in `routes/` or `islands/`; Fresh reloads changes instantly.
5.  Run checks before committing:
    ```sh
    deno task check
    ```

## Deployment

- Build the production bundle locally:
  ```sh
  deno task build
  ```
- Deploy to Deno Deploy (requires access to the configured project):
  ```sh
  deno deploy --project=shift-manager
  ```
  The organization/app mapping is defined in `deno.json` under `deploy`.

## License

This project is distributed under the MIT License. See `LICENSE` for full text.
