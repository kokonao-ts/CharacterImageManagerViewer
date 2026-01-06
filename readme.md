# Character Image Manager Editor

A visual configuration editor for the RPG Maker MZ plugin **CharacterPictureManager.js** (created by Triacontane).

This tool simplifies the process of creating complex JSON configurations for character stand pictures (tachie), allowing you to visually manage layers, conditions, and image files.

## Features

- **Visual Interface**: Easily add, remove, and reorder layers and images.
- **Image Preview**: Preview images directly from your RPG Maker project folder.
- **JSON Import/Export**: Paste your existing plugin parameters to edit them, then copy the result back to RPG Maker.
- **Field Support**: Supports key fields including Switches, Variables, Armor IDs, and more.

## Prerequisites

To use this editor effectively, you need the **CharacterPictureManager.js** plugin for RPG Maker MZ.

### Download the Plugin
You can download the latest version of `CharacterPictureManager.js` from Triacontane's repository:
[https://github.com/triacontane/RPGMakerMV/tree/mz_master/CharacterPictureManager.js](https://github.com/triacontane/RPGMakerMV/tree/mz_master/CharacterPictureManager.js)

## How to Use

1.  **Open the Editor**: Simply open `editor.html` in your web browser. No installation or server is required.
2.  **Prepare Images**:
    -   Copy or paste your project's `img` folder (specifically `img/pictures`) into the same directory as this `editor.html` file.
    -   The structure should look like:
        ```
        /characterImageManagerViewer
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
    -   If starting from scratch, you can just start adding layers.
4.  **Edit**:
    -   **Add Layer**: Create new layers for different characters or depth levels.
    -   **Add Image**: Add image entries to a layer.
    -   **Configure**: Set file names, switches (Layer Switch, Unfocus Switch, Invert Switch), variables, and other conditions.
    -   **Reorder**: Use the Up/Down arrows to change the drawing order of layers or images.
5.  **Export**:
    -   Click **Update JSON** to generate the configuration string.
    -   Click **Copy to Clipboard**.
    -   Paste the result back into the `PictureList` (Standing Picture List) parameter of the `CharacterPictureManager` plugin in RPG Maker.

## License

This project is licensed under the MIT License.

```text
MIT License

Copyright (c) 2024 Character Image Manager Editor Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
