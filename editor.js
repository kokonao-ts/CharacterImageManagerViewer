
class Editor {
    constructor() {
        this.data = []; // Main source of truth for all layers
        this.filterActorId = null; // Current filter
        this.selectedLayerIds = new Set();
        this.availableImages = []; 
        this.selectedImages = new Set();
        this.layerMap = new Map(); // Fast lookup by _id

        this.initUI();
        this.bindEvents();
        
        // Auto-load if data available
        if (this.ui.jsonInput.value.trim()) {
            this.loadData();
        }
    }

    initUI() {
        this.ui = {
            jsonInput: document.getElementById('jsonInput'),
            loadBtn: document.getElementById('loadBtn'),
            exportBtn: document.getElementById('exportBtn'),
            copyBtn: document.getElementById('copyBtn'),
            addLayerBtn: document.getElementById('addLayerBtn'),
            scanImagesBtn: document.getElementById('scanImagesBtn'),
            editorContainer: document.getElementById('editorContainer'),
            
            // Filter
            filterActorIdInput: document.getElementById('filterActorIdInput'),
            applyFilterBtn: document.getElementById('applyFilterBtn'),
            clearFilterBtn: document.getElementById('clearFilterBtn'),
            
            // Bulk Actions
            bulkActionsPanel: document.getElementById('bulkActionsPanel'),
            selectedCountSpan: document.getElementById('selectedCount'),
            clearSelectionBtn: document.getElementById('clearSelectionBtn'),
            duplicateSelectedBtn: document.getElementById('duplicateSelectedBtn'),
            batchSwitchType: document.getElementById('batchSwitchType'),
            batchSwitchInput: document.getElementById('batchSwitchInput'),
            applyBatchSwitchBtn: document.getElementById('applyBatchSwitchBtn'),
            
            // File input for scanning
            folderInput: document.getElementById('folderInput'),

            // Image Browser
            imageBrowserPanel: document.getElementById('imageBrowserPanel'),
            imageBrowserContent: document.getElementById('imageBrowserContent'),
            toggleBrowserBtn: document.getElementById('toggleBrowserBtn'),
            addSelectedToLayerBtn: document.getElementById('addSelectedToLayerBtn'),
            clearBrowserSelectionBtn: document.getElementById('clearBrowserSelectionBtn')
        };
    }

    bindEvents() {
        this.ui.loadBtn.addEventListener('click', () => this.loadData());
        this.ui.exportBtn.addEventListener('click', () => this.exportData());
        this.ui.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.ui.addLayerBtn.addEventListener('click', () => this.addNewLayer());
        
        this.ui.applyFilterBtn.addEventListener('click', () => this.applyFilter());
        this.ui.clearFilterBtn.addEventListener('click', () => this.clearFilter());
        
        this.ui.scanImagesBtn.addEventListener('click', () => this.scanImages());
        this.ui.toggleBrowserBtn.addEventListener('click', () => this.toggleImageBrowser());
        this.ui.addSelectedToLayerBtn.addEventListener('click', () => this.addSelectedImagesToLayer());
        this.ui.clearBrowserSelectionBtn.addEventListener('click', () => {
            this.selectedImages.clear();
            this.renderImageBrowser();
        });

        this.ui.clearSelectionBtn.addEventListener('click', () => {
            this.selectedLayerIds.clear();
            this.render();
        });
        this.ui.duplicateSelectedBtn.addEventListener('click', () => this.duplicateSelectedLayers());
        this.ui.applyBatchSwitchBtn.addEventListener('click', () => this.batchUpdateSwitch());
        
        // Folder selection handler for browser environments
        this.ui.folderInput.addEventListener('change', (e) => this.handleFolderSelect(e));
    }

    // --- Data Management ---

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadData() {
        const rawInfo = this.ui.jsonInput.value.trim();
        if (!rawInfo) return;

        try {
            const parsedArray = JSON.parse(rawInfo);
            
            this.data = parsedArray.map(itemStr => {
                // Plugin parameters are often JSON strings inside JSON strings
                let item = typeof itemStr === 'string' ? JSON.parse(itemStr) : itemStr;
                
                // Parse nested FileList if string
                if (typeof item.FileList === 'string') {
                    const fileListArray = JSON.parse(item.FileList);
                    item.FileList = Array.isArray(fileListArray) ? fileListArray.map(f => {
                         return typeof f === 'string' ? JSON.parse(f) : f;
                    }) : [];
                } else if (!item.FileList) {
                    item.FileList = [];
                }
                
                // Assign internal ID
                item._id = this.generateId();
                return item;
            });

            this.selectedLayerIds.clear();
            this.rebuildLayerMap();
            
            // Reset filter
            this.filterActorId = null;
            this.ui.filterActorIdInput.value = '';
            this.ui.clearFilterBtn.style.display = 'none';

            this.render();
            console.log("Data loaded", this.data.length, "layers");
        } catch (e) {
            alert("Error parsing JSON. Check console.");
            console.error(e);
        }
    }

    rebuildLayerMap() {
        this.layerMap.clear();
        this.data.forEach(layer => this.layerMap.set(layer._id, layer));
    }

    exportData() {
        // Export logic: Convert internal state back to plugin format
        // We always export the full data set, preserving order
        
        const exportArray = this.data.map(layer => {
            const layerCopy = { ...layer };
            delete layerCopy._id; // Remove internal ID
            
            // Stringify FileList items first
            if (Array.isArray(layerCopy.FileList)) {
                const stringifiedFiles = layerCopy.FileList.map(f => JSON.stringify(f));
                layerCopy.FileList = JSON.stringify(stringifiedFiles);
            }
            
            return JSON.stringify(layerCopy);
        });
        
        this.ui.jsonInput.value = JSON.stringify(exportArray);
        alert('JSON updated in text area.');
    }

    copyToClipboard() {
        this.ui.jsonInput.select();
        document.execCommand('copy');
        alert("Copied to clipboard!");
    }

    // --- Filter Logic ---

    applyFilter() {
        const actorId = this.ui.filterActorIdInput.value.trim();
        if (!actorId) {
            alert('Please enter an Actor ID.');
            return;
        }
        this.filterActorId = actorId;
        this.ui.clearFilterBtn.style.display = 'inline-block';
        this.selectedLayerIds.clear();
        this.render();
    }

    clearFilter() {
        this.filterActorId = null;
        this.ui.filterActorIdInput.value = '';
        this.ui.clearFilterBtn.style.display = 'none';
        this.selectedLayerIds.clear();
        this.render();
    }

    getVisibleLayers() {
        if (this.filterActorId === null) {
            return this.data;
        }
        return this.data.filter(layer => layer.ActorId == this.filterActorId);
    }

    // --- Core Operations ---

    getLayerById(id) {
        return this.layerMap.get(id);
    }

    getLayerIndex(id) {
        return this.data.findIndex(l => l._id === id);
    }

    updateLayerProp(id, prop, value) {
        const layer = this.getLayerById(id);
        if (layer) {
            layer[prop] = value;
            // No strict need to re-render for input fields if they are bound correctly,
            // but for filtering consistency, maybe? 
            // In rendering, we bind 'change' events.
        }
    }

    updateFileProp(layerId, fileIndex, prop, value) {
        const layer = this.getLayerById(layerId);
        if (layer && layer.FileList[fileIndex]) {
            layer.FileList[fileIndex][prop] = value;
            if (prop === 'FileName') {
                this.render(); // Re-render to update preview
            }
        }
    }

    updateLayerVariableId(layerId, value) {
        const layer = this.getLayerById(layerId);
        if (layer && layer.FileList) {
            // Update ALL files in this layer to have the same Variable ID
            layer.FileList.forEach(file => {
                file.Variable = value;
            });
            // We might need to re-render if we want to be sure, 
            // but usually the input field that triggered this holds the value visually. 
            // However, since we don't store the ID on the layer itself, 
            // a re-render will fetch it from FileList[0].
            // Let's NOT re-render for performance, assuming the UI input persists.
            // Actually, if we add a new file it needs this value.
        }
    }

    addNewLayer() {
        const actorId = this.filterActorId !== null ? this.filterActorId : "1";
        const newLayer = {
            "ActorId": actorId,
            "Name": "New Layer",
            "Opacity": "255",
            "X": "0", "Y": "0",
            "ScaleX": "100", "ScaleY": "100",
            "OutOfShake": "false",
            "FileList": [],
            "ShowPictureSwitch": "0",
            "UnFocusSwitch": "0",
            "MirrorSwitch": "0",
            "TouchSwitch": "0",
            "_id": this.generateId()
        };
        
        this.data.push(newLayer);
        this.rebuildLayerMap();
        this.render();
    }

    deleteLayer(id) {
        if (!confirm("Delete layer?")) return;
        const index = this.getLayerIndex(id);
        if (index !== -1) {
            this.data.splice(index, 1);
            this.selectedLayerIds.delete(id);
            this.rebuildLayerMap();
            this.render();
        }
    }

    moveLayer(id, direction) {
        const index = this.getLayerIndex(id);
        if (index === -1) return;
        
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.data.length) return;
        
        // Swap
        [this.data[index], this.data[newIndex]] = [this.data[newIndex], this.data[index]];
        this.render();
    }

    addFile(layerId) {
        const layer = this.getLayerById(layerId);
        if (!layer) return;

        // inherit variable ID from existing files if possible
        let defaultVarId = "0";
        if (layer.FileList.length > 0) {
            defaultVarId = layer.FileList[0].Variable || "0";
        }

        const newFile = {
            "FileName": "",
            "HpUpperLimit": "0", "HpLowerLimit": "0",
            "Inputting": "false", "InputCommand": "", "InputSkillType": "1",
            "Action": "false", "Motion": "", "State": "0",
            "Weapon": "0", "Armor": "0", "Scene": "", "Note": "",
            "Message": "false", "Face": "false", "Speaker": "false",
            "Switch": "0", "Variable": defaultVarId, "VariableType": "0", "VariableOperand": "0",
            "Script": ""
        };
        layer.FileList.push(newFile);
        this.render();
    }

    deleteFile(layerId, fileIndex) {
        if (!confirm("Delete image?")) return;
        const layer = this.getLayerById(layerId);
        if (layer) {
            layer.FileList.splice(fileIndex, 1);
            this.render();
        }
    }

    moveFile(layerId, fileIndex, direction) {
        const layer = this.getLayerById(layerId);
        if (!layer) return;
        
        const list = layer.FileList;
        const newIndex = fileIndex + direction;
        if (newIndex < 0 || newIndex >= list.length) return;
        
        [list[fileIndex], list[newIndex]] = [list[newIndex], list[fileIndex]];
        this.render();
    }

    splitFileToNewLayer(layerId, fileIndex) {
        const layer = this.getLayerById(layerId);
        if (!layer) return;
        
        const fileItem = layer.FileList[fileIndex];
        
        // Create new layer as copy of parent
        const newLayer = JSON.parse(JSON.stringify(layer));
        newLayer._id = this.generateId();
        delete newLayer.FileList; // Clear files
        
        // Fix Name
        const fileName = fileItem.FileName || 'Split';
        const parts = fileName.split('/');
        const lastSegments = parts[parts.length - 1];
        newLayer.Name = (layer.Name ? `${layer.Name}_` : '') + lastSegments;
        
        newLayer.FileList = [JSON.parse(JSON.stringify(fileItem))];
        
        // Add to data array right after original layer? Or at end?
        // Editor usually appends, but inserting after is nicer? Let's append to keep simple.
        this.data.push(newLayer);
        this.rebuildLayerMap();
        
        // Remove file from old layer
        layer.FileList.splice(fileIndex, 1);
        
        this.render();
    }

    // --- Bulk Operations ---

    toggleLayerSelection(id, selected) {
        if (selected) this.selectedLayerIds.add(id);
        else this.selectedLayerIds.delete(id);
        this.updateBulkUI();
    }

    updateBulkUI() {
        const count = this.selectedLayerIds.size;
        this.ui.selectedCountSpan.textContent = count;
        this.ui.bulkActionsPanel.style.display = count > 0 ? 'flex' : 'none';
        
        // Highlight logic handled in render, but we need to toggle class on live elements if we don't re-render
        // Re-rendering is safest but costly. Let's stick to conditional re-render if needed, but for now simple re-render or class toggle.
        // Actually, render() is fast enough for <100 layers.
    }

    duplicateSelectedLayers() {
        if (this.selectedLayerIds.size === 0) return;
        
        const newLayers = [];
        this.selectedLayerIds.forEach(id => {
            const original = this.getLayerById(id);
            if (original) {
                const copy = JSON.parse(JSON.stringify(original));
                copy._id = this.generateId();
                copy.Name += ' (Copy)';
                // Unset selection for copy?
                newLayers.push(copy);
            }
        });
        
        this.data.push(...newLayers);
        this.rebuildLayerMap();
        this.render();
    }

    batchUpdateSwitch() {
        if (this.selectedLayerIds.size === 0) return;
        const val = this.ui.batchSwitchInput.value;
        const field = this.ui.batchSwitchType.value;
        if (val === '') return;

        let updated = false;
        this.selectedLayerIds.forEach(id => {
            const layer = this.getLayerById(id);
            if (layer) {
                layer[field] = val;
                updated = true;
            }
        });

        if (updated) {
            alert(`Updated properties for ${this.selectedLayerIds.size} layers.`);
            this.render();
        }
    }

    // --- Rendering ---

    render() {
        this.ui.editorContainer.innerHTML = '';
        this.updateBulkUI();
        
        const visibleLayers = this.getVisibleLayers();

        if (visibleLayers.length === 0) {
            this.ui.editorContainer.innerHTML = `
                <div style="text-align:center; grid-column: 1/-1; color: var(--text-muted); padding: 2rem;">
                    ${this.data.length > 0 ? 'No layers match filter.' : 'Load data to begin editing.'}
                </div>
            `;
            return;
        }

        const frag = document.createDocumentFragment();

        visibleLayers.forEach((layer, viewIndex) => {
            const indexInData = this.getLayerIndex(layer._id);
            const isFirst = indexInData === 0;
            const isLast = indexInData === this.data.length - 1;

            const card = document.createElement('div');
            card.className = 'layer-card';
            if (this.selectedLayerIds.has(layer._id)) {
                card.style.border = "2px solid #2563eb";
                card.style.backgroundColor = "#eff6ff";
            }

            // Header
            const header = document.createElement('div');
            header.className = 'layer-header';
            
            const headerLeft = document.createElement('div');
            headerLeft.style.cssText = "display:flex; align-items:center; gap:0.5rem;";
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cssText = "width: 18px; height: 18px; cursor: pointer;";
            checkbox.checked = this.selectedLayerIds.has(layer._id);
            checkbox.addEventListener('change', (e) => {
                this.toggleLayerSelection(layer._id, e.target.checked);
                this.render(); // Re-render to show selection highlight
            });
            
            const title = document.createElement('h3');
            title.textContent = `Layer ${indexInData + 1}: ${layer.Name || 'Unnamed'} (Actor ID: ${layer.ActorId})`;
            
            headerLeft.appendChild(checkbox);
            headerLeft.appendChild(title);
            
            const headerRight = document.createElement('div');
            
            const upBtn = this.createBtn('↑', () => this.moveLayer(layer._id, -1), isFirst);
            const downBtn = this.createBtn('↓', () => this.moveLayer(layer._id, 1), isLast);
            const delBtn = this.createBtn('Delete Layer', () => this.deleteLayer(layer._id));
            
            headerRight.append(upBtn, downBtn, delBtn);
            header.append(headerLeft, headerRight);
            card.appendChild(header);

            // Content
            const content = document.createElement('div');
            content.className = 'layer-content';

            // Fields
            content.appendChild(this.createInputGroup('Layer Name', 'text', layer.Name || '', v => this.updateLayerProp(layer._id, 'Name', v)));
            
            // Layer Level Variable ID (Derived from first file or default 0)
            const currentVarId = (layer.FileList && layer.FileList.length > 0) ? layer.FileList[0].Variable : "0";
            
            const metaGrid = document.createElement('div');
            metaGrid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;";
            metaGrid.appendChild(this.createInputGroup('Actor ID', 'number', layer.ActorId || 1, v => this.updateLayerProp(layer._id, 'ActorId', v)));
            metaGrid.appendChild(this.createInputGroup('Variable ID (Layer)', 'number', currentVarId, v => this.updateLayerVariableId(layer._id, v)));
            content.appendChild(metaGrid);
            
            const grid = document.createElement('div');
            grid.style.cssText = "display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;";
            grid.appendChild(this.createInputGroup('Layer Switch', 'number', layer.ShowPictureSwitch, v => this.updateLayerProp(layer._id, 'ShowPictureSwitch', v)));
            grid.appendChild(this.createInputGroup('Unfocus Switch', 'number', layer.UnFocusSwitch, v => this.updateLayerProp(layer._id, 'UnFocusSwitch', v)));
            grid.appendChild(this.createInputGroup('Invert Switch', 'number', layer.MirrorSwitch, v => this.updateLayerProp(layer._id, 'MirrorSwitch', v)));
            content.appendChild(grid);

            // Files List
            const filesHeader = document.createElement('h4');
            filesHeader.textContent = 'Images (FileList)';
            content.appendChild(filesHeader);
            
            const fileListContainer = document.createElement('div');
            fileListContainer.className = 'scroll-container file-list';
            
            if (layer.FileList && Array.isArray(layer.FileList)) {
                layer.FileList.forEach((file, fIndex) => {
                    fileListContainer.appendChild(this.createFileElement(layer, fIndex, file));
                });
            }
            content.appendChild(fileListContainer);

            // Add File Button
            const addFileBtn = this.createBtn('+ Add Image', () => this.addFile(layer._id));
            content.appendChild(addFileBtn);

            card.appendChild(content);
            frag.appendChild(card);
        });

        this.ui.editorContainer.appendChild(frag);
    }

    createBtn(text, onClick, disabled = false) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = text;
        btn.disabled = disabled;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return btn;
    }

    createInputGroup(label, type, value, onChange) {
        const group = document.createElement('div');
        group.className = 'input-group';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const inp = document.createElement('input');
        inp.type = type;
        inp.value = value !== undefined ? value : (type === 'number' ? 0 : '');
        inp.addEventListener('change', (e) => onChange(e.target.value));
        group.append(lbl, inp);
        return group;
    }

    createSelectGroup(label, options, value, onChange) {
        const group = document.createElement('div');
        group.className = 'input-group';
        const lbl = document.createElement('label');
        lbl.textContent = label;
        const sel = document.createElement('select');
        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.v;
            o.textContent = opt.l;
            if (String(opt.v) === String(value)) o.selected = true;
            sel.appendChild(o);
        });
        sel.addEventListener('change', (e) => onChange(e.target.value));
        group.append(lbl, sel);
        return group;
    }

    createFileElement(layer, fileIndex, file) {
        const el = document.createElement('div');
        el.className = 'file-item';
        
        const imgSrc = file.FileName ? `img/pictures/${file.FileName}.png` : '';
        const img = document.createElement('img');
        img.className = 'preview-thumb';
        img.src = imgSrc;
        img.onerror = () => { img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjNlbSIgZmlsbD0iIzU1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TUhDwvdleHQ+PC9zdmc+'; };
        
        const details = document.createElement('div');
        details.className = 'file-details';
        
        // Row 1: File Name
        details.appendChild(this.createInputGroup('File Name', 'text', file.FileName, v => this.updateFileProp(layer._id, fileIndex, 'FileName', v)));
        
        // Row 2: Grid
        const grid = document.createElement('div');
        grid.className = 'file-row';
        grid.style.cssText = "display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; align-items: end;";
        
        // Removed Variable ID from here, added Value and Comparison
        grid.appendChild(this.createInputGroup('Switch ID', 'number', file.Switch, v => this.updateFileProp(layer._id, fileIndex, 'Switch', v)));
        
        // Variable Comparison Method
        const varTypes = [
            {v:'0', l:'= (Eq)'}, {v:'1', l:'>= (>=)'}, {v:'2', l:'<= (<=)'},
            {v:'3', l:'> (>)'}, {v:'4', l:'< (<)'}, {v:'5', l:'!= (Ne)'}
        ];
        grid.appendChild(this.createSelectGroup('Var Comp', varTypes, file.VariableType || '0', v => this.updateFileProp(layer._id, fileIndex, 'VariableType', v)));
        
        // Variable Value (Operand)
        grid.appendChild(this.createInputGroup('Var Value', 'number', file.VariableOperand || '0', v => this.updateFileProp(layer._id, fileIndex, 'VariableOperand', v)));

        grid.appendChild(this.createInputGroup('Armor ID', 'number', file.Armor, v => this.updateFileProp(layer._id, fileIndex, 'Armor', v)));
        details.appendChild(grid);
        
        // Row 3: Note
        details.appendChild(this.createInputGroup('Memo (Note)', 'text', file.Note, v => this.updateFileProp(layer._id, fileIndex, 'Note', v)));
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'file-row';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '0.5rem';
        
        const fUp = this.createBtn('↑', () => this.moveFile(layer._id, fileIndex, -1), fileIndex === 0);
        const fDown = this.createBtn('↓', () => this.moveFile(layer._id, fileIndex, 1), fileIndex === layer.FileList.length - 1);
        const fDel = this.createBtn('Delete', () => this.deleteFile(layer._id, fileIndex));
        fDel.classList.add('btn-danger'); // Add red style
        
        const fSplit = this.createBtn('Move to New Layer ↗', () => this.splitFileToNewLayer(layer._id, fileIndex));
        fSplit.style.background = '#2563eb';
        fSplit.style.color = 'white';
        fSplit.style.border = 'none';

        actions.append(fUp, fDown, document.createTextNode('\u00A0'), fDel, fSplit);
        details.appendChild(actions);
        
        el.append(img, details);
        return el;
    }

    // --- Image Browser ---
    
    scanImages() {
        // Try to use Node.js fs if available (NW.js environment)
        if (typeof require !== 'undefined') {
            try {
                const fs = require('fs');
                const path = require('path');
                // Assume standard RPG Maker project structure: current dir -> img/pictures
                const picDir = path.join(process.cwd(), 'img', 'pictures');
                
                if (fs.existsSync(picDir)) {
                    const files = this._walkDir(picDir);
                    this.availableImages = files
                        .filter(f => f.toLowerCase().endsWith('.png'))
                        .map(f => {
                            // Get relative path from picDir
                            let rel = path.relative(picDir, f);
                            // Normalize separators to forward slashes
                            rel = rel.replace(/\\/g, '/');
                            // Remove extension
                            return rel.replace(/\.png$/i, '');
                        });
                    this.renderImageBrowser();
                    this.ui.imageBrowserPanel.style.display = 'block';
                    alert(`Scanned ${this.availableImages.length} images from local folder.`);
                    return;
                }
            } catch (e) {
                console.error("Auto scan failed:", e);
            }
        }

        // Fallback or explicit request: Ask user to select folder
        // Using hidden input
        alert("Please select your 'img/pictures' folder.");
        this.ui.folderInput.click();
    }

    handleFolderSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.availableImages = files
            .filter(f => f.name.toLowerCase().endsWith('.png'))
            .map(f => {
                // webkitRelativePath is usually "FolderName/sub/file.png"
                // We want path relative to the selected root.
                const pathParts = f.webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    pathParts.shift(); // Remove the top folder name (e.g. "pictures")
                    return pathParts.join('/').replace(/\.png$/i, '');
                }
                return f.name.replace(/\.png$/i, '');
            });
            
        this.renderImageBrowser();
        this.ui.imageBrowserPanel.style.display = 'block';
        alert(`Loaded ${this.availableImages.length} images.`);
        
        // Reset input so change event fires again if same folder selected
        this.ui.folderInput.value = ''; 
    }

    _walkDir(dir) {
        const fs = require('fs');
        const path = require('path');
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(this._walkDir(file));
            } else {
                results.push(file);
            }
        });
        return results;
    }

    renderImageBrowser() {
        this.ui.imageBrowserContent.innerHTML = '';
        if (this.availableImages.length === 0) {
            this.ui.imageBrowserContent.innerHTML = '<p>No images found...</p>';
            this.ui.addSelectedToLayerBtn.disabled = true;
            this.ui.addSelectedToLayerBtn.textContent = 'Add Selected (0)';
            return;
        }

        this.availableImages.forEach(path => {
            const card = document.createElement('div');
            card.className = 'image-card' + (this.selectedImages.has(path) ? ' selected' : '');
            
            const img = document.createElement('img');
            img.src = `img/pictures/${path}.png`;
            img.onerror = () => { img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PC9zdmc+'; };
            
            const name = document.createElement('div');
            name.className = 'image-card-name';
            name.textContent = path;
            
            card.append(img, name);
            card.addEventListener('click', () => {
                if(this.selectedImages.has(path)) this.selectedImages.delete(path);
                else this.selectedImages.add(path);
                this.renderImageBrowser();
            });
            
            this.ui.imageBrowserContent.appendChild(card);
        });
        
        this.ui.addSelectedToLayerBtn.disabled = this.selectedImages.size === 0;
        this.ui.addSelectedToLayerBtn.textContent = `Add Selected to Layer (${this.selectedImages.size})`;
    }

    toggleImageBrowser() {
        const panel = this.ui.imageBrowserPanel;
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
        this.ui.toggleBrowserBtn.textContent = isHidden ? 'Hide' : 'Show';
    }

    addSelectedImagesToLayer() {
        if (this.selectedImages.size === 0) return;
        
        const layerOptions = this.data.map((l, i) => `${i+1}: ${l.Name || 'Unnamed'}`).join('\n');
        const msg = this.data.length > 0 
            ? `Select layer number to add to:\n${layerOptions}\n\n(Leave empty to create NEW layer)` 
            : `Create new layer? (Enter/OK)`;
        
        const input = prompt(msg);
        if (input === null) return;
        
        let targetId = null;
        const trimmed = input.trim().toLowerCase();
        
        if (trimmed === '' || trimmed === 'n' || trimmed === 'new') {
            this.addNewLayer(); // Adds to end
            targetId = this.data[this.data.length - 1]._id;
        } else {
            const index = parseInt(trimmed) - 1;
            if (index >= 0 && index < this.data.length) {
                targetId = this.data[index]._id;
            } else {
                alert('Invalid layer.');
                return;
            }
        }
        
        const layer = this.getLayerById(targetId);
        if (layer) {
            this.selectedImages.forEach(path => {
                const newFile = {
                    "FileName": path,
                    "HpUpperLimit": "0", "HpLowerLimit": "0",
                    "Inputting": "false", "InputCommand": "", "InputSkillType": "1",
                    "Action": "false", "Motion": "", "State": "0",
                    "Weapon": "0", "Armor": "0", "Scene": "", "Note": "",
                    "Message": "false", "Face": "false", "Speaker": "false",
                    "Switch": "0", "Variable": "0", "VariableType": "0", "VariableOperand": "0",
                    "Script": ""
                };
                layer.FileList.push(newFile);
            });
            this.selectedImages.clear();
            this.renderImageBrowser();
            this.render();
            alert(`Added to layer.`);
        }
    }
}

const app = new Editor();
window.app = app;
