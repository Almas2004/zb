export const EVENT_DATES = ["2026-07-31", "2026-08-01"] as const;
export type EventDate = (typeof EVENT_DATES)[number];
export { ALMATY_TIME_ZONE } from "./dates";

export const APP_NAME = "AgroFest 2026";
export const REGISTRATION_PREFIX = "AF26";

export const brand = {
  green: "#004F2F",
  orange: "#F15A22",
  yellow: "#F6D900",
  lightGreen: "#39B663",
  ink: "#242124"
};
