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

- [Bun](https://bun.sh/) as package manager and script runner.
- [Vite](https://vite.dev/) for the dev server and production bundling.
- [Preact](https://preactjs.com/) for the UI, via `@preact/preset-vite`.
- Deployed to GitHub Pages as a static site.

## Local Development

1.  Install [Bun](https://bun.sh/)
2.  Clone the repository and install dependencies:
    ```sh
    bun install
    ```
3.  Run the dev server:
    ```sh
    bun run dev
    ```
4.  Open `http://localhost:3000` and modify files in `src/`; Vite reloads changes instantly.
5.  Run checks before committing:
    ```sh
    bun run check
    ```

## Deployment

- Build the production bundle locally (output in `dist/`):
  ```sh
  bun run build
  ```
- Every push to `main` triggers the `.github/workflows/deploy.yml` workflow, which builds the app and deploys it to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**.

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE) for full text.
