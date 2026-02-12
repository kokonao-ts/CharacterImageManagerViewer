/*:
 * @target MZ
 * @plugindesc [Patch] CharacterPictureManager - Show Non-Party Actor
 * @author AI
 *
 * @param TargetActorIds
 * @text Target Actor IDs
 * @desc 指定要顯示的額外 Actor ID 列表 (即使不在隊伍中)。
 * @type actor[]
 * @default []
 *
 * @param EnableSwitchId
 * @text Enable Switch ID
 * @desc 指定一個控制開關。當此開關打開時才顯示這些角色。若設為 0，則始終顯示。
 * @type switch
 * @default 0
 *
 * @help
 * 這是 CharacterPictureManager.js 的補丁插件。
 * 
 * --- 修改說明 ---
 * 改為直接在插件參數中設定 Actor ID 列表。
 * 
 * --- 使用方法 ---
 * 1. 安裝此插件，必須放在 CharacterPictureManager.js 的下方。
 * 2. 在插件參數 "Target Actor IDs" 中加入想要顯示的角色 ID。
 * 3. (選用) 在 "Enable Switch ID" 設定一個開關 ID 來控制顯示/隱藏。
 *    注意：此開關控制整個列表的顯示。
 *
 * --- 注意事項 ---
 * 不在隊伍中的 Actor 沒有 "隊伍順序(Index)"。
 * 因此，你必須在 CharacterPictureManager 的參數中，
 * 為該 Actor 設定 "Actor Position (アクターごとの基準座標)"，
 * 否則插件不知道要把他畫在畫面的哪裡。
 */

(() => {
    const pluginName = "StandPicture_NonPartyPatch";

    const _Scene_Base_findStandPictureMember = Scene_Base.prototype.findStandPictureMember;
    Scene_Base.prototype.findStandPictureMember = function() {
        // 取得原本的隊伍成員
        const members = _Scene_Base_findStandPictureMember.call(this) || [];
        
        // 讀取插件參數
        let targetActorIds = [];
        let enableSwitchId = 0;
        
        try {
            const params = PluginManager.parameters(pluginName);
            if (params) {
                // 解析陣列參數 (MZ 傳入的是 JSON 字串)
                const rawList = params['TargetActorIds'];
                if (rawList) {
                    targetActorIds = JSON.parse(rawList).map(id => Number(id));
                }
                
                enableSwitchId = Number(params['EnableSwitchId']) || 0;
            }
        } catch (e) {
            console.warn("StandPicture_NonPartyPatch: Failed to load parameters", e);
        }

        // 檢查開關 (如果 SwitchID > 0，則必須 Switch 為 ON)
        let isSwitchOn = true;
        if (enableSwitchId > 0) {
            isSwitchOn = $gameSwitches.value(enableSwitchId);
        }

        // 如果開關開啟 且 列表有內容
        if (isSwitchOn && targetActorIds.length > 0) {
            for (const actorId of targetActorIds) {
                if (actorId > 0) {
                    const actor = $gameActors.actor(actorId);
                    // 如果該 Actor 存在且尚未在列表中 (避免重複)
                    if (actor && !members.includes(actor)) {
                        members.push(actor);
                    }
                }
            }
        }
        return members;
    };
})();
