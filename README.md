# RPG Maker MZ Plugins & Tools Collection

This repository contains a collection of plugins and tools for RPG Maker MZ, focused on character picture management and game state synchronization.

## 📁 Repository Structure

### 1. [CharacterPictureManagerPlugin](./CharacterPictureManagerPlugin/)
A powerful system for managing character stand pictures (tachie), featuring:
- **Core Plugin**: `CharacterPictureManager.js` (by Triacontane).
- **Visual Editor**: A browser-based tool (`editor.html`) to easily configure complex layering and display conditions without manually editing JSON.
- **Movement Patch**: Adds support for coordinate offsets, floating animations, and movement plugin commands.
- **Non-Party Patch**: Allows displaying stand pictures for actors not currently in the party.

### 2. [plugin/](./plugin/)
A collection of standalone utility plugins:
- **EquipSync.js**: Synchronizes equipment between two actors. Useful for clone characters, reflections, or paired mechanics. Supports bidirectional syncing.
- **FirstRunVariableHandler.js**: Handles variable and switch initialization.
    - **First Run**: Set values only the very first time the game is launched.
    - **Always Enforce**: Force reset specific variables or switches every time the game boots up.

## 🚀 Getting Started

1.  **Plugins**: Copy the desired `.js` files from this repository into your project's `js/plugins/` folder.
2.  **Editor**: To use the Character Picture Manager Editor, open `CharacterPictureManagerPlugin/editor.html` in your browser. For image previews, ensure your project's `img/pictures` folder is accessible to the editor (see the [Plugin README](./CharacterPictureManagerPlugin/readme.md) for details).

## 🛠️ Requirements

- RPG Maker MZ
- (Optional) `PluginManagerEx` for advanced parameter parsing in some plugins.

## 📄 License

Individual plugins may have their own licenses. Original work in this repository is licensed under the MIT License.
