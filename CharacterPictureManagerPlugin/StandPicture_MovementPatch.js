/*:
 * @target MZ
 * @plugindesc CharacterPictureManager Coordinate & Animation Patch (No Core Mods)
 * @author 
 * @base CharacterPictureManager
 * @orderAfter CharacterPictureManager
 *
 * @param OffsetVariableX
 * @text X Offset Variable
 * @desc Variable ID to use for X coordinate offset. 0 to disable.
 * @default 0
 * @type variable
 *
 * @param OffsetVariableY
 * @text Y Offset Variable
 * @desc Variable ID to use for Y coordinate offset. 0 to disable.
 * @default 0
 * @type variable
 *
 * @param EnableFloat
 * @text Enable Floating
 * @desc Enable a subtle floating animation (sine wave on Y axis).
 * @default true
 * @type boolean
 *
 * @param FloatSpeed
 * @text Floating Speed
 * @desc Speed of the floating animation.
 * @default 0.05
 * @type number
 * @decimals 2
 *
 * @param FloatPower
 * @text Floating Power
 * @desc Amplitude (height) of the floating animation.
 * @default 5
 * @type number
 *
 * @param AutoReset
 * @text Auto Reset After Event
 * @desc Automatically reset stand picture position to original (0,0) when an event ends.
 * @default false
 * @type boolean
 *
 * @command MoveStandPicture
 * @text Move Stand Picture
 * @desc Moves the stand picture to a specific screen coordinate over time.
 *
 * @arg ActorId
 * @text Actor ID
 * @desc The actor ID associated with the stand picture.
 * @type actor
 * @default 1
 *
 * @arg X
 * @text X Coordinate
 * @desc Target Screen X coordinate.
 * @type number
 * @default 0
 *
 * @arg Y
 * @text Y Coordinate
 * @desc Target Screen Y coordinate.
 * @type number
 * @default 0
 *
 * @arg Duration
 * @text Duration
 * @desc Movement duration in frames.
 * @type number
 * @min 0
 * @default 60
 *
 * @arg Wait
 * @text Wait for Completion
 * @desc Whether to wait until the movement is finished.
 * @type boolean
 * @default false
 *
 * @help
 * This plugin extends CharacterPictureManager.js to allow dynamic coordinate 
 * adjustments and a simple floating animation WITHOUT modifying the original plugin.
 *
 * It works by "patching" the sprite instances dynamically as they are created 
 * or updated by the scene.
 *
 * Features:
 * 1. Offset Coordinates using Game Variables.
 * 2. Automatic Floating Animation (Bobbing).
 * 3. Plugin Command to move the picture to a specific coordinate.
 * @command MoveStandPictureRelative
 * @text Move Stand Picture Relative
 * @desc Moves the stand picture relative to its current position.
 *
 * @arg ActorId
 * @text Actor ID
 * @desc The actor ID associated with the stand picture.
 * @type actor
 * @default 1
 *
 * @arg OffsetX
 * @text Offset X
 * @desc Relative X position adjustment.
 * @type number
 * @min -9999
 * @default 0
 *
 * @arg OffsetY
 * @text Offset Y
 * @desc Relative Y position adjustment.
 * @type number
 * @min -9999
 * @default 0
 *
 * @arg Duration
 * @text Duration
 * @desc Movement duration in frames.
 * @type number
 * @min 0
 * @default 60
 *
 * @arg Wait
 * @text Wait for Completion
 * @desc Whether to wait until the movement is finished.
 * @type boolean
 * @default false
 *
 * @help
 * This plugin extends CharacterPictureManager.js to allow dynamic coordinate 
 * adjustments and a simple floating animation WITHOUT modifying the original plugin.
 *
 * It works by "patching" the sprite instances dynamically as they are created 
 * or updated by the scene.
 *
 * Features:
 * 1. Offset Coordinates using Game Variables.
 * 2. Automatic Floating Animation (Bobbing).
 * 3. Plugin Command to move the picture to a specific coordinate.
 * 4. Plugin Command to move the picture relative to current position.
 * 5. Option to auto-reset position after event execution.
 *
 * @command EnableAutoReset
 * @text Enable Auto Reset
 * @desc Enables the automatic reset of stand picture position after event execution.
 *
 * @command DisableAutoReset
 * @text Disable Auto Reset
 * @desc Disables the automatic reset of stand picture position after event execution.
 */

(() => {
    'use strict';
    const script = document.currentScript;
    const param = PluginManagerEx.createParameter(script);
    const PLUGIN_NAME = "StandPicture_MovementPatch";

    // ------------------------------------------------------------------------
    // Game_Actor Extension for Persistence
    // ------------------------------------------------------------------------
    const _Game_Actor_initMembers = Game_Actor.prototype.initMembers;
    Game_Actor.prototype.initMembers = function() {
        _Game_Actor_initMembers.call(this);
        this._standPictureOffset = { x: 0, y: 0 };
    };

    Game_Actor.prototype.setStandPictureOffset = function(x, y) {
        this._standPictureOffset = { x: x, y: y };
    };

    Game_Actor.prototype.getStandPictureOffset = function() {
        return this._standPictureOffset || { x: 0, y: 0 };
    };

    // ------------------------------------------------------------------------
    // Game_Interpreter Patch for Auto Reset
    // ------------------------------------------------------------------------
    const _Game_Interpreter_terminate = Game_Interpreter.prototype.terminate;
    Game_Interpreter.prototype.terminate = function() {
        _Game_Interpreter_terminate.call(this);

        // Check if this interpreter is the main map interpreter or troop interpreter
        if (param.AutoReset && (this === $gameMap._interpreter || ($gameTroop && this === $gameTroop._interpreter))) {
             
             // 1. Reset all actors' data
             if ($gameActors && $gameActors._data) {
                 for (const actor of $gameActors._data) {
                     if (actor) {
                         actor.setStandPictureOffset(0, 0);
                     }
                 }
             }

             // 2. Reset active sprites to reflect the change immediately
             const scene = SceneManager._scene;
             if (scene && scene._standSprites) {
                 scene._standSprites.forEach(sprite => {
                     if (sprite && sprite._movementPatchApplied) {
                         sprite._isMoving = false; // Stop any ongoing movement
                         sprite._manualOffsetX = 0;
                         sprite._manualOffsetY = 0;
                     }
                 });
             }
        }
    };

    // ------------------------------------------------------------------------
    // Scene_Base Patch
    // ------------------------------------------------------------------------
    const _Scene_Base_updateStandPicture = Scene_Base.prototype.updateStandPicture;
    Scene_Base.prototype.updateStandPicture = function(actor, index) {
        // Run the original method (which creates or updates the sprite)
        _Scene_Base_updateStandPicture.apply(this, arguments);

        // Retrieve the sprite instance associated with this actor
        const sprite = this.findStandSprite ? this.findStandSprite(actor) : (this._standSprites ? this._standSprites.get(actor.actorId()) : null);

        // Apply our patch to this specific sprite instance if valid and not yet patched
        if (sprite && !sprite._movementPatchApplied) {
            patchStandSpriteInstance(sprite, actor);
        }
    };

    /**
     * Patches a single Sprite_StandPicture instance to add movement features
     */
    function patchStandSpriteInstance(sprite, actor) {
        sprite._movementPatchApplied = true;
        sprite._actorReference = actor; // Keep a reference
        sprite._floatCount = 0;
        
        // Initialize Manual Offset from Actor Data
        const savedOffset = actor.getStandPictureOffset();
        sprite._manualOffsetX = savedOffset.x;
        sprite._manualOffsetY = savedOffset.y;

        sprite._lastFloatOffset = 0; 

        // Movement State
        sprite._moveTargetX = 0;
        sprite._moveTargetY = 0;
        sprite._moveStartX = 0;
        sprite._moveStartY = 0;
        sprite._moveDuration = 0;
        sprite._moveTime = 0;
        sprite._isMoving = false;

        // Capture original methods
        const originalUpdate = sprite.update;
        const originalUpdatePosition = sprite.updatePosition;

        // Custom function to initiate movement
        sprite.startMoveTo = function(targetX, targetY, duration) {
            const currentStableX = this.x; 
            const currentStableY = this.y - (this._lastFloatOffset || 0);

            const diffX = targetX - currentStableX;
            const diffY = targetY - currentStableY;

            this._moveStartX = this._manualOffsetX;
            this._moveStartY = this._manualOffsetY;
            
            this._moveTargetX = this._manualOffsetX + diffX;
            this._moveTargetY = this._manualOffsetY + diffY;
            
            this._moveDuration = duration;
            this._moveTime = 0;
            this._isMoving = true;

            // Instant Move
            if (duration <= 0) {
                this.applyManualOffset(this._moveTargetX, this._moveTargetY);
                this._isMoving = false;
            }
        };

        // Helper to update offset and persist it
        sprite.applyManualOffset = function(x, y) {
            this._manualOffsetX = x;
            this._manualOffsetY = y;
            if (this._actorReference) {
                this._actorReference.setStandPictureOffset(x, y);
            }
        };

        // Override 'update'
        sprite.update = function() {
            // Update Floating Count
            if (param.EnableFloat) {
                const speed = param.FloatSpeed || 0.05;
                this._floatCount = (this._floatCount + speed) % (Math.PI * 2);
            }
            
            // Update Movement
            if (this._isMoving) {
                this._moveTime++;
                if (this._moveTime >= this._moveDuration) {
                    this.applyManualOffset(this._moveTargetX, this._moveTargetY);
                    this._isMoving = false;
                } else {
                    // Linear interpolation
                    const t = this._moveTime / this._moveDuration;
                    const newX = this._moveStartX + (this._moveTargetX - this._moveStartX) * t;
                    const newY = this._moveStartY + (this._moveTargetY - this._moveStartY) * t;
                    this.applyManualOffset(newX, newY);
                }
            }

            // Call the original update. 
            originalUpdate.call(this);
        };

        // Override 'updatePosition'
        sprite.updatePosition = function() {
            // let the original logic set the base X/Y (including shake)
            originalUpdatePosition.call(this);

            // Add Variable Offsets
            if (param.OffsetVariableX) {
                this.x += $gameVariables.value(param.OffsetVariableX);
            }
            if (param.OffsetVariableY) {
                this.y += $gameVariables.value(param.OffsetVariableY);
            }

            // Add Manual Offsets (Plugin Command)
            this.x += this._manualOffsetX;
            this.y += this._manualOffsetY;

            // Add Floating Animation
            this._lastFloatOffset = 0;
            if (param.EnableFloat) {
                const power = param.FloatPower || 5;
                const floatOffset = Math.sin(this._floatCount) * power;
                this.y += floatOffset;
                this._lastFloatOffset = floatOffset;
            }
        };
    }

    // Register Plugin Command
    PluginManager.registerCommand(PLUGIN_NAME, "MoveStandPicture", function(args) {
        const actorId = Number(args.ActorId);
        const x = Number(args.X);
        const y = Number(args.Y);
        const duration = Number(args.Duration);
        const wait = args.Wait === "true";

        const scene = SceneManager._scene;
        let sprite = null;
        const actor = $gameActors.actor(actorId);

        // Try to find the sprite
        if (scene && actor) {
            if (scene.findStandSprite) {
                sprite = scene.findStandSprite(actor);
            } else if (scene._standSprites) {
                sprite = scene._standSprites.get(actorId);
            }
        }

        if (sprite) {
            // Patch immediately if needed
            if (!sprite._movementPatchApplied) {
                patchStandSpriteInstance(sprite, actor);
            }
            // Execute Move
            sprite.startMoveTo(x, y, duration);

            // Handle Wait
            if (wait && duration > 0) {
                this.wait(duration);
            }
        }
    });

    PluginManager.registerCommand(PLUGIN_NAME, "MoveStandPictureRelative", function(args) {
        const actorId = Number(args.ActorId);
        const offsetX = Number(args.OffsetX);
        const offsetY = Number(args.OffsetY);
        const duration = Number(args.Duration);
        const wait = args.Wait === "true";

        const scene = SceneManager._scene;
        let sprite = null;
        const actor = $gameActors.actor(actorId);

        // Try to find the sprite
        if (scene && actor) {
            if (scene.findStandSprite) {
                sprite = scene.findStandSprite(actor);
            } else if (scene._standSprites) {
                sprite = scene._standSprites.get(actorId);
            }
        }

        if (sprite) {
            // Patch immediately if needed
            if (!sprite._movementPatchApplied) {
                patchStandSpriteInstance(sprite, actor);
            }
            
            // Calculate Target Base
            // We want to move relative to current VISUAL position (minus float/shake transience if possible, or just standard x/y).
            // startMoveTo uses (Target - Current) to find Diff.
            // If we want "Relative +10", we conceptually want (Current + 10).
            // However, current 'y' includes float offset. We should exclude it for the base calculation 
            // so we don't bake the wave into the static offset.
            
            const currentBaseX = sprite.x;
            const currentBaseY = sprite.y - (sprite._lastFloatOffset || 0);

            const targetX = currentBaseX + offsetX;
            const targetY = currentBaseY + offsetY;

            // Execute Move
            sprite.startMoveTo(targetX, targetY, duration);

            // Handle Wait
            if (wait && duration > 0) {
                this.wait(duration);
            }
        }
    });


    PluginManager.registerCommand(PLUGIN_NAME, "EnableAutoReset", function(args) {
        param.AutoReset = true;
    });

    PluginManager.registerCommand(PLUGIN_NAME, "DisableAutoReset", function(args) {
        param.AutoReset = false;
    });

})();
