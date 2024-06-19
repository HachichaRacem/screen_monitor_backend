import { clients } from "./serverService.js";
import settingsModel from "../models/settingsModel.js";

class Database {
  _updateEveryone(type, value, extra, isError = false) {
    for (const client of clients) {
      if (isError) {
        client.socket.send(
          JSON.stringify({
            type: "UPDATE",
            updated: type,
            error: value,
            extra: extra,
          })
        );
      } else {
        client.socket.send(
          JSON.stringify({
            type: "UPDATE",
            updated: type,
            value: value,
            extra: extra,
          })
        );
      }
    }
  }
  async updateLastCaptureURL(captureURL) {
    try {
      await settingsModel.findOneAndUpdate(
        {},
        { last_capture_url: captureURL }
      );
      this._updateEveryone("LAST_CAPTURE_URL", captureURL, null);
    } catch (error) {
      this._updateEveryone("LAST_CAPTURE_URL", error, null, true);
      console.log("[ERROR] Update last capture URL error : " + error);
    }
  }
  async updateUploadTimer(uploadTime) {
    try {
      await settingsModel.findOneAndUpdate({}, { timer_interval: uploadTime });
      this._updateEveryone("UPLOAD_TIMER", uploadTime, null);
    } catch (error) {
      console.log("[ERROR] Update upload timer error : " + error);
      this._updateEveryone("UPLOAD_TIMER", error, null, true);
    }
  }
  async updateUrgentActionTimer(urgentActionTime) {
    try {
      await settingsModel.findOneAndUpdate(
        {},
        { urgent_action_timer: urgentActionTime }
      );
      this._updateEveryone("URGENT_ACTION_TIMER", urgentActionTime, null);
    } catch (error) {
      console.log("[ERROR] Update urgent action timer error : " + error);
      this._updateEveryone("URGENT_ACTION_TIMER", error, null, true);
    }
  }
  async updateIsUrgentActionActive(isUrgentActionActive) {
    try {
      const result = await settingsModel.findOneAndUpdate(
        {},
        { is_urgent_timer_active: isUrgentActionActive }
      );
      if (isUrgentActionActive == true) {
        this._updateEveryone("IS_URGENT_ACTION_ACTIVE", isUrgentActionActive, {
          urgentAction: result.urgent_action_type,
        });
      }
    } catch (error) {
      this._updateEveryone("IS_URGENT_ACTION_ACTIVE", error, null, true);
      console.log("[ERROR] Update is urgent action active error : " + error);
    }
  }
}
export default Database;
