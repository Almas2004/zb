"use client";

import { openDB } from "idb";
import { nanoid } from "nanoid";

export type OfflineOperation = {
  id: string;
  token: string;
  eventDate: "2026-07-31" | "2026-08-01";
  scannerDeviceToken: string;
  scannerDeviceName: string;
  operationId: string;
  createdAt: string;
  lastSyncResult?: string;
};

async function db() {
  return openDB("agrofest-scanner", 1, {
    upgrade(database) {
      database.createObjectStore("operations", { keyPath: "id" });
    }
  });
}

export function getDeviceToken() {
  let token = localStorage.getItem("agrofest_device_token");
  if (!token) {
    token = `device_${nanoid(18)}`;
    localStorage.setItem("agrofest_device_token", token);
  }
  return token;
}

export async function enqueueOperation(operation: Omit<OfflineOperation, "id" | "operationId" | "createdAt">) {
  const database = await db();
  const item: OfflineOperation = { ...operation, id: nanoid(), operationId: nanoid(24), createdAt: new Date().toISOString() };
  await database.put("operations", item);
  return item;
}

export async function listOperations() {
  return (await db()).getAll("operations") as Promise<OfflineOperation[]>;
}

export async function removeOperation(id: string) {
  await (await db()).delete("operations", id);
}

export async function markOperation(id: string, lastSyncResult: string) {
  const database = await db();
  const item = await database.get("operations", id);
  if (item) {
    item.lastSyncResult = lastSyncResult;
    await database.put("operations", item);
  }
}

export async function syncOperations() {
  const operations = await listOperations();
  if (!operations.length || !navigator.onLine) return [];
  const response = await fetch("/api/offline-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations })
  });
  if (!response.ok) return [];
  const data = await response.json();
  await Promise.all(
    operations.map((op, index) => {
      const result = data.results?.[index];
      if (result?.status === "green" || result?.result === "DUPLICATE_OPERATION") return removeOperation(op.id);
      return markOperation(op.id, result?.message || "Конфликт синхронизации");
    })
  );
  return data.results || [];
}
