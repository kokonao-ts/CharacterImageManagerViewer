/*:
 * @target MZ
 * @plugindesc [Custom] First Run & Always Enforce Variable/Switch Handler
 * @author AI
 *
 * @command resetFirstRun
 * @text Reset First Run Flag
 * @desc Resets the 'hasRunInitialSetup' flag to false, allowing the first-run logic to execute again on next boot.
 *
 * @param FirstRunVariableSettings
 * @text [First Run] Variable Settings
 * @desc Variables to set ONLY on the very first game launch.
 * @type struct<VariableSetting>[]
 * @default []
 *
 * @param FirstRunSwitchSettings
 * @text [First Run] Switch Settings
 * @desc Switches to set ONLY on the very first game launch.
 * @type struct<SwitchSetting>[]
 * @default []
 *
 * @param AlwaysVariableSettings
 * @text [Always] Variable Settings
 * @desc Variables to set EVERY TIME the game boots up (Force Reset).
 * @type struct<VariableSetting>[]
 * @default []
 *
 * @param AlwaysSwitchSettings
 * @text [Always] Switch Settings
 * @desc Switches to set EVERY TIME the game boots up (Force Reset).
 * @type struct<SwitchSetting>[]
 * @default []
 *
 * @help
 * This plugin manages variables and switches during the game boot sequence,
 * useful for initializing global states or DarkPlasma shared variables.
 *
 * --- Features ---
 * 1. **First Run Only**: Sets variables/switches only the first time the game is launched.
 * 2. **Always Enforce**: Sets variables/switches every time the game boots, preventing them 
 *    from being changed by save files or other means if you want a strict default.
 * 3. **Debug Reset**: A Plugin Command to reset the "First Run" status.
 *
 * --- Setup ---
 * 1. Place this plugin BELOW shared variable plugins (e.g., DarkPlasma_SharedSwitchVariable).
 * 2. Configure the parameters.
 *
 * --- Debugging ---
 * To test the "First Run" logic again:
 * 1. Create an event.
 * 2. Add "Plugin Command" -> select this plugin -> "Reset First Run Flag".
 * 3. Run the event.
 * 4. Restart the game (F5). The "First Run" logic will execute again.
 */

/*~struct~VariableSetting:
 * @param VariableId
 * @text Variable ID
 * @type variable
 * @default 1
 *
 * @param Value
 * @text Value
 * @type number
 * @desc The value to set (can be negative).
 * @default 0
 */

/*~struct~SwitchSetting:
 * @param SwitchId
 * @text Switch ID
 * @type switch
 * @default 1
 *
 * @param Value
 * @text On/Off
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 */

(() => {
    'use strict';
    const pluginName = "FirstRunVariableHandler";

    // --- Plugin Command Registration ---
    PluginManager.registerCommand(pluginName, "resetFirstRun", args => {
        ConfigManager.hasRunInitialSetup = false;
        ConfigManager.save();
        console.log(`${pluginName}: First Run flag has been RESET. Restart the game to see first-run effects.`);
    });

    // --- Helper: Parse JSON Parameters ---
    const parseStructList = (json) => {
        if (!json) return [];
        try {
            return JSON.parse(json).map(item => JSON.parse(item));
        } catch (e) {
            console.error(`${pluginName}: Error parsing parameters`, e);
            return [];
        }
    };

    // Load Parameters
    const parameters = PluginManager.parameters(pluginName);
    const firstRunVars = parseStructList(parameters['FirstRunVariableSettings']);
    const firstRunSwitches = parseStructList(parameters['FirstRunSwitchSettings']);
    const alwaysVars = parseStructList(parameters['AlwaysVariableSettings']);
    const alwaysSwitches = parseStructList(parameters['AlwaysSwitchSettings']);

    // --- ConfigManager Extension ---
    ConfigManager.hasRunInitialSetup = false;

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        const config = _ConfigManager_makeData.call(this);
        config.hasRunInitialSetup = this.hasRunInitialSetup;
        return config;
    };

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _ConfigManager_applyData.call(this, config);
        this.hasRunInitialSetup = !!config.hasRunInitialSetup;
    };

    // --- Scene_Boot Extension ---
    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        this.applyVariableHandlers();
    };

    Scene_Boot.prototype.applyVariableHandlers = function() {
        if (typeof $gameVariables === 'undefined' || !$gameVariables) {
            console.warn(`${pluginName}: $gameVariables not found. Skipping setup.`);
            return;
        }

        // Apply Logic
        this.applySettings(alwaysVars, alwaysSwitches, "Always Enforce");
        
        if (!ConfigManager.hasRunInitialSetup) {
            this.applySettings(firstRunVars, firstRunSwitches, "First Run");
            
            // Mark as run and save immediately
            ConfigManager.hasRunInitialSetup = true;
            ConfigManager.save();
        }
    };

    Scene_Boot.prototype.applySettings = function(varSettings, switchSettings, contextLabel) {
        let changed = false;

        // Apply Variables
        for (const setting of varSettings) {
            const id = Number(setting.VariableId);
            const value = Number(setting.Value);
            if (id > 0) {
                // Force set even if same, to ensure state, but check for change to log
                // or just set it. 
                $gameVariables.setValue(id, value);
                changed = true;
            }
        }

        // Apply Switches
        for (const setting of switchSettings) {
            const id = Number(setting.SwitchId);
            const value = setting.Value === 'true' || setting.Value === true; // Handle boolean or string
            if (id > 0) {
                $gameSwitches.setValue(id, value);
                changed = true;
            }
        }
        
        if (changed) {
            console.log(`${pluginName}: ${contextLabel} settings applied.`);
        }
    };

})();
