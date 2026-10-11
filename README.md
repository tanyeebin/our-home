# Our Cozy Home

A small, no-build static website made as a cozy interactive 3D home for two. The interface is in English. The attached photo and song are included in `assets/` and stay local to this folder.

## Run it

Because the 3D room uses JavaScript modules, serve this folder over HTTP instead of opening `index.html` directly. On Windows, double-click `start-local.bat` (Node.js must be installed), then visit `http://localhost:8000`. Or run `node serve.mjs` from this folder. The browser needs internet access to load the Three.js module from jsDelivr. There are no package installs or build steps.

## Put it on GitHub Pages

1. Create a GitHub repository and upload the contents of this folder to its root.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, select your default branch and the `/ (root)` folder, then save.
4. GitHub Pages will provide the website URL after its first deployment.

## Included interactions

- Three randomized daily quests, with progress and stars saved in the visitor's browser.
- A real 3D dollhouse with raised walls, furnished rooms, a garden, and a rotatable camera.
- Clickable 3D furniture and activities, with characters that walk around furniture, sit for activities, and show a seconds countdown above them.
- A garden watering and fertilizing effect that leaves the flower models and colors intact.
- Room details, snack choices, and a photo-cleaning interaction.
- Level progression, with 5 stars for each completed daily quest.
- A song player (browser autoplay rules may require the visitor to tap play).
- Right-drag camera orbit, left-drag pan, zoom, and characters, a dog, and a robot vacuum that wander around the furniture.

This is a front-end-only page. Saved progress lives in local browser storage and is not shared between devices.
