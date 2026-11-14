# Second Chance

A simple capstone project for sharing useful second-hand items. The repository contains an Express API backed by MongoDB, 16 sample items, user authentication, and a small landing page.

## Quick start

Use Node.js 20.19 or newer and npm or pnpm.

```sh
npm install
npm run dev
```

Open http://localhost:3060. The development command starts a real temporary MongoDB server, imports 16 items, and starts Express. The first run downloads the MongoDB binary. This development database is reset when the process stops.

To use a persistent MongoDB instance, copy `.env.example` to `.env`, set `MONGODB_URI` and `JWT_SECRET`, then run:

```sh
npm run seed
npm start
```

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/secondchance/items` | List all items |
| GET | `/api/secondchance/items/:id` | Read one item by MongoDB ID or sample ID |
| POST | `/api/secondchance/items` | Create item; multipart image field `file` |
| DELETE | `/api/secondchance/items/:id` | Delete the authenticated user's item |
| GET | `/api/secondchance/search?category=Furniture` | Filter by category |
| GET | `/api/secondchance/search?q=chair` | Search item names and descriptions |
| POST | `/api/auth/register` | Register with `name`, `email`, `password` |
| POST | `/api/auth/login` | Log in with `email`, `password` |
| PUT | `/api/auth/user` | Update name, email, or password |

Creating/deleting items and updating users require `Authorization: Bearer <token>`. Passwords are hashed. Uploads accept JPG, PNG, WebP, or GIF files up to 5 MB.

The hosted landing page displays the same 16 sample listings and supports browser-side search and category filters. The Express/MongoDB API runs locally or on a Node.js host with MongoDB access; static hosting serves the landing page only.

## Assignment evidence

Run the development server, then in another terminal:

```sh
npm test
npm run evidence
```

`submission/inserted_items` contains the actual MongoDB import result. `mainpage`, `register`, `login`, `item_detail`, and `search_item` contain real cURL commands and responses. The evidence command uses Windows `curl.exe`; the saved commands also work with curl in a Unix shell. All accounts in those files are demonstration accounts.

`user-story.md` and `.github/ISSUE_TEMPLATE/user-story.md` contain the user story template. Eight stories are defined in `data/user-stories.json`. After authenticating GitHub, `npm run publish:github` creates a public repository and its labeled issues using an in-memory `GITHUB_TOKEN` environment variable. Push source separately. `submission/github-links.json` contains the URLs after publication.

For task 2, save a genuine screenshot of the repository's Issues page as `userstories.png`. For task 10, save a genuine browser screenshot of the deployed landing page, including its URL bar, as `deployed_landingpage.png`.

## CI/CD

`.github/workflows/cicd.yml` runs on pushes to main, pull requests, and manual dispatch. It installs locked dependencies, checks JavaScript syntax, imports 16 items into a MongoDB service, runs the API integration tests, validates the landing page, and uploads its deployment artifact. Successful main-branch runs deploy the landing page to GitHub Pages and verify the published page. Pull requests run validation without deployment.

View [GitHub Actions](https://github.com/ramazanutegen583-pixel/second-chance-capstone/actions/workflows/cicd.yml). After a successful run, `node scripts/github-actions.mjs logs RUN_ID` saves its full job logs and step results in `submission/CICD` for task 16. Authentication uses `GITHUB_TOKEN` or the existing Git Credential Manager sign-in; credentials are not written into the project.
