/*:
 * @target MZ
 * @plugindesc [Patch] CharacterPictureManager - Show Non-Party Actor
 * @author AI
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
 * 改為自動將資料庫中的所有 Actor 加入 StandPicture 顯示列表 (即使不在隊伍中)。
 * 
 * --- 使用方法 ---
 * 1. 安裝此插件，必須放在 CharacterPictureManager.js 的下方。
 * 2. (選用) 在 "Enable Switch ID" 設定一個開關 ID 來控制顯示/隱藏。
 *    注意：此開關控制是否要顯示「非隊伍成員」。若開關關閉，則只顯示隊伍成員(預設行為)。
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
        let enableSwitchId = 0;
        
        try {
            const params = PluginManager.parameters(pluginName);
            if (params) {
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

        // 如果開關開啟
        if (isSwitchOn) {
            // 自動加入所有存在於 $dataActors 的角色
            if ($dataActors && $dataActors.length > 0) {
                for (let i = 1; i < $dataActors.length; i++) {
                    // $dataActors index 0 是 null，所以從 1 開始
                    if ($dataActors[i]) { 
                        const actor = $gameActors.actor(i);
                        // 如果該 Actor 存在且尚未在列表中 (避免重複，例如原本就在隊伍中的)
                        if (actor && !members.includes(actor)) {
                            members.push(actor);
                        }
                    }
                }
            }
        }
        return members;
    };
})();
