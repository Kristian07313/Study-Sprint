# StudySprint

StudySprint is a beginner-friendly full-stack web app with a small Node.js backend and a simple frontend homepage.

## What this project includes

- A backend server built with Node.js
- A static frontend homepage
- A small API endpoint that returns a study tip
- A PDF upload flow from the browser to the backend
- PDF text extraction after upload
- A clean project structure that is easy to explore

## Folder structure

```text
Study-Sprint/
|-- package.json
|-- server/
|   `-- index.js
|-- public/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- uploads/
|   `-- .gitkeep
`-- README.md
```

### What each folder does

- `server/` contains the backend code. It starts the server, handles API routes, and serves the frontend files.
- `public/` contains the frontend files that run in the browser.
- `uploads/` stores uploaded PDF files.
- `package.json` defines the project name and the commands used to start the app.

## Requirements

- Node.js 18 or newer is recommended

## How to run the app

1. Open a terminal in the project folder.
2. Run:

```bash
npm start
```

3. Open your browser and go to:

```text
http://localhost:3000
```

## Available commands

```bash
npm start
```

Starts the app on port `3000`.

```bash
npm run dev
```

Starts the app in watch mode so it restarts when server files change.

## How the app works

- Visiting `/` loads the homepage from the `public/` folder.
- Clicking the button on the homepage sends a request to `/api/tip`.
- The backend responds with a random study tip in JSON format.
- Uploading a PDF sends the file to `/api/upload` using multipart form data.
- The backend checks that the uploaded file is really a PDF before saving it.
- After upload, the backend extracts readable text from the PDF and sends it back to the frontend.

## Beginner notes

- This project does not use external dependencies, which keeps setup simple.
- You can add more API routes later inside `server/index.js`.
- You can expand the homepage by editing files in `public/`.
