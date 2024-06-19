import "dotenv/config.js";
import { WebSocketServer } from "ws";
import { Server } from "./services/serverService.js";
import * as mongoose from "mongoose";
import settingsModel from "./models/settingsModel.js";

let settings;

try {
  await mongoose.connect(process.env.mongoURL, {
    serverApi: {
      version: "1",
      strict: true,
      deprecationErrors: true,
    },
  });
  console.log("[INFO] Mongoose connected successfully");
  settings = await settingsModel.findOne();
  if (!settings) {
    console.log("[INFO] No settings found, creating new one...");
    const newSettings = new settingsModel({
      is_urgent_timer_active: false,
      urgent_action_type: 0,
      urgent_action_timer: 60,
      timer_interval: 60,
      last_capture_url: "",
    });
    settings = await newSettings.save();
  }
} catch (e) {
  console.log("[ERROR] Mongoose connection error : " + e);
}

const wss = new WebSocketServer({ port: 8080 });
const server = new Server(settings);

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const receivedData = JSON.parse(message);
    switch (receivedData["type"]) {
      case "CLIENT_HANDSHAKE":
        server.handleHandshake(receivedData, ws);
        break;
      case "CAPTURE_UPLOAD":
        server.handleCaptureUpload(receivedData, ws);
        break;
      case "UPDATE_UPLOAD_TIMER":
        server.handleUpdateUploadTimer(receivedData, ws);
        break;
      case "UPDATE_URGENT_TIMER":
        server.handleUpdateUrgentTimer(receivedData, ws);
        break;
      case "IS_URGENT_ACTION_ACTIVE":
        server.handleUpdateIsUrgentActionActive(receivedData, ws);
        break;
      case "MOBILE_TRIGGER_URGENT_ACTION":
        server.handleMobileTriggerUrgentAction(receivedData);
        break;
      case "URGENT_TIMER_TICK":
        server.handleUrgentTimerTick(receivedData);
        break;
      case "NETWORK_BANDWITH":
        server.handleNetworkBandwith(receivedData);
        break;
      case "CPU_TEMPERATURE":
        server.handleCpuTemperature(receivedData);
        break;
      case "GPU_TEMPERATURE":
        server.handleGpuTemperature(receivedData);
        break;
      case "BATTERY_STATUS":
        server.handleBatteryStatus(receivedData);
        break;
      default:
        console.log(
          "[ERROR] Received unknown message type: " + receivedData["type"]
        );
        console.log("[ERROR] Received data: " + JSON.stringify(receivedData));
    }
  });

  ws.on("close", () => {
    server.handleDisconnect(ws);
  });
});
