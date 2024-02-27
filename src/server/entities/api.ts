import WebSocket from 'ws';
import axios from 'axios';

import { Color } from '@/types';
import { useEvent } from '@/server/hooks';
import { BETS } from '@/constants';

const DEBUG = true;

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
  'BETS_OPEN',
  'BETS_CLOSING_SOON',
  'BETS_CLOSED_ANNOUNCED',
  'BETS_CLOSED',
  'GAME_RESOLVED',
] as const;

type RouletteEvent = (typeof ROULETTE_EVENTS)[number];

interface BetProps {
  color: Color;
  amount: number;
}

const getBetChip = (gameId: string, colorCode: string, amount: number) => {
  return {
    args: {
      gameId,
      action: { type: 'PLACE', value: { [colorCode]: amount } },
      timestamp: 1700488341819,
      betTags: {
        mwLayout: 8,
        openMwTables: 1,
        latency: 640,
        videoProtocol: 'fmp4',
        btTableView: 'view4',
        btVideoQuality: '_hd',
        btMiniGame: 0,
        appVersion: 4,
        orientation: 'landscape',
      },
    },
    id: '',
    type: 'roulette.betAction',
  };
};

type BetSuccess = {
  success: true;
  result: boolean;
};

type BetFailure = {
  success: false;
  result: null;
};

type BetResult = BetSuccess | BetFailure;

const getColorByNumber = (code: number) => {
  for (const color in BETS) {
    if (BETS[color as Color].includes(code)) {
      return color as Color;
    }
  }

  return null;
};

export class API {
  private static readonly BASE_URL = 'https://pixstrike.com';

  private static readonly TIMEOUT = 60 * 1000;

  private accessToken?: string;

  private readonly event = useEvent();

  private rouletteState?: RouletteEvent;
  private gameId?: string;

  private _balance = 0;

  get balance(): number {
    return this._balance;
  }

  private readonly COLOR_CODES: Record<Color, string> = {
    [Color.RED]: '48',
    [Color.BLACK]: '49',
    [Color.GREEN]: '2',
  };

  public async authenticate(credentials: Credentials): Promise<AuthResult> {
    try {
      const response = await fetch(`${API.BASE_URL}/auth/login`, {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
          login: credentials.email,
          password: credentials.password,
        }),
        method: 'POST',
      });

      const data: AuthResponse = await response.json();

      // console.log(
      //   JSON.stringify({
      //     path: 'api',
      //     data,
      //   }),
      // )

      this.accessToken = data.token;

      const balance = Number(data.user.brl.$numberDecimal);

      this._balance = balance;

      return {
        success: true,
        accessToken: data.token,
        balance,
      };
    } catch (err) {
      console.error(err);

      return {
        success: false,
        accessToken: null,
        balance: null,
      };
    }
  }

  private async getProviderEndpoint(): Promise<string | null> {
    try {
      const response = await fetch(`${API.BASE_URL}/api/slots/get/8422`, {
        headers: {
          Authorization: 'Bearer ' + this.accessToken,
          'Content-Type': 'application/json',
        },
        method: 'GET',
      });

      const data: { url: string } = await response.json();

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

      const cookie = response.headers['set-cookie'];

      if (cookie) {
        evoSessionId = cookie[0].split(';')[0];
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
        'Access token is required. Authenticate before performing bets.'
      );
    }

    const evoSessionId = await this.getEvoSessionId();

    if (!evoSessionId) {
      return null;
    }

    const BASE_URL =
      'wss://timelesstech.evo-games.com/public/roulette/player/game/PorROULigh000001/socket';

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
      timeoutId = setTimeout(resolve, 5 * 1000);
    });

    const connection = new Promise<void>((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.on('message', (data) => this.onMessage(data));

      this.socket.on('close', () => {
        if (DEBUG) {
          console.log('Connection closed at', new Date().toISOString());
        }
      });

      this.socket.on('error', (error: string | symbol) => {
        if (DEBUG) {
          console.error(error);
        }
      });

      this.socket.on('open', () => {
        if (DEBUG) {
          console.info('Connection opened at', new Date().toISOString());
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

    this.socket?.close(1000, 'Closing connection manually');
  }

  private onMessage(data: WebSocket.RawData): void {
    const datum = JSON.parse(data.toString());

    if (DEBUG) {
      console.debug(datum);
    }

    if ('args' in datum && 'state' in datum.args) {
      this.rouletteState = datum.args.state;

      if ('gameId' in datum.args) {
        this.gameId = datum.args.gameId;
      }

      this.event.listen(datum.args.state, datum.args);
    }
  }

  private sendMessage(data: Record<string, any>): boolean {
    if (!this.isConnected) {
      return false;
    }

    const message = JSON.stringify(data);

    this.socket?.send(message);

    return true;
  }

  public getRealtimeResults(callback: (result: string) => void) {
    this.event.addEventListener<{ state: 'GAME_RESOLVED'; result: [string] }>(
      'GAME_RESOLVED',
      (data) => callback(data.result[0])
    );
  }

  public async onNextGameState(
    state: string,
    callback: (result: string) => Promise<any>
  ) {
    const data = await this.event.waitForEvent<{
      state: 'GAME_RESOLVED';
      result: [string];
    }>({
      name: state,
      timeout: 5 * API.TIMEOUT,
    });

    if (!data) {
      return null;
    }

    return await callback(data.result[0]);
  }

  public async waitForBetsToOpen() {
    if (this.rouletteState !== 'BETS_OPEN') {
      const opened = await this.event.waitForEvent({
        name: 'BETS_OPEN',
        timeout: 5 * API.TIMEOUT,
      });

      if (!opened) {
        return false;
      }
    }

    return true;
  }

  public async bet({ color, amount }: BetProps): Promise<BetResult> {
    if (!this.accessToken) {
      throw new Error(
        'Access token is required. Authenticate before performing bets.'
      );
    }

    if (this.rouletteState !== 'BETS_OPEN') {
      const opened = await this.event.waitForEvent({
        name: 'BETS_OPEN',
        timeout: 5 * API.TIMEOUT,
      });

      if (!opened) {
        throw new Error('Roulette game apears to be closed right now.');
      }
    }

    console.log({ gameId: this.gameId });

    const betChip = getBetChip(this.gameId!, this.COLOR_CODES[color], amount);

    this.sendMessage(betChip);

    const response = await this.event.waitForEvent<{
      state: 'GAME_RESOLVED';
      result: [string];
    }>({
      name: 'GAME_RESOLVED',
      timeout: 5 * API.TIMEOUT,
    });

    if (!response) {
      return {
        success: false,
        result: null,
      };
    }

    const resultColor = getColorByNumber(Number(response.result[0]));

    return {
      success: true,
      result: color === resultColor!,
    };
  }
}
