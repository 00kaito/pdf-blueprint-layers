import { config } from "./config";
import { IStorage } from "./storage_interface";

export let storage: IStorage;

console.log(`[Storage] Initializing storage: ${config.storageType}`);

if (config.storageType === "file") {
  const { FileStorage } = await import("./fileStorage");
  storage = new FileStorage();
} else {
  const { DatabaseStorage } = await import("./databaseStorage");
  storage = new DatabaseStorage();
}
