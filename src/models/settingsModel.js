import * as mongoose from "mongoose";

const _settingsModel = new mongoose.Schema(
  {
    is_urgent_timer_active: Boolean,
    urgent_action_type: Number,
    urgent_action_timer: Number,
    timer_interval: Number,
    last_capture_url: String,
  },
  { timestamps: true }
);
const settingsModel = mongoose.model("settings", _settingsModel);
export default settingsModel;
