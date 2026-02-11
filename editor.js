

class App {
    constructor() {
        this.data = []; // The main PictureList array
        this.fullData = []; // Store unfiltered data
        this.filterActorId = null; // Current filter value
        this.selectedLayerIds = new Set();
        this.availableImages = []; // List of all images in img/pictures
        this.selectedImages = new Set(); // Currently selected images in browser
        this.currentEditingLayer = null; // Layer index to add images to
        this.init();
    }

    init() {
        // Elements
        this.jsonInput = document.getElementById('jsonInput');
        this.loadBtn = document.getElementById('loadBtn');
        this.addLayerBtn = document.getElementById('addLayerBtn');
        this.scanImagesBtn = document.getElementById('scanImagesBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.editorContainer = document.getElementById('editorContainer');
        this.copyBtn = document.getElementById('copyBtn');
        
        // Filter Elements
        this.filterActorIdInput = document.getElementById('filterActorIdInput');
        this.applyFilterBtn = document.getElementById('applyFilterBtn');
        this.clearFilterBtn = document.getElementById('clearFilterBtn');
        
        // Image Browser Elements
        this.imageBrowserPanel = document.getElementById('imageBrowserPanel');
        this.imageBrowserContent = document.getElementById('imageBrowserContent');
        this.toggleBrowserBtn = document.getElementById('toggleBrowserBtn');
        
        // Bulk Actions Elements
        this.bulkActionsPanel = document.getElementById('bulkActionsPanel');
        this.selectedCountSpan = document.getElementById('selectedCount');
        this.duplicateSelectedBtn = document.getElementById('duplicateSelectedBtn');
        this.batchSwitchInput = document.getElementById('batchSwitchInput');
        this.batchSwitchType = document.getElementById('batchSwitchType');
        this.applyBatchSwitchBtn = document.getElementById('applyBatchSwitchBtn');
        this.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        
        this.addSelectedToLayerBtn = document.getElementById('addSelectedToLayerBtn');
        this.clearBrowserSelectionBtn = document.getElementById('clearBrowserSelectionBtn');

        // Bind Events
        this.loadBtn.addEventListener('click', () => this.loadData());
        this.addLayerBtn.addEventListener('click', () => this.addLayer());
        this.scanImagesBtn.addEventListener('click', () => this.scanImages());
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.toggleBrowserBtn.addEventListener('click', () => this.toggleImageBrowser());
        
        this.applyFilterBtn.addEventListener('click', () => this.applyFilter());
        this.clearFilterBtn.addEventListener('click', () => this.clearFilter());
        
        this.duplicateSelectedBtn.addEventListener('click', () => this.duplicateSelectedLayers());
        this.applyBatchSwitchBtn.addEventListener('click', () => this.batchUpdateSwitch());
        this.clearSelectionBtn.addEventListener('click', () => { this.selectedLayerIds.clear(); this.render(); });
        
        this.addSelectedToLayerBtn.addEventListener('click', () => this.addSelectedImagesToLayer());
        this.clearBrowserSelectionBtn.addEventListener('click', () => { this.selectedImages.clear(); this.renderImageBrowser(); });

        // Initial Load Attempt from Textarea
        if (this.jsonInput.value.trim()) {
            this.loadData();
        }
    }

    loadData() {
        const rawInfo = this.jsonInput.value.trim();
        if (!rawInfo) return;

        try {
            let parsedArray = JSON.parse(rawInfo);
            
            this.fullData = parsedArray.map((itemStr, index) => {
                let item = JSON.parse(itemStr);
                
                if (typeof item.FileList === 'string') {
                    const fileListArray = JSON.parse(item.FileList);
                    if (Array.isArray(fileListArray)) {
                        item.FileList = fileListArray.map(fileStr => {
                            if (typeof fileStr === 'string') {
                                return JSON.parse(fileStr);
                            }
                            return fileStr; 
                        });
                    } else {
                        item.FileList = [];
                    }
                } else if (!item.FileList) {
                    item.FileList = [];
                }
                
                item._id = Date.now() + Math.random() + index;
                return item;
            });

            // Reset filter when loading new data
            this.data = this.fullData;
            this.filterActorId = null;
            this.filterActorIdInput.value = '';
            this.clearFilterBtn.style.display = 'none';
            this.selectedLayerIds.clear();
            this.render();
            console.log("Data loaded", this.data);
        } catch (e) {
            alert("Error parsing JSON. Check console for details.");
            console.error(e);
        }
    }

    exportData() {
        // Always export fullData, not filtered data
        const dataToExport = this.filterActorId !== null ? this.fullData : this.data;
        
        const exportArray = dataToExport.map(item => {
            const cleanItem = { ...item };
            delete cleanItem._id; 
            
            if (Array.isArray(cleanItem.FileList)) {
                const stringifiedFiles = cleanItem.FileList.map(f => JSON.stringify(f));
                cleanItem.FileList = JSON.stringify(stringifiedFiles);
            }
            
            return JSON.stringify(cleanItem);
        });
        
        const output = JSON.stringify(exportArray);
        this.jsonInput.value = output;
        
        if (this.filterActorId !== null) {
            alert('Exported complete data (filter was not applied to export)');
        }
    }

    copyToClipboard() {
        this.jsonInput.select();
        document.execCommand('copy');
        alert("Copied to clipboard!");
    }

    render() {
        this.editorContainer.innerHTML = '';
        this.updateBulkUI();

        this.data.forEach((layer, layerIndex) => {
            const card = document.createElement('div');
            card.className = 'layer-card';
            // Highlight selected card
            if (this.selectedLayerIds.has(layer._id)) {
                card.style.border = "2px solid #2563eb";
                card.style.backgroundColor = "#eff6ff";
            }
            
            card.innerHTML = `
                <div class="layer-header">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <input type="checkbox" 
                            style="width: 18px; height: 18px; cursor: pointer;"
                            ${this.selectedLayerIds.has(layer._id) ? 'checked' : ''} 
                            onchange="app.toggleLayerSelection(${layerIndex}, this.checked)">
                        <h3>Layer ${layerIndex + 1}: ${layer.Name || 'Unnamed'} (Actor ID: ${layer.ActorId})</h3>
                    </div>
                    <div>
                         <button class="btn btn-secondary" onclick="app.moveLayerUp(${layerIndex})" ${layerIndex === 0 ? 'disabled' : ''}>↑</button>
                         <button class="btn btn-secondary" onclick="app.moveLayerDown(${layerIndex})" ${layerIndex === this.data.length - 1 ? 'disabled' : ''}>↓</button>
                         <button class="btn btn-secondary" onclick="app.removeLayer(${layerIndex})">Delete Layer</button>
                    </div>
                </div>
                <div class="layer-content">
                    <div class="input-group">
                        <label>Layer Name</label>
                        <input type="text" value="${layer.Name || ''}" onchange="app.updateLayer(${layerIndex}, 'Name', this.value)">
                    </div>
                    
                    <div class="input-group">
                        <label>Actor ID</label>
                        <input type="number" value="${layer.ActorId || 1}" onchange="app.updateLayer(${layerIndex}, 'ActorId', this.value)">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                        <div class="input-group">
                            <label>Layer Switch</label>
                            <input type="number" value="${layer.ShowPictureSwitch || 0}" onchange="app.updateLayer(${layerIndex}, 'ShowPictureSwitch', this.value)">
                        </div>
                        <div class="input-group">
                            <label>Unfocus Switch</label>
                            <input type="number" value="${layer.UnFocusSwitch || 0}" onchange="app.updateLayer(${layerIndex}, 'UnFocusSwitch', this.value)">
                        </div>
                        <div class="input-group">
                            <label>Invert Switch</label>
                            <input type="number" value="${layer.MirrorSwitch || 0}" onchange="app.updateLayer(${layerIndex}, 'MirrorSwitch', this.value)">
                        </div>
                    </div>

                    <h4>Images (FileList)</h4>
                    <div class="scroll-container file-list" id="file-list-${layerIndex}">
                    </div>
                    <button class="btn btn-secondary" onclick="app.addFileItem(${layerIndex})">+ Add Image</button>
                </div>
            `;

            const fileListContainer = card.querySelector(`#file-list-${layerIndex}`);
            
            if (layer.FileList && Array.isArray(layer.FileList)) {
                layer.FileList.forEach((file, fileIndex) => {
                    const fileEl = this.createFileItemElement(file, layerIndex, fileIndex);
                    fileListContainer.appendChild(fileEl);
                });
            }

            this.editorContainer.appendChild(card);
        });
    }

    createFileItemElement(file, layerIndex, fileIndex) {
        const el = document.createElement('div');
        el.className = 'file-item';

        let imgSrc = '';
        if (file.FileName) {
            imgSrc = `img/pictures/${file.FileName}.png`;
        }

        el.innerHTML = `
            <img src="${imgSrc}" class="preview-thumb" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjNlbSIgZmlsbD0iIzU1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TUhDwvdleHQ+PC9zdmc+'">
            <div class="file-details">
                <div class="file-row">
                    <div class="input-group">
                        <label>File Name</label>
                        <input type="text" value="${file.FileName || ''}" onchange="app.updateFile(${layerIndex}, ${fileIndex}, 'FileName', this.value)">
                    </div>
                </div>
                <div class="file-row">
                    <div class="input-group">
                        <label>Switch ID</label>
                        <input type="number" value="${file.Switch || 0}" onchange="app.updateFile(${layerIndex}, ${fileIndex}, 'Switch', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Variable ID</label>
                        <input type="number" value="${file.Variable || 0}" onchange="app.updateFile(${layerIndex}, ${fileIndex}, 'Variable', this.value)">
                    </div>
                    <div class="input-group">
                        <label>Armor ID</label>
                        <input type="number" value="${file.Armor || 0}" onchange="app.updateFile(${layerIndex}, ${fileIndex}, 'Armor', this.value)">
                    </div>
                </div>
                <div class="file-row">
                    <div class="input-group">
                        <label>Memo (Note)</label>
                        <input type="text" value="${file.Note || ''}" onchange="app.updateFile(${layerIndex}, ${fileIndex}, 'Note', this.value)">
                    </div>
                </div>
                
                <div class="file-row" style="justify-content: flex-end; gap: 0.5rem;">
                     <!-- Move Buttons -->
                     <button class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="app.moveFileUp(${layerIndex}, ${fileIndex})" ${fileIndex === 0 ? 'disabled' : ''}>↑</button>
                     <button class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.8rem;" onclick="app.moveFileDown(${layerIndex}, ${fileIndex})" ${fileIndex === this.data[layerIndex].FileList.length - 1 ? 'disabled' : ''}>↓</button>
                     <div style="width: 10px; display:inline-block"></div>
                     <button class="btn btn-secondary btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;" onclick="app.removeFile(${layerIndex}, ${fileIndex})">Delete</button>
                     <button class="btn btn-secondary split-btn" style="background:#2563eb; border:none; color:white; width:auto;" onclick="app.splitToNewLayer(${layerIndex}, ${fileIndex})">Move to New Layer ↗</button>
                </div>
            </div>
        `;
        return el;
    }

    updateLayer(layerIndex, field, value) {
        this.data[layerIndex][field] = value;
        
        // If filter is active, also update fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                this.fullData[fullDataIndex][field] = value;
            }
        }
    }

    updateFile(layerIndex, fileIndex, field, value) {
        this.data[layerIndex].FileList[fileIndex][field] = value;
        
        // If filter is active, also update fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                this.fullData[fullDataIndex].FileList[fileIndex][field] = value;
            }
        }
        
        if (field === 'FileName') {
             this.render(); 
        }
    }

    moveFileUp(layerIndex, fileIndex) {
        if (fileIndex <= 0) return;
        const list = this.data[layerIndex].FileList;
        [list[fileIndex - 1], list[fileIndex]] = [list[fileIndex], list[fileIndex - 1]];
        
        // Sync with fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                const fullList = this.fullData[fullDataIndex].FileList;
                [fullList[fileIndex - 1], fullList[fileIndex]] = [fullList[fileIndex], fullList[fileIndex - 1]];
            }
        }
        
        this.render();
    }

    moveFileDown(layerIndex, fileIndex) {
        const list = this.data[layerIndex].FileList;
        if (fileIndex >= list.length - 1) return;
        [list[fileIndex + 1], list[fileIndex]] = [list[fileIndex], list[fileIndex + 1]];
        
        // Sync with fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                const fullList = this.fullData[fullDataIndex].FileList;
                [fullList[fileIndex + 1], fullList[fileIndex]] = [fullList[fileIndex], fullList[fileIndex + 1]];
            }
        }
        
        this.render();
    }

    moveLayerUp(layerIndex) {
        if (layerIndex <= 0) return;
        [this.data[layerIndex - 1], this.data[layerIndex]] = [this.data[layerIndex], this.data[layerIndex - 1]];
        this.render();
    }

    moveLayerDown(layerIndex) {
        if (layerIndex >= this.data.length - 1) return;
        [this.data[layerIndex + 1], this.data[layerIndex]] = [this.data[layerIndex], this.data[layerIndex + 1]];
        this.render();
    }

    addFileItem(layerIndex) {
        const newFile = {
            "FileName": "",
            "HpUpperLimit": "0", "HpLowerLimit": "0",
            "Inputting": "false", "InputCommand": "", "InputSkillType": "1",
            "Action": "false", "Motion": "", "State": "0",
            "Weapon": "0", "Armor": "0", "Scene": "", "Note": "",
            "Message": "false", "Face": "false", "Speaker": "false",
            "Switch": "0", "Variable": "0", "VariableType": "0", "VariableOperand": "0",
            "Script": ""
        };
        this.data[layerIndex].FileList.push(newFile);
        
        // Sync with fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                this.fullData[fullDataIndex].FileList.push(JSON.parse(JSON.stringify(newFile)));
            }
        }
        
        this.render();
    }

    removeFile(layerIndex, fileIndex) {
        if (!confirm("Remove this image?")) return;
        this.data[layerIndex].FileList.splice(fileIndex, 1);
        
        // Sync with fullData
        if (this.filterActorId !== null) {
            const layerId = this.data[layerIndex]._id;
            const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
            if (fullDataIndex !== -1) {
                this.fullData[fullDataIndex].FileList.splice(fileIndex, 1);
            }
        }
        
        this.render();
    }

    removeLayer(layerIndex) {
        if (!confirm("Remove this entire layer and all its images?")) return;
        const layer = this.data[layerIndex];
        this.selectedLayerIds.delete(layer._id);
        
        // Remove from both data and fullData
        const layerId = layer._id;
        this.data.splice(layerIndex, 1);
        
        const fullDataIndex = this.fullData.findIndex(l => l._id === layerId);
        if (fullDataIndex !== -1) {
            this.fullData.splice(fullDataIndex, 1);
        }
        
        this.render();
    }

    splitToNewLayer(layerIndex, fileIndex) {
        const parentLayer = JSON.parse(JSON.stringify(this.data[layerIndex]));
        const fileItem = this.data[layerIndex].FileList[fileIndex];

        const newLayer = { ...parentLayer };
        newLayer._id = Date.now() + Math.random(); 
        
        let fileName = fileItem.FileName || 'Split';
        const parts = fileName.split('/');
        const lastSegment = parts[parts.length - 1];
        
        const oldName = newLayer.Name || '';
        newLayer.Name = oldName ? `${oldName}_${lastSegment}` : lastSegment;

        newLayer.FileList = [ JSON.parse(JSON.stringify(fileItem)) ];

        this.fullData.push(newLayer);
        if (this.filterActorId !== null) {
            this.data.push(newLayer);
        }

        this.data[layerIndex].FileList.splice(fileIndex, 1);
        this.render();
    }

    addLayer() {
        // Use filter ID if active, otherwise default to "1"
        const targetActorId = this.filterActorId !== null ? this.filterActorId : "1";

        const newLayer = {
            "ActorId": targetActorId,
            "Name": "New Layer",
            "Opacity": "255",
            "X": "0", "Y": "0",
            "ScaleX": "100", "ScaleY": "100",
            "OutOfShake": "false",
            "FileList": [],
            "ShowPictureSwitch": "0",
            "UnFocusSwitch": "0",
            "MirrorSwitch": "0",
            "TouchSwitch": "0"
        };
        newLayer._id = Date.now() + Math.random();
        
        // Add to fullData always
        // Note: If no filter is active, this.data === this.fullData, so pushing to fullData adds it to data as well.
        this.fullData.push(newLayer);
        
        // If a filter is active, this.data is a separate filtered array.
        // We set the ActorId to match the filter, so we should add it to the current view as well.
        if (this.filterActorId !== null) {
            this.data.push(newLayer);
        }
        
        this.render();
    }

    // --- Bulk Operations ---

    toggleLayerSelection(layerIndex, isChecked) {
        const layer = this.data[layerIndex];
        if (isChecked) {
            this.selectedLayerIds.add(layer._id);
        } else {
            this.selectedLayerIds.delete(layer._id);
        }
        this.render();
    }

    updateBulkUI() {
        const count = this.selectedLayerIds.size;
        this.selectedCountSpan.textContent = count;
        if (count > 0) {
            this.bulkActionsPanel.style.display = 'flex';
            this.bulkActionsPanel.style.alignItems = 'center';
        } else {
            this.bulkActionsPanel.style.display = 'none';
        }
    }

    duplicateSelectedLayers() {
        if (this.selectedLayerIds.size === 0) return;
        
        // We iterate backwards or creating a new array to avoid concurrent modification issues,
        // but since we insert into this.data, the indices shift.
        // Easiest is to build a list of insertions and execute.
        
        const newLayers = [];
        
        // Map current indices to preserve order logic?
        // Let's iterate over current data and check if selected.
        
        const newData = [];
        
        this.data.forEach(layer => {
            newData.push(layer);
            if (this.selectedLayerIds.has(layer._id)) {
                // Create duplicate
                const copy = JSON.parse(JSON.stringify(layer));
                copy._id = Date.now() + Math.random(); // New ID
                copy.Name = (copy.Name || '') + ' (Copy)';
                newData.push(copy);
                
                // Note: user might want the copy to be selected? Or keep original selected?
                // Standard behavior: selection often follows the new item or stays on old. 
                // Let's keep selection on the *original* items for now or clear selection.
                // It's less confusing if we don't auto-select copies immediately unless requested.
            }
        });
        
        this.data = newData;
        this.render();
    }

    batchUpdateSwitch() {
        if (this.selectedLayerIds.size === 0) return;
        const val = this.batchSwitchInput.value;
        const field = this.batchSwitchType.value;
        
        if (val === '') return;
        
        let updated = false;
        this.data.forEach(layer => {
            if (this.selectedLayerIds.has(layer._id)) {
                layer[field] = val;
                updated = true;
            }
        });
        
        if (updated) {
            const map = {
                'ShowPictureSwitch': 'Layer Switch',
                'UnFocusSwitch': 'Unfocus Switch',
                'MirrorSwitch': 'Invert Switch',
                'ActorId': 'Actor ID'
            };
            alert(`Updated ${map[field]} for ${this.selectedLayerIds.size} layers.`);
            this.render();
        }
    }

    // --- Image Browser Methods ---

    async scanImages() {
        // Hardcoded list based on the file structure
        // In a real scenario, you'd use File System Access API or server-side scanning
        const imageList = [
            'child/body.png',
            'child/cloth/pajama.png',
            'child/cloth/pajama_pink.png',
            'child/cloth/underwear.png',
            'child/cloth/uniform.png',
            'child/misaki/back_hair.png',
            'child/misaki/emotion/joy.png',
            'child/misaki/emotion/niya.png',
            'child/misaki/emotion/noEmote.png',
            'child/misaki/emotion/notHappy.png',
            'child/misaki/emotion/smallSmile.png',
            'child/misaki/emotion/smile.png',
            'child/misaki/emotion/surprise.png',
            'child/misaki/front_hair.png',
            'child/yuna/back_hair.png',
            'child/yuna/emotion/face_shadow.png',
            'child/yuna/emotion/joy.png',
            'child/yuna/emotion/niya.png',
            'child/yuna/emotion/noEmote.png',
            'child/yuna/emotion/notHappy.png',
            'child/yuna/emotion/red.png',
            'child/yuna/emotion/smallSmile.png',
            'child/yuna/emotion/surprise.png',
            'child/yuna/front_hair.png',
            'hikari/dark_satisfy.png',
            'hikari/niya.png',
            'hikari/normal.png',
            'hikari/surprise.png',
            'onne/normal.png',
            'onne/shy.png'
        ];

        // Remove .png extension for storage (as the plugin uses names without extension)
        this.availableImages = imageList.map(path => path.replace('.png', ''));
        
        this.renderImageBrowser();
        this.imageBrowserPanel.style.display = 'block';
    }

    renderImageBrowser() {
        this.imageBrowserContent.innerHTML = '';
        
        if (this.availableImages.length === 0) {
            this.imageBrowserContent.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1/-1;">No images found. Click "Scan Images" to load.</p>';
            this.addSelectedToLayerBtn.disabled = true;
            this.addSelectedToLayerBtn.textContent = 'Add Selected to Layer (0)';
            return;
        }

        this.availableImages.forEach((imagePath) => {
            const card = document.createElement('div');
            card.className = 'image-card';
            if (this.selectedImages.has(imagePath)) {
                card.classList.add('selected');
            }

            const img = document.createElement('img');
            img.src = `img/pictures/${imagePath}.png`;
            img.alt = imagePath;
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGR5PSIuM2VtIiBmaWxsPSIjNTU1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5OL0E8L3RleHQ+PC9zdmc+';
            };

            const name = document.createElement('div');
            name.className = 'image-card-name';
            name.textContent = imagePath; 
            name.title = imagePath;

            card.appendChild(img);
            card.appendChild(name);

            card.addEventListener('click', () => {
                if (this.selectedImages.has(imagePath)) {
                    this.selectedImages.delete(imagePath);
                } else {
                    this.selectedImages.add(imagePath);
                }
                this.renderImageBrowser();
            });

            this.imageBrowserContent.appendChild(card);
        });

        // Update static buttons
        this.addSelectedToLayerBtn.disabled = this.selectedImages.size === 0;
        this.addSelectedToLayerBtn.textContent = `Add Selected to Layer (${this.selectedImages.size})`;
    }

    addSelectedImagesToLayer() {
        if (this.selectedImages.size === 0) {
            alert('Please select at least one image.');
            return;
        }

        const layerOptions = this.data.map((layer, idx) => 
            `${idx + 1}: ${layer.Name || 'Unnamed'} (Actor ${layer.ActorId})`
        ).join('\n');
        
        const msg = this.data.length > 0
            ? `Select layer to add images to:\n${layerOptions}\n\nEnter layer number OR leave empty to create a new layer:`
            : `No layers found.\n\nLeave empty to create a new layer and add images to it.`;

        const layerIndexStr = prompt(msg);
        
        if (layerIndexStr === null) return; // User cancelled
        
        let targetLayerIndex = -1;
        const input = layerIndexStr.trim().toLowerCase();

        if (input === '' || input === 'n' || input === 'new') {
            this.addLayer(); // Adds to end and renders
            targetLayerIndex = this.data.length - 1;
        } else {
            const parsed = parseInt(input);
            if (isNaN(parsed) || parsed < 1 || parsed > this.data.length) {
                alert('Invalid layer number.');
                return;
            }
            targetLayerIndex = parsed - 1;
        }

        // Add each selected image to the layer
        this.selectedImages.forEach(imagePath => {
            const newFile = {
                "FileName": imagePath,
                "HpUpperLimit": "0", "HpLowerLimit": "0",
                "Inputting": "false", "InputCommand": "", "InputSkillType": "1",
                "Action": "false", "Motion": "", "State": "0",
                "Weapon": "0", "Armor": "0", "Scene": "", "Note": "",
                "Message": "false", "Face": "false", "Speaker": "false",
                "Switch": "0", "Variable": "0", "VariableType": "0", "VariableOperand": "0",
                "Script": ""
            };
            this.data[targetLayerIndex].FileList.push(newFile);
            
            // Sync with fullData is redundant because this.data elements are references to this.fullData elements.
            // Pushing to this.data[i].FileList modifies the same object.
        });

        alert(`Added ${this.selectedImages.size} image(s) to layer ${targetLayerIndex + 1}.`);
        this.selectedImages.clear();
        this.renderImageBrowser();
        this.render();
    }

    toggleImageBrowser() {
        if (this.imageBrowserPanel.style.display === 'none') {
            this.imageBrowserPanel.style.display = 'block';
            this.toggleBrowserBtn.textContent = 'Hide';
        } else {
            this.imageBrowserPanel.style.display = 'none';
            this.toggleBrowserBtn.textContent = 'Show';
        }
    }

    // --- Filter Methods ---
    
    applyFilter() {
        const actorId = this.filterActorIdInput.value.trim();
        
        if (!actorId) {
            alert('Please enter an Actor ID to filter by.');
            return;
        }
        
        this.filterActorId = actorId;
        this.data = this.fullData.filter(layer => layer.ActorId == actorId);
        
        this.clearFilterBtn.style.display = 'inline-block';
        this.selectedLayerIds.clear();
        this.render();
        
        console.log(`Filtered to Actor ID ${actorId}: ${this.data.length} layers`);
    }
    
    clearFilter() {
        this.filterActorId = null;
        this.data = this.fullData;
        this.filterActorIdInput.value = '';
        this.clearFilterBtn.style.display = 'none';
        this.selectedLayerIds.clear();
        this.render();
        
        console.log('Filter cleared, showing all layers');
    }
}

const app = new App();
window.app = app;

