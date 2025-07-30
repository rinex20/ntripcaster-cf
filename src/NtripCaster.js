// src/NtripCaster.js (更新版)

export class NtripCaster {
    // 关键改动：构造函数的第一个参数从 state 变为 block
    constructor(block, env) {
      // this.state 不再可用。如果需要持久化存储，应使用 block.storage
      // 但对于我们的实时广播功能，我们只需要内存中的变量，所以不受影响。
      this.block = block; 
      this.env = env;
      this.clients = [];
      this.source = null;
      
      this.logLevel = env.LOG_LEVEL || 'info'; 
    }
  
    log(message, level = 'info') {
      if (this.logLevel === 'debug' || level !== 'debug') {
        console.log(`[${new Date().toISOString()}] ${message}`);
      }
    }
  
    // fetch 和其他方法保持完全不变
    async fetch(request) {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return new Response('请求需要升级到 WebSocket', { status: 426 });
      }
  
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleSession(server, request.headers.get('Ntrip-Role'));
  
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }
  
    async handleSession(webSocket, role) {
      webSocket.accept();
  
      if (role === 'source') {
        this.log('数据源 (source) 已连接。');
        if (this.source) {
          this.log('正在替换已存在的旧数据源。');
          this.source.close(1012, '被新的数据源连接替换');
        }
        this.source = webSocket;
  
        webSocket.addEventListener('message', event => {
          this.broadcast(event.data);
        });
  
        webSocket.addEventListener('close', () => {
          this.log('数据源已断开。');
          this.source = null;
        });
  
      } else {
        this.log('客户端 (client) 已连接。');
        this.clients.push(webSocket);
  
        webSocket.addEventListener('close', () => {
          this.log('客户端已断开。');
          this.clients = this.clients.filter(c => c !== webSocket);
        });
      }
    }
  
    broadcast(message) {
      if (!this.source) {
        this.log("广播被忽略：没有数据源连接。", "debug");
        return;
      }
      this.log(`广播数据给 ${this.clients.length} 个客户端。`, "debug");
      this.clients = this.clients.filter(client => {
        if (client.readyState === WebSocket.READY_STATE_OPEN) {
          try {
            client.send(message);
            return true;
          } catch (err) {
            this.log(`发送到客户端失败: ${err}`, 'error');
            return false;
          }
        }
        return false;
      });
    }
  }
