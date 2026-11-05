/**
 * Antigravity Presence — Bullet-Proof Discord IPC Client
 *
 * Implements Discord Rich Presence IPC connection with:
 *   - Pipe scanning (0..9) on Windows, macOS, and Linux
 *   - Stateful binary framing ([uint32LE opcode, uint32LE length] + JSON)
 *   - Opcode 0 (HANDSHAKE), Opcode 1 (FRAME: SET_ACTIVITY), Opcode 3/4 (PING/PONG)
 *   - Heartbeat & exponential backoff auto-reconnect when Discord closes or reopens
 */

import crypto from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { DiscordActivity } from '../shared/types.js';

export const IPC_OPCODES = {
  HANDSHAKE: 0,
  FRAME: 1,
  CLOSE: 2,
  PING: 3,
  PONG: 4,
} as const;

export type IpcOpcode = (typeof IPC_OPCODES)[keyof typeof IPC_OPCODES];

export interface DiscordIpcOptions {
  clientId: string;
  pipePathOverride?: string;
  reconnectBaseMs?: number;
  maxReconnectMs?: number;
  pingIntervalMs?: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'destroyed';

export function getPossiblePipePaths(): string[] {
  const isWindows = process.platform === 'win32';
  const paths: string[] = [];

  for (let i = 0; i < 10; i++) {
    if (isWindows) {
      // Use both \\?\pipe\ and \\.\pipe\ on Windows
      paths.push(`\\\\?\\pipe\\discord-ipc-${i}`);
    } else {
      const candidates = [
        process.env['XDG_RUNTIME_DIR'],
        process.env['TMPDIR'],
        process.env['TMP'],
        process.env['TEMP'],
        '/tmp',
      ];
      for (const prefix of candidates) {
        if (prefix && prefix.trim().length > 0) {
          paths.push(path.join(prefix, `discord-ipc-${i}`));
        }
      }
    }
  }

  return paths;
}

export function encodeIpcFrame(opcode: IpcOpcode, payload: unknown): Buffer {
  const jsonStr = JSON.stringify(payload);
  const payloadBytes = Buffer.from(jsonStr, 'utf8');
  const frame = Buffer.alloc(8 + payloadBytes.length);

  frame.writeUInt32LE(opcode, 0);
  frame.writeUInt32LE(payloadBytes.length, 4);
  payloadBytes.copy(frame, 8);

  return frame;
}

export interface DecodedIpcPacket {
  opcode: number;
  payload: Record<string, unknown>;
}

export function parseIpcPackets(incomingBuffer: Buffer): {
  packets: DecodedIpcPacket[];
  remainingBuffer: Buffer;
} {
  let buf = incomingBuffer;
  const packets: DecodedIpcPacket[] = [];

  while (buf.length >= 8) {
    const opcode = buf.readUInt32LE(0);
    const length = buf.readUInt32LE(4);

    if (buf.length < 8 + length) {
      // Incomplete packet in buffer; await more chunks
      break;
    }

    const payloadRaw = buf.subarray(8, 8 + length).toString('utf8');
    buf = buf.subarray(8 + length);

    try {
      const parsed = JSON.parse(payloadRaw) as Record<string, unknown>;
      packets.push({ opcode, payload: parsed });
    } catch {
      // Ignore corrupted packet
    }
  }

  return { packets, remainingBuffer: buf };
}

export type IpcStateChangeListener = (state: ConnectionState) => void;

export class DiscordIpcClient {
  private socket: net.Socket | null = null;
  private state: ConnectionState = 'disconnected';
  private buffer: Buffer = Buffer.alloc(0);
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private lastActivity: DiscordActivity | null = null;
  private stateListeners = new Set<IpcStateChangeListener>();

  private readonly clientId: string;
  private readonly pipePathOverride?: string;
  private readonly reconnectBaseMs: number;
  private readonly maxReconnectMs: number;
  private readonly pingIntervalMs: number;

  constructor(options: DiscordIpcOptions) {
    this.clientId = options.clientId;
    this.pipePathOverride = options.pipePathOverride;
    this.reconnectBaseMs = options.reconnectBaseMs ?? 1000;
    this.maxReconnectMs = options.maxReconnectMs ?? 15000;
    this.pingIntervalMs = options.pingIntervalMs ?? 30000;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public onStateChange(listener: IpcStateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    for (const listener of this.stateListeners) {
      try {
        listener(newState);
      } catch {
        // Ignore listener error
      }
    }
  }

  public connect(): void {
    if (this.state === 'connected' || this.state === 'connecting' || this.state === 'destroyed') {
      return;
    }

    this.setState('connecting');
    this.cleanupSocket();

    const pipeCandidates = this.pipePathOverride ? [this.pipePathOverride] : getPossiblePipePaths();
    this.tryConnectPipes(pipeCandidates, 0);
  }

  private tryConnectPipes(pipes: string[], index: number): void {
    if (this.state === 'destroyed') return;
    if (index >= pipes.length) {
      // All pipes failed, schedule backoff reconnect
      this.setState('disconnected');
      this.scheduleReconnect();
      return;
    }

    const currentPipe = pipes[index];
    if (!currentPipe) {
      this.tryConnectPipes(pipes, index + 1);
      return;
    }

    let socketConnected = false;
    const sock = net.createConnection(currentPipe);

    const onConnect = (): void => {
      socketConnected = true;
      this.socket = sock;
      this.reconnectAttempt = 0;
      this.buffer = Buffer.alloc(0);

      sock.on('data', (chunk: Buffer) => this.handleData(chunk));
      sock.on('close', () => this.handleSocketClose());
      sock.on('error', () => {
        // Socket errors will trigger 'close'
      });

      // Send Opcode 0: HANDSHAKE
      const handshake = encodeIpcFrame(IPC_OPCODES.HANDSHAKE, {
        v: 1,
        client_id: this.clientId,
      });
      sock.write(handshake);
    };

    const onError = (): void => {
      if (!socketConnected) {
        sock.destroy();
        this.tryConnectPipes(pipes, index + 1);
      }
    };

    sock.once('connect', onConnect);
    sock.once('error', onError);
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const { packets, remainingBuffer } = parseIpcPackets(this.buffer);
    this.buffer = remainingBuffer;

    for (const packet of packets) {
      if (packet.opcode === IPC_OPCODES.FRAME) {
        const payload = packet.payload;
        if (payload['evt'] === 'READY') {
          this.setState('connected');
          this.startHeartbeat();
          // If there is a pending activity, send it immediately upon connection
          if (this.lastActivity !== null) {
            this.sendSetActivity(this.lastActivity);
          }
        }
      } else if (packet.opcode === IPC_OPCODES.PING) {
        // Send PONG response
        this.sendFrame(IPC_OPCODES.PONG, packet.payload);
      } else if (packet.opcode === IPC_OPCODES.CLOSE) {
        this.cleanupSocket();
        this.setState('disconnected');
        this.scheduleReconnect();
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.state === 'connected' && this.socket) {
        const pingFrame = encodeIpcFrame(IPC_OPCODES.PING, {
          nonce: crypto.randomUUID(),
        });
        this.socket.write(pingFrame);
      }
    }, this.pingIntervalMs);
    this.pingTimer.unref();
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private handleSocketClose(): void {
    this.cleanupSocket();
    if (this.state !== 'destroyed') {
      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.state === 'destroyed') return;

    // Exponential backoff: base * 2^attempt, capped at maxReconnectMs with jitter
    const exponential = Math.min(
      this.maxReconnectMs,
      this.reconnectBaseMs * Math.pow(2, this.reconnectAttempt)
    );
    const jitter = Math.floor(Math.random() * 500);
    const delay = exponential + jitter;

    this.reconnectAttempt = Math.min(10, this.reconnectAttempt + 1);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.state !== 'destroyed') {
        this.connect();
      }
    }, delay);
    this.reconnectTimer.unref();
  }

  public setActivity(activity: DiscordActivity | null): boolean {
    this.lastActivity = activity;
    if (this.state !== 'connected' || !this.socket) {
      return false;
    }
    return this.sendSetActivity(activity);
  }

  private sendSetActivity(activity: DiscordActivity | null): boolean {
    if (!this.socket || this.socket.destroyed) {
      return false;
    }

    const payload = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity,
      },
      nonce: crypto.randomUUID(),
    };

    return this.sendFrame(IPC_OPCODES.FRAME, payload);
  }

  public clearActivity(): boolean {
    return this.setActivity(null);
  }

  private sendFrame(opcode: IpcOpcode, payload: unknown): boolean {
    if (!this.socket || this.socket.destroyed) {
      return false;
    }
    try {
      const frame = encodeIpcFrame(opcode, payload);
      this.socket.write(frame);
      return true;
    } catch {
      return false;
    }
  }

  private cleanupSocket(): void {
    this.stopHeartbeat();
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch {
        // Ignore destroy error
      }
      this.socket = null;
    }
  }

  public destroy(): void {
    this.setState('destroyed');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupSocket();
    this.stateListeners.clear();
  }
}
