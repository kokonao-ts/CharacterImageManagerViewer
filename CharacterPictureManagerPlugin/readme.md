# Character Picture Manager - Plugin & Editor

This directory contains the RPG Maker MZ plugin **CharacterPictureManager.js** (created by Triacontane) along with a visual configuration editor and several enhancement patches.

## Contents

-   **CharacterPictureManager.js**: The core plugin for managing character stand pictures (tachie).
-   **Visual Editor**: A tool to visually manage layers, conditions, and image files.
    -   `editor.html`, `editor.js`, `editor.css`
-   **StandPicture_MovementPatch.js**: Add-on for coordinate offsets, floating animations, and movement commands.
-   **StandPicture_NonPartyPatch.js**: Add-on to display actors who are not in the current party.

## Features

-   **Visual Interface**: Easily add, remove, and reorder layers and images using the editor.
-   **Image Preview**: Preview images directly from your RPG Maker project folder in the editor.
-   **JSON Import/Export**: Paste your existing plugin parameters to edit them, then copy the result back to RPG Maker.
-   **Movement & Animation (via Patch)**: 
    -   Offset stand picture coordinates using game variables.
    -   Subtle floating (bobbing) animation for characters.
    -   Plugin commands for absolute and relative movement.
    -   Auto-reset position after event execution.
-   **Non-Party Display (via Patch)**: Show specific actors even if they are not in the current party.

## Prerequisites

To use this editor effectively, you need the **CharacterPictureManager.js** plugin for RPG Maker MZ.

### Download the Plugin
You can download the latest version of `CharacterPictureManager.js` from Triacontane's repository:
[https://github.com/triacontane/RPGMakerMV/tree/mz_master/CharacterPictureManager.js](https://github.com/triacontane/RPGMakerMV/tree/mz_master/CharacterPictureManager.js)

## How to Use - Editor

1.  **Open the Editor**: Simply open `editor.html` in your web browser. No installation or server is required.
2.  **Prepare Images**:
    -   Copy or paste your project's `img` folder (specifically `img/pictures`) into the same directory as this `editor.html` file.
    -   The structure should look like:
        ```
        /CharacterPictureManagerPlugin
          ├── editor.html
          ├── editor.js
          ├── editor.css
          └── img
              └── pictures
                  └── (your image files)
        ```
    -   This allows the editor to display previews of your images automatically.
3.  **Load Data**:
    -   If you have existing configuration data, copy the JSON string from the `CharacterPictureManager` plugin parameters in RPG Maker.
    -   Paste it into the "JSON Data" text area and click **Load Data**.
4.  **Edit**:
    -   **Add Layer**: Create new layers for different characters or depth levels.
    -   **Add Image**: Add image entries to a layer.
    -   **Configure**: Set file names, switches (Layer Switch, Unfocus Switch, Invert Switch), variables, and other conditions.
    -   **Reorder**: Use the Up/Down arrows to change the drawing order of layers or images.
5.  **Export**:
    -   Click **Update JSON** to generate the configuration string.
    -   Click **Copy to Clipboard**.
    -   Paste the result back into the `PictureList` (Standing Picture List) parameter of the `CharacterPictureManager` plugin in RPG Maker.

## How to Use - Patches

### Movement Patch (`StandPicture_MovementPatch.js`)

1. Install below `CharacterPictureManager.js`.
2. Configure **X/Y Offset Variables** in plugin parameters if you want variable-based control.
3. Enable **Auto Reset** if you want characters to return to (0,0) after every event.
4. Use Plugin Commands:
   - `Move Stand Picture`: Move to absolute (X, Y).
   - `Move Stand Picture Relative`: Move relative to current position.

### Non-Party Patch (`StandPicture_NonPartyPatch.js`)

1. Install below `CharacterPictureManager.js`.
2. Add Actor IDs to the `Target Actor IDs` parameter.
3. (Optional) Set an `Enable Switch ID` to control when these extra actors are visible.
4. **Note**: Since non-party actors don't have a party index, you **must** set their "Actor Position" coordinates in the main `CharacterPictureManager` plugin settings.

## License

This project is licensed under the MIT License.
