import { config } from "./config";
import { IStorage } from "./storage_interface";
import { FileStorage } from "./fileStorage";
import { DatabaseStorage } from "./databaseStorage";

export const storage: IStorage = config.storageType === "file" 
  ? new FileStorage() 
  : new DatabaseStorage();

console.log(`[Storage] Initialized storage: ${config.storageType}`);
