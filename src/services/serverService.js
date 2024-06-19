import Client from "../services/clientService.js";
import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import Database from "./databaseService.js";

let clients = new Set();
const supabase = createClient(process.env.supabaseURL, process.env.supabaseKEY);

class Server {
  _database = new Database();
  _initSettings;
  constructor(initSettings) {
    this._initSettings = initSettings;
  }
  _getClientBySocket(socket) {
    for (const client of clients) {
      if (client.socket === socket) {
        return client;
      }
    }
  }
  _getClientByID(id) {
    for (const client of clients) {
      if (client.id === id) {
        return client;
      }
    }
  }
  _sendUpdateToMobile(type, value) {
    const mobileClient = this._getClientByID(1);
    if (mobileClient)
      mobileClient.socket.send(
        JSON.stringify({
          type: "UPDATE",
          updated: type,
          value: value,
        })
      );
  }
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
  _broadcastMessage(message) {
    for (const client of clients) {
      client.socket.send(JSON.stringify(message));
    }
  }

  sendConnectedClients() {
    for (const client of clients) {
      const connectedClients = Array.from(clients)
        .filter((x) => x !== client)
        .map((x) => x.id);
      client.socket.send(
        JSON.stringify({
          type: "CONNECTED_CLIENTS",
          clientIDs: connectedClients,
        })
      );
    }
  }

  handleHandshake(payload, socket) {
    const clientID = payload["clientID"];
    const client = new Client(socket, clientID);
    clients.add(client);
    this.sendConnectedClients();
    socket.send(
      JSON.stringify({
        type: "SETTINGS",
        settings: this._initSettings,
      })
    );
    console.log(
      "[INFO] User (ID:%d) has connected to the server. Connected clients : %d",
      clientID,
      clients.size
    );
  }

  handleDisconnect(socket) {
    const client = this._getClientBySocket(socket);
    if (client) {
      clients.delete(client);
      this.sendConnectedClients();
      console.log(
        "[INFO] User (ID:%d) has disconnected from the server. Connected clients : %d",
        client.id,
        clients.size
      );
    }
  }
  async handleCaptureUpload(payload, socket) {
    const client = this._getClientBySocket(socket);
    const { data, error } = await supabase.storage
      .from("screenshots")
      .upload("ss.png", decode(payload["capture"]), {
        contentType: "image/png",
        upsert: true,
      });
    supabase.storage
      .from("screenshots")
      .createSignedUrl("ss.png", 31536000)
      .then((res) => {
        const captureURL = res.data.signedUrl;
        this._database.updateLastCaptureURL(captureURL);
      })
      .catch((err) => {
        this._updateEveryone("LAST_CAPTURE_URL", err, null, true);
        console.log(err);
      });
  }
  async handleUpdateUploadTimer(payload, socket) {
    if (payload["uploadTime"]) {
      this._database.updateUploadTimer(payload["uploadTime"]);
    } else {
      socket.send(
        JSON.stringify({
          type: "UPDATE_UPLOAD_TIMER",
          error: "upload time is missing from the request",
        })
      );
    }
  }
  async handleUpdateUrgentTimer(payload, socket) {
    if (payload["urgentTime"]) {
      await this._database.updateUrgentActionTimer(payload["urgentTime"]);
      this._sendUpdateToMobile("URGENT_ACTION_TIMER", payload["urgentTime"]);
    } else {
      socket.send(
        JSON.stringify({
          type: "UPDATE_URGENT_TIMER",
          error: "urgent time is missing from the request",
        })
      );
    }
  }
  async handleUpdateIsUrgentActionActive(payload) {
    if (payload["isUrgentActionActive"] != undefined) {
      await this._database.updateIsUrgentActionActive(
        payload["isUrgentActionActive"]
      );
    } else {
      socket.send(
        JSON.stringify({
          type: "IS_URGENT_ACTION_ACTIVE",
          error: "urgent time is missing from the request",
        })
      );
    }
  }
  async handleMobileTriggerUrgentAction(payload) {
    this._getClientByID(0).socket.send(
      JSON.stringify({
        type: "MOBILE_TRIGGER_URGENT_ACTION",
      })
    );
    this.handleUpdateIsUrgentActionActive(
      { isUrgentActionActive: true },
      this._getClientByID(0).socket
    );
  }
  handleUrgentTimerTick(receivedData) {
    this._sendUpdateToMobile("URGENT_TIMER_TICK");
  }
  handleNetworkBandwith(receivedData) {
    this._sendUpdateToMobile("NETWORK_BANDWITH", receivedData["value"]);
  }
  handleCpuTemperature(receivedData) {
    this._sendUpdateToMobile("CPU_TEMPERATURE", receivedData["value"]);
  }
  handleGpuTemperature(receivedData) {
    this._sendUpdateToMobile("GPU_TEMPERATURE", receivedData["value"]);
  }
  handleBatteryStatus(receivedData) {
    this._sendUpdateToMobile("BATTERY_STATUS", receivedData["value"]);
  }
}

export { Server, clients };
