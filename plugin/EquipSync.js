/*:
 * @target MZ
 * @plugindesc Equip Sync via Commands
 * @author 
 * @url 
 *
 * @command bind
 * @text Bind & Sync Actors
 * @desc Binds two actors to sync their equipment. Will immediately copy Actor 1's equipment to Actor 2.
 *
 * @arg Actor1
 * @text Source Actor (Actor 1)
 * @desc The actor whose equipment will be copied initially.
 * @type actor
 * @default 0
 *
 * @arg Actor2
 * @text Target Actor (Actor 2)
 * @desc The actor who will be synced to Actor 1.
 * @type actor
 * @default 0
 *
 * @command unbind
 * @text Unbind Actors
 * @desc Stops synchronization between two actors.
 *
 * @arg Actor1
 * @text Actor 1
 * @desc One of the actors in the pair.
 * @type actor
 * @default 0
 *
 * @arg Actor2
 * @text Actor 2
 * @desc The other actor in the pair.
 * @type actor
 * @default 0
 *
 * @command unbindAll
 * @text Unbind All
 * @desc Removes all equipment synchronization bindings.
 *
 * @param SyncMethod
 * @text Sync Method
 * @desc How equipment is applied.
 * @type select
 * @option Force (Clone Item)
 * @value force
 * @option Normal (Consume Item)
 * @value normal
 * @default force
 *
 * @help
 * This plugin allows you to dynamically bind two actors' equipment using Plugin Commands.
 * Once bound, any equipment change on one actor will automatically reflect on the other.
 *
 * = Commands =
 * 
 * 1. Bind & Sync Actors:
 *    - Binds Actor 1 and Actor 2 together.
 *    - IMMEDIATELY copies Actor 1's current equipment to Actor 2.
 *    - From then on, changes to EITHER actor will update the other (Bidirectional).
 *
 * 2. Unbind Actors:
 *    - Breaks the link between Actor 1 and Actor 2.
 *    - Their equipment will remain as it is currently, but future changes won't sync.
 *
 * 3. Unbind All:
 *    - Clears all active bindings.
 *
 * = Sync Method =
 * - Force: Copies the item directly (good for visual clones).
 * - Normal: Consumes items from inventory (good for party mechanics).
 */

(() => {
    'use strict';

    const pluginName = "EquipSync";
    const script = document.currentScript;
    const param = PluginManagerEx.createParameter(script);
    const SYNC_METHOD = param.SyncMethod || 'force';

    //=============================================================================
    // Save Data Extension
    //=============================================================================

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._equipSyncPairs = []; // Stores objects like { a: 1, b: 2 }
    };

    Game_System.prototype.addEquipSyncPair = function(id1, id2) {
        if (!this._equipSyncPairs) this._equipSyncPairs = [];
        
        // Remove existing identical pair if any
        this.removeEquipSyncPair(id1, id2);

        this._equipSyncPairs.push({ a: id1, b: id2 });
    };

    Game_System.prototype.removeEquipSyncPair = function(id1, id2) {
        if (!this._equipSyncPairs) return;
        this._equipSyncPairs = this._equipSyncPairs.filter(pair => {
            const match = (pair.a === id1 && pair.b === id2) || (pair.a === id2 && pair.b === id1);
            return !match;
        });
    };

    Game_System.prototype.clearEquipSyncPairs = function() {
        this._equipSyncPairs = [];
    };

    Game_System.prototype.getEquipSyncPartners = function(actorId) {
        if (!this._equipSyncPairs) return [];
        const partners = [];
        this._equipSyncPairs.forEach(pair => {
            if (pair.a === actorId) partners.push(pair.b);
            else if (pair.b === actorId) partners.push(pair.a);
        });
        // Deduplicate
        return [...new Set(partners)];
    };

    //=============================================================================
    // Plugin Commands
    //=============================================================================

    PluginManager.registerCommand(pluginName, "bind", args => {
        const actor1Id = Number(args.Actor1);
        const actor2Id = Number(args.Actor2);
        
        if (!actor1Id || !actor2Id || actor1Id === actor2Id) return;

        // 1. Add to save data
        $gameSystem.addEquipSyncPair(actor1Id, actor2Id);

        // 2. Initial Sync: Force Actor 2 to match Actor 1
        const actor1 = $gameActors.actor(actor1Id);
        const actor2 = $gameActors.actor(actor2Id);
        
        if (actor1 && actor2) {
            // Lock to prevent recursion during initial sync
            _isSyncing = true;
            try {
                // Copy all slots
                const equips = actor1.equips();
                const slots = actor1.equipSlots(); // Assuming they have same slots logic
                
                for (let i = 0; i < slots.length; i++) {
                    const item = equips[i];
                    if (SYNC_METHOD === 'normal') {
                        actor2.changeEquip(i, item);
                    } else {
                        actor2.forceChangeEquip(i, item);
                    }
                }
            } finally {
                _isSyncing = false;
            }
        }
    });

    PluginManager.registerCommand(pluginName, "unbind", args => {
        const actor1Id = Number(args.Actor1);
        const actor2Id = Number(args.Actor2);
        $gameSystem.removeEquipSyncPair(actor1Id, actor2Id);
    });

    PluginManager.registerCommand(pluginName, "unbindAll", args => {
        $gameSystem.clearEquipSyncPairs();
    });

    //=============================================================================
    // Auto-Sync Logic
    //=============================================================================

    let _isSyncing = false;

    const _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
    Game_Actor.prototype.changeEquip = function(slotId, item) {
        _Game_Actor_changeEquip.apply(this, arguments);
        if (!_isSyncing) this.syncEquipToPartners(slotId, item);
    };

    const _Game_Actor_forceChangeEquip = Game_Actor.prototype.forceChangeEquip;
    Game_Actor.prototype.forceChangeEquip = function(slotId, item) {
        _Game_Actor_forceChangeEquip.apply(this, arguments);
        if (!_isSyncing) this.syncEquipToPartners(slotId, item);
    };

    Game_Actor.prototype.syncEquipToPartners = function(slotId, item) {
        const partners = $gameSystem.getEquipSyncPartners(this.actorId());
        if (partners.length === 0) return;

        _isSyncing = true;
        try {
            partners.forEach(partnerId => {
                const partner = $gameActors.actor(partnerId);
                if (partner) {
                    if (SYNC_METHOD === 'normal') {
                        partner.changeEquip(slotId, item);
                    } else {
                        partner.forceChangeEquip(slotId, item);
                    }
                }
            });
        } catch (e) {
            console.error("EquipSync Error:", e);
        } finally {
            _isSyncing = false;
        }
    };

})();
