import { Prisma, Status } from '@prisma/client';

import type { Color, User } from '@/types';
import { prisma } from '@/config/prisma';
import { getUserByEmail } from '@/actions/get-user-by-email';

import { API } from '.';

interface Operation {
  color: Color;
}

interface OperationResponse {
  success: boolean;
}

export class Bot {
  private API: API;
  private balance: number;

  public constructor(private user: User) {
    this.API = new API();

    this.balance = this.user.balance || 0;
  }

  private async updateUser(data: Prisma.UserUpdateInput): Promise<void> {
    await prisma.user.update({
      where: {
        email: this.user.email,
      },
      data,
    });
  }

  public async init(): Promise<boolean> {
    const authentication = await this.API.authenticate(this.user.credentials!);

    if (!authentication.success) {
      return false;
    }

    const connected = await this.API.connect();

    if (!connected) {
      await this.updateUser({
        isActive: false,
        status: 'offline',
      });

      return false;
    }

    await this.updateUser({
      balance: this.API.balance,
    });

    return true;
  }

  private async isActive(): Promise<boolean> {
    const user = await getUserByEmail(this.user.email);
    return user.isActive;
  }

  private checkStop(): 'stop-win' | 'stop-loss' | 'no-balance' | null {
    if (!this.user.config) {
      return null;
    }

    if (this.balance >= this.user.config.stopWin) {
      return 'stop-win';
    }

    if (this.balance <= this.user.config.stopLoss) {
      return 'stop-loss';
    }

    if (this.balance < this.user.config.entry) {
      return 'no-balance';
    }

    return null;
  }

  public async operate({ color }: Operation): Promise<OperationResponse> {
    const gales = this.user.config!.gales;

    let win = false;

    for (let gale = 0; gale <= gales; gale++) {
      const price = 2 ** gale * this.user.config!.entry;

      if (this.balance < price) {
        await this.updateUser({
          isActive: false,
          status: 'offline',
        });

        return {
          success: false,
        };
      }

      this.balance -= price;

      await prisma.balanceTrack.create({
        data: {
          userId: this.user.userId,
          value: this.balance,
          time: new Date(),
        },
      });

      await this.updateUser({
        status: 'operating',
        balance: this.balance,
      });

      const { success, result } = await this.API.bet({
        color,
        amount: price,
      });

      console.log({ ref: 'operate', success, result });

      if (!success) {
        return {
          success: false,
        };
      }

      if (result) {
        win = true;

        this.balance += 2 * price;

        await prisma.balanceTrack.create({
          data: {
            userId: this.user.userId,
            value: this.balance,
            time: new Date(),
          },
        });
      }

      const stop = this.checkStop();
      const toStop = result || !!stop;

      let is_active = !stop;
      let status: Status = toStop ? 'online' : 'operating';

      if (!result && gale === gales) {
        status = 'online';
      }

      if (!is_active) {
        status = 'offline';
      }

      const manuallyDeactivated = !(await this.isActive());
      is_active = is_active && !manuallyDeactivated;

      if (manuallyDeactivated) {
        status = 'offline';
      }

      await this.updateUser({
        isActive: is_active,
        status,
        balance: this.balance,
      });

      if (toStop) {
        break;
      }
    }

    this.API.disconnect();

    await prisma.bet.create({
      data: {
        userId: this.user.userId,
        color,
        time: new Date(),
        entry: this.user.config!.entry,
        gains: this.user.config!.entry,
        result: win,
      },
    });

    return {
      success: true,
    };
  }
}
