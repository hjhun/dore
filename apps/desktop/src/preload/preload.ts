import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("dore", {
  version: "0.0.0"
});

