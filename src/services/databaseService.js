import mysql from "mysql2";
import { clients } from "./serverService.js";
class Database {
  pool = mysql.createPool({
    host: process.env.host,
    port: process.env.port,
    database: process.env.database,
    user: process.env.user,
    password: process.env.password,
    waitForConnections: true,
  });
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
  async _executeQuery(query, onError, onSuccess, values) {
    this.pool.getConnection((error, connection) => {
      if (!error) {
        if (values != null) {
          connection.query(query, values, (error, result, _) => {
            if (error) {
              onError(error);
            } else {
              onSuccess(result);
            }
          });
        } else {
          connection.query(query, (error, result, _) => {
            if (error) {
              onError(error);
            } else {
              onSuccess(result);
            }
          });
        }
      } else onError(error);
    });
  }
  async fetchSettings(socket) {
    this._executeQuery(
      "SELECT * from settings",
      (error) => {
        console.log("[ERROR] Fetch settings error : " + error);
        socket.send(
          JSON.stringify({
            type: "SETTINGS",
            settings: null,
          })
        );
      },
      (result) => {
        if (result.length > 0) {
          socket.send(
            JSON.stringify({
              type: "SETTINGS",
              settings: result[0],
            })
          );
        } else {
          this._executeQuery(
            "INSERT INTO settings VALUES (0, 30, '', 0, 0)",
            (error) => {
              console.log("[ERROR] Insert default settings error : " + error);
              socket.send(
                JSON.stringify({
                  type: "SETTINGS",
                  settings: null,
                })
              );
            },
            (result) => {}
          );
        }
      }
    );
  }
  async updateLastCaptureURL(socket, captureURL) {
    this._executeQuery(
      "UPDATE settings SET last_capture_url = ?",
      [captureURL],
      (error) => {
        this._updateEveryone("LAST_CAPTURE_URL", error, null, true);
        console.log("[ERROR] Update last capture URL error : " + error);
      },
      (result) => {
        this._updateEveryone("LAST_CAPTURE_URL", captureURL, null);
      }
    );
  }
  async updateUploadTimer(uploadTime, socket) {
    await this._executeQuery(
      `UPDATE settings SET timer_interval = ${uploadTime}`,
      (error) => {
        console.log("[ERROR] Update upload timer error : " + error);
        this._updateEveryone("UPLOAD_TIMER", error, null, true);
      },
      (result) => {
        this._updateEveryone("UPLOAD_TIMER", uploadTime, null);
      }
    );
  }
  async updateUrgentActionTimer(urgentActionTime, socket) {
    this._executeQuery(
      `UPDATE settings SET urgent_action_timer = ${urgentActionTime}`,
      (error) => {
        console.log("[ERROR] Update urgent action timer error : " + error);
        this._updateEveryone("URGENT_ACTION_TIMER", error, null, true);
      },
      (result) => {
        this._updateEveryone("URGENT_ACTION_TIMER", urgentActionTime, null);
      }
    );
  }
  async updateIsUrgentActionActive(isUrgentActionActive) {
    this._executeQuery(
      `UPDATE settings SET is_urgent_timer_active = ${isUrgentActionActive}`,
      (error) => {
        console.log(
          "[ERROR] Update is urgent action timer active error : " + error
        );
        this._updateEveryone("IS_URGENT_ACTION_ACTIVE", error, null, true);
      },
      (result) => {
        if (isUrgentActionActive == true) {
          this._executeQuery(
            "SELECT urgent_action_type FROM settings",
            (selectError) => {
              this._updateEveryone(
                "IS_URGENT_ACTION_ACTIVE",
                selectError,
                null,
                true
              );
            },
            (selectSucces) => {
              this._updateEveryone(
                "IS_URGENT_ACTION_ACTIVE",
                isUrgentActionActive,
                { urgentAction: selectSucces[0].urgent_action_type }
              );
            }
          );
        } else {
          this._updateEveryone(
            "IS_URGENT_ACTION_ACTIVE",
            isUrgentActionActive,
            null
          );
        }
      }
    );
  }
}
export default Database;
