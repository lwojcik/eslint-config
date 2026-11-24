import { Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  private readonly names = ['Tom'];

  findAll(): string[] {
    return [...this.names];
  }
}
