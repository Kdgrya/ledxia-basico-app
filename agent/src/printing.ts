// Envía bytes ESC/POS crudos a una impresora.
import net from "node:net";
import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export interface PrinterTarget {
  connection: "network" | "usb" | "system" | null;
  ipAddress?: string | null;
  port?: number | null;
  systemName?: string | null;
}

// Envía bytes a la impresora: TCP 9100 para red, spooler del SO para usb/system.
export async function sendToPrinter(target: PrinterTarget, data: Buffer): Promise<void> {
  if (target.connection === "network") {
    if (!target.ipAddress) throw new Error("La impresora de red no tiene IP");
    await sendTcp(target.ipAddress, target.port ?? 9100, data);
    return;
  }
  await sendToSpooler(target.systemName ?? "", data);
}

function sendTcp(host: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Tiempo agotado conectando a ${host}:${port}`));
    }, 8000);
    socket.connect(port, host, () => {
      socket.write(data, () => socket.end());
    });
    socket.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function sendToSpooler(printerName: string, data: Buffer): Promise<void> {
  const tmp = join(tmpdir(), `ledxia-${randomBytes(6).toString("hex")}.prn`);
  await writeFile(tmp, data);
  try {
    if (process.platform === "win32") {
      await run("cmd", ["/c", "copy", "/b", tmp, `\\\\localhost\\${printerName}`]);
    } else {
      const args = printerName ? ["-d", printerName, "-o", "raw", tmp] : ["-o", "raw", tmp];
      await run("lp", args);
    }
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stderr = "";
    p.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} salió con código ${code}: ${stderr.trim()}`)),
    );
  });
}
