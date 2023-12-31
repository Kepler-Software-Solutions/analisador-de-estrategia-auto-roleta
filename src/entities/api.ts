import WebSocket from "ws";
import axios from "axios";

import { useEvent } from "@/hooks";

const DEBUG = false;

interface AuthResponse {
  token: string;
  user: { brl: { $numberDecimal: string } };
}

interface Credentials {
  email: string;
  password: string;
}

type AuthSucess = {
  success: true;
  accessToken: string;
  balance: number;
};

type AuthFailure = {
  success: false;
  accessToken: null;
  balance: null;
};

type AuthResult = AuthSucess | AuthFailure;

const ROULETTE_EVENTS = [
  "BETS_OPEN",
  "BETS_CLOSING_SOON",
  "BETS_CLOSED_ANNOUNCED",
  "BETS_CLOSED",
  "GAME_RESOLVED",
] as const;

type RouletteEvent = (typeof ROULETTE_EVENTS)[number];

type BetProps = any;

type BetResult = any;

export class API {
  private static readonly BASE_URL = "https://pixstrike.com";

  private static readonly TIMEOUT = 10 * 1000;

  private accessToken?: string;

  private readonly event = useEvent();

  private rouletteState?: RouletteEvent;

  public async authenticate(credentials: Credentials): Promise<AuthResult> {
    try {
      const { data } = await axios.post<AuthResponse>(
        `${API.BASE_URL}/auth/login`,
        {
          login: credentials.email,
          password: credentials.password,
        }
      );

      this.accessToken = data.token;

      return {
        success: true,
        accessToken: data.token,
        balance: Number(data.user.brl.$numberDecimal),
      };
    } catch (err) {
      return {
        success: false,
        accessToken: null,
        balance: null,
      };
    }
  }

  private async getProviderEndpoint(): Promise<string | null> {
    try {
      const { data } = await axios.get<{ url: string }>(
        `${API.BASE_URL}/api/slots/get/8422`,
        {
          headers: {
            Authorization: "Bearer " + this.accessToken,
          },
        }
      );

      return data.url;
    } catch (err) {
      return null;
    }
  }

  private async getEvoSessionId(): Promise<string | null> {
    const providerEndpoint = await this.getProviderEndpoint();

    if (!providerEndpoint) {
      return null;
    }

    let currentUrl = providerEndpoint;
    let evoSessionId: string | null = null;

    while (true) {
      const response = await axios.get(currentUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      });

      const cookie = response.headers["set-cookie"];

      if (cookie) {
        evoSessionId = cookie[0].split(";")[0];
      }

      if (!response.headers.location) {
        break;
      }

      if (
        response.status === 301 ||
        response.status === 302 ||
        response.status === 307 ||
        response.status === 308
      ) {
        currentUrl = new URL(response.headers.location, currentUrl).href;
      }
    }

    return evoSessionId;
  }

  public async getWebsocketEndpoint(): Promise<string | null> {
    if (!this.accessToken) {
      throw new Error(
        "Access token is required. Authenticate before performing bets."
      );
    }

    const evoSessionId = await this.getEvoSessionId();

    if (!evoSessionId) {
      return null;
    }

    const BASE_URL =
      "wss://timelesstech.evo-games.com/public/roulette/player/game/PorROULigh000001/socket";

    const endpoint = `${BASE_URL}?messageFormat=json&instance=""&tableConfig=q3droeoo36u5uajg&${evoSessionId}&client_version=""`;

    return endpoint;
  }

  private socket?: WebSocket;

  public get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    const url = await this.getWebsocketEndpoint();

    if (!url) {
      return false;
    }

    let timeoutId: NodeJS.Timeout;

    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(resolve, API.TIMEOUT);
    });

    const connection = new Promise<void>((resolve) => {
      this.socket = new WebSocket(url);

      this.socket.on("message", (data) => this.onMessage(data));

      this.socket.on("close", () => {
        if (DEBUG) {
          console.log("Connection closed at", new Date().toISOString());
        }
      });

      this.socket.on("error", (error: string | symbol) => {
        if (DEBUG) {
          console.error(error);
        }
      });

      this.socket.on("open", () => {
        if (DEBUG) {
          console.info("Connection opened at", new Date().toISOString());
        }

        clearTimeout(timeoutId);
        resolve();
      });
    });

    await Promise.race([timeout, connection]);

    return this.isConnected;
  }

  public disconnect(): void {
    if (!this.isConnected) {
      return;
    }

    this.socket?.close(1000, "Closing connection manually");
  }

  private onMessage(data: WebSocket.RawData): void {
    const datum = JSON.parse(data.toString("utf-8"));

    if (DEBUG) {
      console.debug(datum);
    }

    if ("args" in datum && "state" in datum.args) {
      this.rouletteState = datum.args.state;
      this.event.listen(datum.args.state, datum.args);
    }
  }

  private sendMessage(name: string, data: any): boolean {
    if (!this.isConnected) {
      return false;
    }

    const id = new Date().getMilliseconds();

    const message = JSON.stringify({
      name,
      msg: data,
      request_id: id,
    });

    this.socket?.send(message);

    return true;
  }

  public async getRealtimeResults(callback: (result: string) => void) {
    this.event.addEventListener<{ state: "GAME_RESOLVED"; result: [string] }>(
      "GAME_RESOLVED",
      (data) => callback(data.result[0])
    );
  }

  public async getBalance(): Promise<number> {
    return 0;
  }

  public async bet(props: BetProps): Promise<BetResult> {
    if (!this.accessToken) {
      throw new Error(
        "Access token is required. Authenticate before performing bets."
      );
    }

    if (this.rouletteState !== "BETS_OPEN") {
      // wait until next open round
    }

    return {};
  }
}
