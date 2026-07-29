"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { nanoid } from "nanoid";
import { Camera, Keyboard, RotateCcw, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { Button, LinkButton } from "./Button";
import { AgroLogo } from "./AgroLogo";
import { enqueueOperation, getDeviceToken, syncOperations } from "@/lib/offline-queue";

type ScanState = { status: "idle" | "green" | "red" | "yellow"; message: string; detail?: string };

export function ScannerShell({ initialToken }: { initialToken?: string }) {
  const [eventDate, setEventDate] = useState<"2026-07-31" | "2026-08-01">("2026-07-31");
  const [state, setState] = useState<ScanState>({ status: "idle", message: "Готов к сканированию" });
  const [online, setOnline] = useState(true);
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastToken = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const deviceToken = useMemo(() => (typeof window === "undefined" ? "" : getDeviceToken()), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); syncOperations().then((results) => results.length && setState({ status: "yellow", message: "Отложенные проверки синхронизированы", detail: `${results.length} операций` })); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (initialToken) void submitToken(initialToken);
  }, [initialToken]);

  function beep(success: boolean) {
    if (muted) return;
    const context = new AudioContext();
    const osc = context.createOscillator();
    osc.frequency.value = success ? 880 : 220;
    osc.connect(context.destination);
    osc.start();
    setTimeout(() => { osc.stop(); context.close(); }, 140);
    navigator.vibrate?.(success ? [80] : [160, 80, 160]);
  }

  async function submitToken(raw: string) {
    const token = raw.includes("/check-in/") ? raw.split("/check-in/").pop() || raw : raw.trim();
    const now = Date.now();
    if (lastToken.current.value === token && now - lastToken.current.at < 1000) return;
    lastToken.current = { value: token, at: now };

    if (!navigator.onLine) {
      await enqueueOperation({ token, eventDate, scannerDeviceToken: deviceToken, scannerDeviceName: navigator.userAgent.slice(0, 80) });
      setState({ status: "yellow", message: "Нет соединения с сервером", detail: "Проверка сохранена локально. Требуется ручная проверка." });
      beep(false);
      return;
    }

    setState({ status: "yellow", message: "Проверяем билет..." });
    try {
      const isRegistrationNumber = /^AF26-\d{6}$/i.test(token);
      const response = await fetch(isRegistrationNumber ? "/api/check-in/by-registration" : "/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isRegistrationNumber ? { registrationNumber: token.toUpperCase() } : { token }),
          eventDate,
          scannerDeviceToken: deviceToken,
          scannerDeviceName: navigator.userAgent.slice(0, 80),
          operationId: nanoid(24)
        })
      });
      const data = await response.json();
      const next: ScanState = {
        status: data.status || "red",
        message: data.message || "Ошибка проверки",
        detail: data.guest ? `${data.guest.firstName} ${data.guest.lastName} · ${data.guest.registrationNumber}` : undefined
      };
      setState(next);
      beep(next.status === "green");
    } catch {
      await enqueueOperation({ token, eventDate, scannerDeviceToken: deviceToken, scannerDeviceName: navigator.userAgent.slice(0, 80) });
      setState({ status: "yellow", message: "Проверка сохранена локально", detail: "Сервер недоступен. Не показывайте зелёный статус без подтверждения." });
      beep(false);
    }
  }

  async function startCamera() {
    if (running) return;
    const ua = navigator.userAgent.toLowerCase();
    if (!window.isSecureContext && location.hostname !== "localhost") {
      setState({ status: "yellow", message: "Камера требует HTTPS", detail: "Откройте сканер на HTTPS-домене или localhost." });
      return;
    }
    if (ua.includes("instagram") || ua.includes("whatsapp")) {
      setState({ status: "yellow", message: "Встроенный браузер может блокировать камеру", detail: "Откройте ссылку в Chrome на Android или Safari на iPhone." });
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ status: "red", message: "Браузер не поддерживает камеру", detail: "Используйте Chrome, Edge или Safari последней версии." });
      return;
    }
    try {
      const qr = new Html5Qrcode("qr-reader");
      qrRef.current = qr;
      await qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 260, height: 260 } }, submitToken, undefined);
      setRunning(true);
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      const denied = /permission|notallowed|denied/i.test(text);
      const busy = /notreadable|busy|track/i.test(text);
      setState({
        status: "red",
        message: denied ? "Доступ к камере запрещён" : busy ? "Камера занята другим приложением" : "Камера недоступна",
        detail: "Проверьте разрешения браузера, закройте другие приложения и откройте страницу в Chrome или Safari."
      });
    }
  }

  async function stopCamera() {
    await qrRef.current?.stop().catch(() => undefined);
    qrRef.current = null;
    setRunning(false);
  }

  const colors = {
    idle: "border-[#004F2F] bg-white text-[#004F2F]",
    green: "border-green-700 bg-green-700 text-white",
    red: "border-red-700 bg-red-700 text-white",
    yellow: "border-yellow-500 bg-yellow-300 text-[#242124]"
  };

  return (
    <main className="min-h-dvh bg-[#fffaf4] px-4 py-5">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AgroLogo className="h-14 w-32 shrink-0" priority />
            <div>
              <h1 className="text-2xl font-black text-[#004F2F]">Сканер AgroFest</h1>
              <p className="text-sm text-neutral-600">{online ? "Сервер доступен" : "Нет соединения"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {online ? <Wifi className="text-green-700" /> : <WifiOff className="text-red-700" />}
            <button className="focus-ring rounded-lg bg-white p-2" onClick={() => setMuted((v) => !v)}>{muted ? <VolumeX /> : <Volume2 />}</button>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => setEventDate("2026-07-31")} className={`focus-ring rounded-lg px-4 py-3 font-bold ${eventDate === "2026-07-31" ? "bg-[#004F2F] text-white" : "bg-white text-[#004F2F]"}`}>31 июля</button>
          <button onClick={() => setEventDate("2026-08-01")} className={`focus-ring rounded-lg px-4 py-3 font-bold ${eventDate === "2026-08-01" ? "bg-[#004F2F] text-white" : "bg-white text-[#004F2F]"}`}>1 августа</button>
        </div>

        <section className={`mt-4 rounded-lg border-4 p-5 text-center shadow ${colors[state.status]}`}>
          <p className="text-3xl font-black">{state.message}</p>
          {state.detail && <p className="mt-2 text-lg font-bold">{state.detail}</p>}
        </section>

        <div id="qr-reader" className="mt-4 overflow-hidden rounded-lg bg-neutral-950" />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!running ? <Button onClick={startCamera} variant="green"><Camera size={18} /> Открыть камеру</Button> : <Button onClick={stopCamera} variant="danger">Остановить камеру</Button>}
          <Button onClick={() => setState({ status: "idle", message: "Готов к сканированию" })} variant="ghost"><RotateCcw size={18} /> Следующий билет</Button>
          <LinkButton href="/scanner/manual" variant="ghost"><Keyboard size={18} /> Ручной ввод</LinkButton>
          <LinkButton href="/scanner/history" variant="ghost">История offline</LinkButton>
        </div>
      </div>
    </main>
  );
}
