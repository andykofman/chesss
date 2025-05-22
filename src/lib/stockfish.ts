export class Stockfish {
  private worker: Worker;
  private level: number;
  
  constructor(level: number) {
    this.level = Math.min(Math.max(level, 1), 7);
    this.worker = new Worker('/stockfish.js');
    this.init();
  }
  
  private init() {
    this.worker.postMessage('uci');
    this.worker.postMessage(`setoption name Skill Level value ${this.level * 3}`);
    this.worker.postMessage('isready');
  }
  
  public async getEvaluation(fen: string): Promise<number> {
    return new Promise((resolve) => {
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage('go depth 15');
      
      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.includes('score cp')) {
          const score = parseInt(msg.split('score cp ')[1].split(' ')[0]);
          resolve(score / 100);
        }
      };
    });
  }
  
  public async getBestMove(fen: string): Promise<string> {
    return new Promise((resolve) => {
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage('go depth 15');
      
      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.includes('bestmove')) {
          const move = msg.split('bestmove ')[1].split(' ')[0];
          resolve(move);
        }
      };
    });
  }
  
  public destroy() {
    this.worker.terminate();
  }
}